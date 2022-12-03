FROM node:16.11.1-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN apk update
RUN apk add
RUN apk add ffmpeg

COPY . .

CMD ["node", "index.js"]

