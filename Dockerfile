# Dockerfile
# Copyright (c) 2026 Clove Nytrix Doughmination Twilight
# Licensed under the DASL-1.2 Licence.
# See LICENCE.md in the project root for full licence information.

FROM oven/bun:1.4-alpine AS build
WORKDIR /app
# bun.lock is gitignored in this repo, so tolerate it being absent.
COPY package.json bun.lock* ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1.4-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --production

FROM oven/bun:1.4-alpine
WORKDIR /app
ENV NODE_ENV=production
# Room for the largest paste plus form overhead
ENV BODY_SIZE_LIMIT=2M

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

# The database lives here; mount a volume over it to keep the pastes.
RUN mkdir -p /app/data && chown -R bun:bun /app/data
VOLUME /app/data

USER bun
EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3030)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "build/index.js"]
