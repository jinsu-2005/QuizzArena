FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY server/ ./server/
COPY src/db/ ./src/db/
COPY tsconfig.json ./

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

CMD ["npx", "tsx", "server/index.ts"]
