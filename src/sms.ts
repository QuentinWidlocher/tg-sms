import { $ } from "bun";
import { config } from "./config.ts";

export async function sendSMS(text: string, to: string) {
  const url = new URL(config.ANDROID_SMS_GATEWAY_URL);

  console.log("✉️ Sending a SMS to ", to, ': "', text, '"');

  await fetch(url + "/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(
        config.ANDROID_SMS_GATEWAY_USERNAME +
          ":" +
          config.ANDROID_SMS_GATEWAY_PASSWORD
      )}`,
    },
    keepalive: false,
    body: JSON.stringify({
      textMessage: {
        text: text,
      },
      phoneNumbers: [to],
    }),
  });

  console.log("SMS sent");
}

export async function registerWebhooks(userId: string) {
  const url = new URL(config.ANDROID_SMS_GATEWAY_URL);
  url.username = config.ANDROID_SMS_GATEWAY_USERNAME;
  url.password = config.ANDROID_SMS_GATEWAY_PASSWORD;

  console.debug(
    'config.API_URL + "/sms-webhook"',
    config.API_URL + "/sms-webhook"
  );

  // Fetch throws a weird error about FailedToOpenSocket
  await $`curl -X POST \
  -H "Content-Type: application/json" \
  -d '${JSON.stringify({
    id: userId,
    url: config.API_URL + "/sms-webhook",
    event: "sms:received",
  })}' \
  ${url.toString()}/webhooks`;
}
