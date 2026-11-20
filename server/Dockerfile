# The Go API as a container image, for Cloudflare Containers (or any Docker host).
# Build from the server/ folder:  docker build -t beyond-social-api --build-arg COMMIT=$(git rev-parse HEAD) .
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# The commit is baked in so /ready can say which release is running.
ARG COMMIT=unknown
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -tags netgo -trimpath \
    -ldflags "-s -w -X github.com/Ferousco-dev/beyond-social/server/internal/buildinfo.Commit=${COMMIT}" \
    -o /out/app ./cmd/api

# Distroless static carries the CA certificates the API needs to call Supabase and the providers.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/app /app
ENV PORT=8080 APP_ENV=production
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/app"]
