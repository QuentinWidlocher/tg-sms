import Client, {
  HttpClient
} from "android-sms-gateway";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { config } from "./config.ts";

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

export const smsApi = new Client(
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

  const result = await smsApi.send({
    message: text,
    phoneNumbers: [to],
    withDeliveryReport: true,
  });

  console.log("🎉 SMS sent", result);

  return result;
}

export async function getDeviceID() {
  const devices = await smsApi.getDevices();
  const mainDevice = devices.filter((d) => !d.deletedAt).at(0);

  if (!mainDevice) {
    throw new Error("No devices where found");
  }

  return mainDevice.id;
}
