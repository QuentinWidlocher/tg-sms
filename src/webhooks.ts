import { WebHookEventType, WebHookPayload } from "android-sms-gateway";
import { code, format } from "gramio";
import { bot } from "./bot";
import { kvGet, kvSet } from "./kv";
import { smsApi } from "./sms";
import { getOrCreateTopic, sendOrCreateTopic } from "./telegram";

export async function registerWebhook(url: URL) {
  return Promise.all(
    [
      WebHookEventType.SmsReceived,
      WebHookEventType.SmsDelivered,
      WebHookEventType.SmsFailed,
      WebHookEventType.MmsReceived,
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
  console.debug("existingMessage", event.payload.messageId, existingMessage);

  await kvSet(`message-${event.payload.messageId}`, {
    receivedAt: event.payload.receivedAt,
  });

  if (existingMessage) {
    return new Response(undefined, { status: 202 });
  }

  console.debug("📥 Received an SMS", event);

  const { chatId, threadId } = await getOrCreateTopic({
    deviceId: event.deviceId,
    messageId: event.payload.messageId,
    phoneNumber: event.payload.phoneNumber,
  });

  await sendOrCreateTopic(
    event.payload.message,
    event.payload.phoneNumber,
    chatId,
    threadId
  );
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

export async function onMMSReceived(
  event: WebHookPayload & { event: WebHookEventType.MmsReceived }
) {
  const existingMessage = await kvGet(`message-${event.payload.messageId}`);
  console.debug("existingMessage", event.payload.messageId, existingMessage);

  if (existingMessage) {
    return new Response(null, { status: 202 });
  }

  await kvSet(`message-${event.payload.messageId}`, {
    receivedAt: event.payload.receivedAt,
  });

  console.debug("📥 Received an MMS", event);

  const { chatId, threadId } = await getOrCreateTopic({
    deviceId: event.deviceId,
    messageId: event.payload.messageId,
    phoneNumber: event.payload.phoneNumber,
  });

  await sendOrCreateTopic(
    format`${code`You received a MMS, unfortunately this bot cannot display it here.`}`,
    event.payload.phoneNumber,
    chatId,
    threadId
  );
}
