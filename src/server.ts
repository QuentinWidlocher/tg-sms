import { serve } from "bun";
import { TelegramError, webhookHandler } from "gramio";
import { bot } from "./bot.ts";
import { config } from "./config.ts";
import { kvGet, kvSet } from "./kv.ts";
import { formatPhoneNumber } from "./sms.ts";

const botWebhookPath = `/${config.BOT_TOKEN}`;
const handler = webhookHandler(bot, "Bun.serve");

export function runServer() {
  serve({
    port: config.PORT,
    routes: {
      [botWebhookPath]: {
        POST: handler,
      },
      "/sms-webhook": {
        POST: async (req) => {
          const event = (await req.json()) as {
            deviceId: string;
            event: "sms:received";
            id: string;
            payload: {
              message: string;
              receivedAt: string;
              messageId: string;
              phoneNumber: string;
              simNumber: number;
            };
            webhookId: string;
          };

          console.debug("📥 Received an SMS", event);

          async function createTopic(chatId: string) {
            const topic = await bot.api.createForumTopic({
              chat_id: chatId,
              name: event.payload.phoneNumber,
            });

            await kvSet(
              `phone-${formatPhoneNumber(event.payload.phoneNumber)}`,
              {
                chatId: chatId,
                threadId: String(topic.message_thread_id),
              }
            );

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
            if (
              e instanceof TelegramError &&
              e.message.includes("thread not found")
            ) {
              const topic = await createTopic(chatId);

              threadId = String(topic.message_thread_id);

              await bot.api.sendMessage({
                text: event.payload.message,
                chat_id: chatId,
                message_thread_id: Number(threadId),
              });
            }
          }

          return new Response();
        },
      },
      ["/ping"]: () => {
        return new Response(new Date().toISOString(), { status: 200 });
      },
    },
    fetch(req) {
      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`Listening on port ${config.PORT}`);
}
