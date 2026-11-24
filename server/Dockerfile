# The Go API as a container image, for Render (Docker runtime) or any Docker host.
# Build from the server/ folder:  docker build -t beyond-social-api --build-arg COMMIT=$(git rev-parse HEAD) .
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# The commit is baked in so /ready can say which release is running.
ARG COMMIT=unknown
# Without a COMMIT argument the server reads RENDER_GIT_COMMIT when it starts.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -tags netgo -trimpath \
    -ldflags "-s -w -X github.com/Ferousco-dev/beyond-social/server/internal/buildinfo.Commit=${COMMIT}" \
    -o /out/app ./cmd/api

# Alpine rather than distroless so ffmpeg can be installed from Alpine's own
# packages. ffmpeg puts a person's original sound back on an edited video.
FROM alpine:3.22
RUN apk add --no-cache ca-certificates ffmpeg \
    && adduser -D -H -u 65532 nonroot
COPY --from=build /out/app /app
ENV PORT=8080 APP_ENV=production
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/app"]
