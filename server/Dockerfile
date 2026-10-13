# The Go API as a small image. Migrations are embedded in the binary and run at start.
ARG GO_VERSION=1.27.2

FROM golang:${GO_VERSION} AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# The commit is reported by /ready so a deploy can tell the new release from the old.
ARG GIT_SHA=dev
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath \
    -ldflags="-s -w -X github.com/Ferousco-dev/beyond-social/server/internal/buildinfo.Commit=${GIT_SHA}" \
    -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
