import env from "env-var";

export const config = {
  NODE_ENV: env
    .get("NODE_ENV")
    .default("development")
    .asEnum(["production", "test", "development"]),
  BOT_TOKEN: env.get("BOT_TOKEN").required().asString(),
  ANDROID_SMS_GATEWAY_URL: env
    .get("ANDROID_SMS_GATEWAY_URL")
    .required()
    .asUrlObject(),
  ANDROID_SMS_GATEWAY_USERNAME: env
    .get("ANDROID_SMS_GATEWAY_USERNAME")
    .required()
    .asString(),
  ANDROID_SMS_GATEWAY_PASSWORD: env
    .get("ANDROID_SMS_GATEWAY_PASSWORD")
    .required()
    .asString(),

  PORT: env.get("PORT").default(3000).asPortNumber(),
  API_URL: env
    .get("API_URL")
    .default(`https://${env.get("PUBLIC_DOMAIN").asString()}`)
    .asString(),
  DATABASE_URL: env.get("DATABASE_URL").required().asString(),
  LOCK_STORE: env.get("LOCK_STORE").default("memory").asEnum(["memory"]),
};
