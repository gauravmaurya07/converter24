#!/bin/sh
set -eu

# Start the local BgUtils PO-token provider. It stays private to this container.
/usr/local/bin/node /app/build/main.js --host 127.0.0.1 --port 4416 >/tmp/bgutil.log 2>&1 &
BGUTIL_PID=$!

cleanup() {
  kill "$BGUTIL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Give the provider a moment to initialize before accepting conversion requests.
sleep 1
exec /usr/local/bin/node /app/converter/server.js
