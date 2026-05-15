FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

RUN apk add --no-cache ffmpeg python3 yt-dlp

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build TypeScript
FROM deps AS build
COPY tsconfig.json ./
COPY src/ ./src/
RUN bun run build

# Final image — only runtime deps + compiled output
FROM base AS runner
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

CMD ["bun", "dist/index.js"]
