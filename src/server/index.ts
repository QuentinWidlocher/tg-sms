import { serve } from "bun";
import { webhookHandler } from "gramio";
import { bot } from "../bot.ts";
import { config } from "../config.ts";

const botWebhookPath = `/${config.BOT_TOKEN}`;
const handler = webhookHandler(bot, "Bun.serve");

export const server = serve({
  port: config.PORT,
  routes: {
    [botWebhookPath]: {
      POST: handler,
    },
    "/ping": {
      GET: () => new Response("pong"),
    },
    "/sms-webhook": {
      POST: async (req) => {
        const body = await req.json();
        console.debug(body);
        return new Response();
      },
    },
  },
  fetch(req) {
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Listening on port ${config.PORT}`);
