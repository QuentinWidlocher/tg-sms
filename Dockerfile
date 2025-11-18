FROM oven/bun

WORKDIR /usr/src/app

COPY . .
RUN bun install --production

ENV NODE_ENV production

CMD [ "bun", "start" ]
