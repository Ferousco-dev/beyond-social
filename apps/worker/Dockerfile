# The publishing worker.
#
# Drains the scheduled-post queue: takes a due post, uploads the finished video
# to whichever platform it is bound for, and records what happened. It holds a
# Redis connection rather than polling a table, which is the one thing that
# makes it different to the render service beside it.
#
# `ffmpeg-static` is a dependency here too, so this is Debian slim rather than
# Alpine for the same reason: the packaged binary is glibc-linked and will not
# run on musl.
#
# Built from the repo root, not this directory, because the worker depends on
# workspace packages that live outside it:
#   docker build -f apps/worker/Dockerfile .

FROM node:22-slim AS build

# Corepack pins pnpm to whatever `packageManager` in the root manifest says, so
# the image cannot drift from what the repo builds with locally.
RUN corepack enable

WORKDIR /repo

# The manifests alone first, so a change to source does not invalidate the
# dependency layer. Every workspace member the filter has to resolve must have
# its manifest present, or pnpm refuses the lockfile as out of date.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/env/package.json packages/env/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/worker/package.json apps/worker/

RUN pnpm install --filter @beyond-social/worker... --frozen-lockfile

COPY packages/ packages/
COPY apps/worker/ apps/worker/

RUN pnpm --filter @beyond-social/worker build

# A second stage so the built image carries the bundle and its runtime
# dependencies rather than the whole toolchain.
FROM node:22-slim AS runtime

RUN corepack enable
WORKDIR /repo

COPY --from=build /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/packages/ packages/
COPY --from=build /repo/apps/worker/package.json apps/worker/
COPY --from=build /repo/apps/worker/dist/ apps/worker/dist/

# `--prod` drops tsup, eslint and typescript. `ffmpeg-static` and `ioredis` are
# runtime dependencies and are kept.
RUN pnpm install --filter @beyond-social/worker... --frozen-lockfile --prod

# Not root. The worker writes only to a temp directory and needs nothing that
# belongs to the system.
USER node

# Matches the default in the worker's own env schema. Hosts that inject their
# own PORT override it.
ENV WORKER_PORT=8080
EXPOSE 8080

WORKDIR /repo/apps/worker
CMD ["node", "dist/index.js"]
