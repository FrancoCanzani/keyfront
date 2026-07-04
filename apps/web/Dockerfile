FROM oven/bun:1.2.21
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build
EXPOSE 8787
ENV NODE_ENV=production
CMD ["bun", "src/server/index.ts"]
