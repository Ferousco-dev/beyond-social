# The render worker.
#
# A plain Node image with no apt install of ffmpeg: the binary ships inside
# `ffmpeg-static`, which is why this is a normal Node service rather than a
# custom image built around a system codec. Debian slim rather than Alpine
# because the packaged binary is glibc-linked and would not run on musl.
#
# Built from the repo root, not this directory, because the worker depends on
# workspace packages that live outside it:
#   docker build -f services/render/Dockerfile .

FROM node:22-slim AS build

# Corepack pins pnpm to whatever `packageManager` in the root manifest says, so
# the image cannot drift from what the repo builds with locally.
RUN corepack enable

WORKDIR /repo

# The manifests alone first, so a change to source does not invalidate the
# dependency layer. Every workspace member the filter below has to resolve must
# have its manifest present, or pnpm refuses the lockfile as out of date.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/env/package.json packages/env/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY services/render/package.json services/render/

RUN pnpm install --filter @beyond-social/render... --frozen-lockfile

COPY packages/ packages/
COPY services/render/ services/render/

RUN pnpm --filter @beyond-social/render build

# A second stage so the built image carries the bundle and its runtime
# dependencies rather than the whole toolchain.
FROM node:22-slim AS runtime

RUN corepack enable
WORKDIR /repo

COPY --from=build /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/packages/ packages/
COPY --from=build /repo/services/render/package.json services/render/
COPY --from=build /repo/services/render/dist/ services/render/dist/

# `--prod` drops tsup, eslint and typescript. `ffmpeg-static` is a runtime
# dependency and is kept, along with the binary its install script fetched.
RUN pnpm install --filter @beyond-social/render... --frozen-lockfile --prod

# Not root. The worker writes only to a temp directory and needs nothing that
# belongs to the system.
USER node

# Matches the default in the worker's own env schema. Hosts that inject their
# own PORT override it.
ENV PORT=8080
EXPOSE 8080

WORKDIR /repo/services/render
CMD ["node", "dist/index.js"]
