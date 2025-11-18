import { SendMessageParams, TelegramError } from "gramio";
import { bot } from "./bot";
import { kvGet, kvSet } from "./kv";
import { formatPhoneNumber } from "./sms";

export async function sendOrCreateTopic(
  message: SendMessageParams["text"],
  phoneNumber: string,
  chatId: string,
  threadId: string
) {
  try {
    return bot.api.sendMessage({
      text: message,
      chat_id: chatId,
      message_thread_id: Number(threadId),
    });
  } catch (e) {
    if (e instanceof TelegramError && e.message.includes("thread not found")) {
      const topic = await createTopic(phoneNumber, chatId);

      const newThreadId = String(topic.message_thread_id);

      await bot.api.sendMessage({
        text: message,
        chat_id: chatId,
        message_thread_id: Number(newThreadId),
      });
    }
  }
}

export async function createTopic(phoneNumber: string, chatId: string) {
  const topic = await bot.api.createForumTopic({
    chat_id: chatId,
    name: phoneNumber,
  });

  await kvSet(`phone-${formatPhoneNumber(phoneNumber)}`, {
    chatId: chatId,
    threadId: String(topic.message_thread_id),
  });

  console.debug("Created topic", topic);

  return topic;
}

export async function getOrCreateTopic({
  messageId,
  phoneNumber,
  deviceId,
}: {
  messageId: string;
  phoneNumber: string;
  deviceId: string;
}) {
  const chatAndThreadId = await kvGet(
    `phone-${formatPhoneNumber(phoneNumber)}`
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
    const chatInfos = await kvGet(`device-${deviceId}`);

    if (!chatInfos) {
      throw new Error("idk what to do with this event", {
        cause: {
          messageId,
          phoneNumber,
          deviceId,
        },
      });
    }

    console.debug("➕ Thread not known, creating new topic", chatInfos);

    const topic = await createTopic(phoneNumber, chatInfos.chatId);

    chatId = chatInfos.chatId;
    threadId = String(topic.message_thread_id);
  }

  return { chatId, threadId };
}
