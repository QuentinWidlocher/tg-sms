import { config } from "./config.ts";
import Client, { HttpClient, WebHookEventType } from "android-sms-gateway";
import { parsePhoneNumber, parsePhoneNumberWithError } from "libphonenumber-js";

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

  try {
    const result = await smsApi.send({
      message: text,
      phoneNumbers: [to],
      withDeliveryReport: true,
    });

    console.log("🎉 SMS sent", result);
  } catch (e) {
    console.error(e);
  }
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
  return smsApi.registerWebhook({
    event: WebHookEventType.SmsReceived,
    url: url.toString(),
  });
}

export async function listWebhook() {
  const res = await smsApi.getWebhooks();
  return res.toSorted((a, b) => a.url.localeCompare(b.url)).map((r) => r.url);
}

export async function deleteWebhook(entry: string | number) {
  const webhooks = await smsApi.getWebhooks();

  if (isNaN(Number(entry))) {
    const foundWebhook = webhooks.find((w) => w.url == entry)?.id;
    if (!foundWebhook) {
      throw new Error("Webhook not found");
    }

    return smsApi.deleteWebhook(foundWebhook);
  } else {
    const foundWebhook = webhooks
      .toSorted((a, b) => a.url.localeCompare(b.url))
      .at(Number(entry) - 1)?.id;
    if (!foundWebhook) {
      throw new Error("Webhook not found");
    }

    return smsApi.deleteWebhook(foundWebhook);
  }
}
