import { config } from "./config";
import type { Jsonifiable, JsonValue, Stringified } from "type-fest";

type EnsureJsonifiable<T extends Record<string, Stringified<Jsonifiable>>> = T;

type KVTypes = EnsureJsonifiable<{
  [k: `phone-${string}`]: { chatId: string; threadId: string };
  [k: `device-${string}`]: { chatId: string };
  [k: `message-${string}`]: { receivedAt: string };
}>;

// keyvalue doesn't support empty values, so we use "null" instead...
export async function kvClear<K extends keyof KVTypes>(key: K) {
  const url = `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${
    config.KV_APP_KEY
  }/${Buffer.from(key).toString("base64url")}/null`;

  await fetch(url, {
    method: "POST",
  });
}

export async function kvSet<K extends keyof KVTypes>(
  key: K,
  value: KVTypes[K]
) {
  const params = new URLSearchParams(value);

  const url = `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${
    config.KV_APP_KEY
  }/${Buffer.from(key).toString("base64url")}/${Buffer.from(
    params.toString()
  ).toString("base64url")}`;

  await fetch(url, {
    method: "POST",
  });
}

export async function kvGet<K extends keyof KVTypes>(
  key: K
): Promise<KVTypes[K] | null> {
  const response = await fetch(
    `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${
      config.KV_APP_KEY
    }/${Buffer.from(key).toString("base64url")}`,
    {
      method: "GET",
    }
  );

  const asText = (await response.json()) as JsonValue;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  if (!asText || asText == "null") {
    return null;
  }

  const params = new URLSearchParams(
    Buffer.from(asText.toString(), "base64url").toString()
  );

  return params.toJSON() as KVTypes[K];
}
