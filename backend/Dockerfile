FROM golang:1.24-alpine AS build

WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/backend ./cmd/api

FROM alpine:3.21

RUN apk add --no-cache ca-certificates \
    && addgroup -S app \
    && adduser -S -G app app
WORKDIR /app
COPY --from=build /app/backend /usr/local/bin/backend
USER app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/backend"]