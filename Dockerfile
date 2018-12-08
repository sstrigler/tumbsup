FROM node

WORKDIR /app

COPY pachage*.json

RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

RUN ["node", "app.js"]
