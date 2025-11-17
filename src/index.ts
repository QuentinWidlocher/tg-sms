import { bot } from "./bot.ts";
import { config } from "./config.ts";
import { runServer } from "./server.ts";

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

if (config.NODE_ENV === "production")
  await bot.start({
    webhook: {
      url: `${config.API_URL}/${config.BOT_TOKEN}`,
    },
  });
else await bot.start();

runServer();
