import { config } from "./config";
import type { Jsonifiable, JsonValue, Stringified } from "type-fest";

type EnsureJsonifiable<T extends Record<string, Stringified<Jsonifiable>>> = T;

type KVTypes = EnsureJsonifiable<{
  [k: `phone-${string}`]: { chatId: string; threadId: string };
  [k: `device-${string}`]: { chatId: string };
}>;

// keyvalue doesn't support empty values, so we use "null" instead...
export async function kvClear<K extends keyof KVTypes>(key: K) {
  console.group("kvClear", { key });

  const url = `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${
    config.KV_APP_KEY
  }/${Buffer.from(key).toString("base64url")}/null`;

  console.debug("url", url);

  const result = await fetch(url, {
    method: "POST",
  });

  console.log(result);

  console.groupEnd();
}

export async function kvSet<K extends keyof KVTypes>(
  key: K,
  value: KVTypes[K]
) {
  console.group("kvSet", { key, value });

  const params = new URLSearchParams(value);

  const url = `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${
    config.KV_APP_KEY
  }/${Buffer.from(key).toString("base64url")}/${Buffer.from(
    params.toString()
  ).toString("base64url")}`;

  console.debug("url", url);

  const result = await fetch(url, {
    method: "POST",
  });

  console.log(result);

  console.groupEnd();
}

export async function kvGet<K extends keyof KVTypes>(
  key: K
): Promise<KVTypes[K] | null> {
  console.group("kvGet", { key });

  console.debug(
    "Buffer.from(key).toString('base64url')",
    Buffer.from(key).toString("base64url")
  );

  const response = await fetch(
    `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${
      config.KV_APP_KEY
    }/${Buffer.from(key).toString("base64url")}`,
    {
      method: "GET",
    }
  );

  const asText = (await response.json()) as JsonValue;

  console.debug("asText", asText);
  console.debug("!asText", !asText);

  if (!response.ok) {
    throw new Error();
  }

  if (!asText || asText == "null") {
    return null;
  }

  const params = new URLSearchParams(
    Buffer.from(asText.toString(), "base64url").toString()
  );
  console.debug("params", params);

  console.groupEnd();
  return params.toJSON() as KVTypes[K];
}
