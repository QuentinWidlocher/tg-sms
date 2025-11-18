import { serve } from "bun";
import { webhookHandler } from "gramio";
import { bot } from "./bot.ts";
import { config } from "./config.ts";
import {
  onMessageDelivered,
  onMessageFailed,
  onMessageReceived,
} from "./sms.ts";
import { WebHookEventType, type WebHookPayload } from "android-sms-gateway";

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
          const event = (await req.json()) as WebHookPayload;

          if (event.event == WebHookEventType.SmsReceived) {
            await onMessageReceived(event);
          }

          if (event.event == WebHookEventType.SmsDelivered) {
            await onMessageDelivered(event);
          }

          if (event.event == WebHookEventType.SmsFailed) {
            await onMessageFailed(event);
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
