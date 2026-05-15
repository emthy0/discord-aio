FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# Install system deps: ffmpeg (TTS conversion), python3 (yt-dlp), yt-dlp
RUN apk add --no-cache ffmpeg python3 yt-dlp

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Build TypeScript
FROM base AS build
COPY package.json bun.lockb tsconfig.json ./
RUN bun install --frozen-lockfile
COPY src/ ./src/
RUN bun run build

# Final image
FROM base AS runner
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY .env* ./

CMD ["bun", "dist/index.js"]
