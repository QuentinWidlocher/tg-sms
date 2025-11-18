import { bold, Bot, code, format, italic } from "gramio";
import { config } from "./config.ts";
import {
  deleteWebhook,
  formatPhoneNumber,
  getDeviceID,
  listWebhook,
  registerWebhook,
  sendSMS,
} from "./sms.ts";
import { kvClear, kvSet } from "./kv.ts";
import { isValidPhoneNumber } from "libphonenumber-js";

export const bot = new Bot(config.BOT_TOKEN)
  .on("new_chat_members", async (context) => {
    //
    // Only cares for itself
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

    // We remember that this device is linked to this specific chat
    // Useful to create a topic on sms received later
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
    if (!isValidPhoneNumber(context.name)) {
      return context.send(
        format`⚠️ The topic name is not a valid phone number.
          ${bold`You won't be able to send messages to it.`}

          If you made a typo in the number, ${bold`delete and recreate`} the topic. (renaming won't work.)
          Make sure your number is in a valid international format (starts with +)
          `
      );
    }

    await kvSet(`phone-${formatPhoneNumber(context.name)}`, {
      chatId: String(context.chatId),
      threadId: String(context.threadId)!,
    });

    return context.send(
      format`This will be your conversation with ${context.name}.

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
  .command("start", (context) => {
    return context.send("Add this bot to a supergroup with topics !");
  })
  .command("setupWebhook", async (context) => {
    if (!context.args) {
      return context.send(
        format`Call this command with your webhook url (${code`https://<your_api_url>/sms-webhook`})`
      );
    }

    try {
      const url = new URL(context.args);
      await registerWebhook(url);
      return context.send(format`URL registered ✅`);
    } catch (e) {
      if (e instanceof TypeError) {
        return context.send(
          format`URL is not valid, please call this command with your webhook url (${code`https://<your_api_url>/sms-webhook`})`
        );
      }
    }
  })
  .command("listWebhooks", async (context) => {
    const webhooks = await listWebhook();

    const list = webhooks
      .map((w, i) => `- (${i + 1}) ${code`${w}`}`)
      .join("\n");

    context.send(format`${bold`Your registered webhooks`}
     ${list}

     You can delete them with ${code`/deleteWebhook <number/url>`}
     `);
  })
  .command("deleteWebhook", async (context) => {
    if (!context.args) {
      return context.send(
        format`Call this command with a webhook url or a number (given by ${code`/listWebhooks`})`
      );
    }

    try {
      await deleteWebhook(context.args);
      return context.send(format`URL deleted ❎`);
    } catch (e) {
      if (e instanceof Error) {
        return context.send(e.message);
      }
    }
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
  .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));
