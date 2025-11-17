import { autoAnswerCallbackQuery } from "@gramio/auto-answer-callback-query";
import { mediaCache } from "@gramio/media-cache";
import { mediaGroup } from "@gramio/media-group";
import { prompt } from "@gramio/prompt";
import { bold, Bot, format, italic } from "gramio";
import { config } from "./config.ts";
import { isValidPhoneNumber } from "libphonenumber-js";
import { getDeviceID, sendSMS } from "./sms.ts";
import { kvClear, kvSet } from "./kv.ts";

export const bot = new Bot(config.BOT_TOKEN)
  .extend(autoAnswerCallbackQuery())
  .extend(mediaGroup())
  .extend(mediaCache())
  .extend(prompt())
  .on("new_chat_members", async (context) => {
    if (!context.eventMembers.some((member) => member.id == bot.info?.id)) {
      return;
    }

    if (context.chat.type != "supergroup" || !context.chat.isForum) {
      return context.send(
        "You need to add this bot to a supergroup with topics !"
      );
    }

    if (context.forumTopicClosed && context.from) {
      return context.send(
        "You need to reopen your general chat and reinvite the bot.",
        { chat_id: context.from.id }
      );
    }

    const deviceId = await getDeviceID();

    await kvSet(`device-${deviceId}`, { chatId: String(context.chatId) });

    return context.send(format`
      ${bold`Telegram ↔ SMS`}

      To start you can :

      - Wait for someone to send you a SMS, it will create a topic with their phone number.
      - Create a topic with a phone number as a name, you can rename it later.

      ${italic`Don't forget to give this bot admin "topic" rights.`}
    `);
  })
  .on("forum_topic_created", async (context) => {
    console.debug("context.name", context.name);
    if (!isValidPhoneNumber(context.name)) {
      return context.send(
        format`⚠️ The topic name is not a valid phone number.
          ${bold`You won't be able to send messages to it.`}

          If you made a typo in the number, ${bold`delete and recreate`} the topic. (renaming won't work.)
          Make sure your number is in a valid international format (may start with +)
          `
      );
    }

    await kvSet(`phone-${context.name}`, {
      chatId: String(context.chatId),
      threadId: String(context.threadId)!,
    });

    return context.send(
      `This will be your conversation with ${context.name}.

      You can now rename the topic to the right contact name.`
    );
  })
  .on("forum_topic_closed", async (context) => {
    console.debug("forum_topic_closed", context);

    await kvClear(`phone-${context.name}`);
  })
  .on("edited_message", async (context) => {
    if (!context.hasText() || !context.text) {
      return;
    }

    if (context.chat.type != "supergroup" || !context.chat.isForum) {
      return;
    }

    if (!context.replyMessage || !context.replyMessage.forumTopicCreated) {
      return;
    }

    await sendSMS(
      context.text + "*",
      context.replyMessage.forumTopicCreated.name
    );
  })
  .on("message", async (context) => {
    console.debug("on message", context);

    if (!context.hasText() || !context.text) {
      return;
    }

    if (context.chat.type != "supergroup" || !context.chat.isForum) {
      return context.send(
        "You need to add this bot to a supergroup with topics !"
      );
    }

    if (!context.replyMessage || !context.replyMessage.forumTopicCreated) {
      return context.send("You need to talk in a topic");
    }

    await sendSMS(context.text, context.replyMessage.forumTopicCreated.name);
  })
  .command("start", (context) => {
    return context.send("Add this bot to a supergroup with topics !");
  })
  .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));
