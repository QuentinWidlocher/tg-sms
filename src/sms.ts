import { config } from "./config.ts";
import Client, {
  HttpClient,
  WebHookEventType,
  WebHookPayload,
} from "android-sms-gateway";
import { TelegramError } from "gramio";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { bot } from "./bot.ts";
import { kvGet, kvSet } from "./kv.ts";

const httpFetchClient: HttpClient = {
  get: async <T>(url: string, headers: Record<string, string>) => {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    return response.json() as Promise<T>;
  },
  post: async <T>(url: string, body: any, headers: Record<string, string>) => {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return response.json() as Promise<T>;
  },
  delete: async <T>(url: string, headers: Record<string, string>) => {
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    return response.json() as Promise<T>;
  },
  put: async <T>(url: string, headers: Record<string, string>) => {
    const response = await fetch(url, {
      method: "PUT",
      headers,
    });

    return response.json() as Promise<T>;
  },
  patch: async <T>(url: string, headers: Record<string, string>) => {
    const response = await fetch(url, {
      method: "PATCH",
      headers,
    });

    return response.json() as Promise<T>;
  },
};

const smsApi = new Client(
  config.ANDROID_SMS_GATEWAY_USERNAME,
  config.ANDROID_SMS_GATEWAY_PASSWORD,
  httpFetchClient,
  config.ANDROID_SMS_GATEWAY_URL
);

export function formatPhoneNumber(phoneNumber: string) {
  return parsePhoneNumberWithError(phoneNumber).format("E.164");
}

export async function sendSMS(text: string, to: string) {
  console.log("✉️ Sending a SMS to ", to, ":", `"${text}"`);

  const result = await smsApi.send({
    message: text,
    phoneNumbers: [to],
    withDeliveryReport: true,
  });

  console.log("🎉 SMS sent", result);

  return result;
}

export async function getDeviceID() {
  const devices = await smsApi.getDevices();
  const mainDevice = devices.filter((d) => !d.deletedAt).at(0);

  if (!mainDevice) {
    throw new Error("No devices where found");
  }

  return mainDevice.id;
}

export async function registerWebhook(url: URL) {
  return Promise.all(
    [
      WebHookEventType.SmsReceived,
      WebHookEventType.SmsDelivered,
      WebHookEventType.SmsFailed,
    ].map((event) =>
      smsApi.registerWebhook({
        event,
        url: url.toString(),
      })
    )
  );
}

export async function listWebhook() {
  const res = await smsApi.getWebhooks();
  const urls = res
    .toSorted((a, b) => a.url.localeCompare(b.url))
    .map((r) => r.url);
  return [...new Set(urls)];
}

export async function deleteWebhook(entry: string | number) {
  const webhooks = await smsApi.getWebhooks();

  async function deleteByUrl(url: string) {
    const foundWebhookIds = webhooks
      .filter((w) => w.url == entry)
      .map((w) => w.id)
      .filter((id) => id != null);

    if (foundWebhookIds.length <= 0) {
      throw new Error("Webhook not found");
    }

    return Promise.all(foundWebhookIds.map((id) => smsApi.deleteWebhook(id!)));
  }

  if (isNaN(Number(entry))) {
    return deleteByUrl(String(entry));
  } else {
    const urls = webhooks
      .toSorted((a, b) => a.url.localeCompare(b.url))
      .map((r) => r.url);

    const url = [...new Set(urls)].at(Number(entry) - 1);

    if (!url) {
      throw new Error("Webhook not found");
    }

    return deleteByUrl(url);
  }
}

export async function onMessageReceived(
  event: WebHookPayload & { event: WebHookEventType.SmsReceived }
) {
  const existingMessage = await kvGet(`message-${event.payload.messageId}`);

  if (existingMessage) {
    return new Response(undefined, { status: 202 });
  }

  console.debug("📥 Received an SMS", event);

  async function createTopic(chatId: string) {
    const topic = await bot.api.createForumTopic({
      chat_id: chatId,
      name: event.payload.phoneNumber,
    });

    await kvSet(`phone-${formatPhoneNumber(event.payload.phoneNumber)}`, {
      chatId: chatId,
      threadId: String(topic.message_thread_id),
    });

    console.debug("Created topic", topic);

    return topic;
  }

  const chatAndThreadId = await kvGet(
    `phone-${formatPhoneNumber(event.payload.phoneNumber)}`
  );

  let chatId: string | undefined = undefined;
  let threadId: string | undefined = undefined;

  if (chatAndThreadId) {
    console.debug(
      "⏩ Thread known, forwarding message to Telegram",
      chatAndThreadId
    );

    chatId = chatAndThreadId.chatId;
    threadId = chatAndThreadId.threadId;
  }

  if (!chatId || !threadId) {
    const chatInfos = await kvGet(`device-${event.deviceId}`);

    if (!chatInfos) {
      console.error("idk what to do with this event", event);
      return new Response(null, { status: 500 });
    }

    console.debug("➕ Thread not known, creating new topic", chatInfos);

    const topic = await createTopic(chatInfos.chatId);

    chatId = chatInfos.chatId;
    threadId = String(topic.message_thread_id);
  }

  try {
    await bot.api.sendMessage({
      text: event.payload.message,
      chat_id: chatId,
      message_thread_id: Number(threadId),
    });
  } catch (e) {
    if (e instanceof TelegramError && e.message.includes("thread not found")) {
      const topic = await createTopic(chatId);

      threadId = String(topic.message_thread_id);

      await bot.api.sendMessage({
        text: event.payload.message,
        chat_id: chatId,
        message_thread_id: Number(threadId),
      });
    }
  }

  await kvSet(`message-${event.payload.messageId}`, {
    receivedAt: event.payload.receivedAt,
  });
}

export async function onMessageDelivered(
  event: WebHookPayload & { event: WebHookEventType.SmsDelivered }
) {
  const infos = await kvGet(`sent-message-${event.payload.messageId}`);

  if (!infos) {
    return;
  }

  return bot.api.setMessageReaction({
    chat_id: infos.chatId,
    message_id: Number(infos.messageId),
    reaction: [],
  });
}

export async function onMessageFailed(
  event: WebHookPayload & { event: WebHookEventType.SmsFailed }
) {
  const infos = await kvGet(`sent-message-${event.payload.messageId}`);

  if (!infos) {
    return;
  }

  return bot.api.setMessageReaction({
    chat_id: infos.chatId,
    message_id: Number(infos.messageId),
    reaction: [{ type: "emoji", emoji: "👎" }],
  });
}
