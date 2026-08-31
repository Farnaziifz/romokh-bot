FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
CMD ["sh", "-c", "node dist/lib/migrate.js && node dist/bot.js"]
