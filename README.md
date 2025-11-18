# tg-sms

Send and receive SMS in Telegram using the nice "forum" interface.

Made with Telegram Bot API framework - [GramIO](https://gramio.dev/)

## How to setup yourself ?

It's a bit complicated as I can't simply make it work for everyone.

You need to :

### 1. Setup SMS Gateway for Android

- Install [SMS Gateway for Android](https://docs.sms-gate.app/installation/) on you smartphone.
- Get your server credentials (I use the Cloud Server) (`ANDROID_SMS_GATEWAY_` + `URL`/`USERNAME`/`PASSWORD`)

### 2. Setup Telegram group chat

- Create a group chat but invite no-one.
- In the group settings, toggle topics.
- Politely ask @BotFather for a new bot
- Get your bot token (`BOT_TOKEN`)

### 3. Setup a small key/value store

I use [keyvalue.immanuel.co](https://keyvalue.immanuel.co/) for this project because it's dead simple and free. It would be better to host a proper K/V store somewhere as the app needs to store phone numbers.

- Get your app key (`KV_APP_KEY`)

### 3. Host this app

Sorry but I cannot make this app independent from my personal config as it would need to store sensitive data.

I used [Render](https://render.com/docs/deploy-bun-docker) to host.

- Fill out env variables with the info you got (this is the part where I cannot make this work for everyone)
- Also set your `API_URL` with the url you hosted
- In the bot conversation, send `/setupWebhook <API_URL>/sms-webhook`
- Invite your bot in your chat
- Make sure to give it the rights to manage topics
- Create a new topic with a *phone number* (make sure to prefix with +XX)
- Or wait for someone to send you a SMS, it will create the topic for you
