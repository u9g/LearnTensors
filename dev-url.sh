#!/bin/sh
# Wait for wrangler to report its URL
while ! grep -qE 'http://(localhost|0\.0\.0\.0)' dev-logs/wrangler.log 2>/dev/null; do sleep 0.3; done
PORT=$(grep -oE 'http://(localhost|0\.0\.0\.0):([0-9]+)' dev-logs/wrangler.log | head -1 | grep -oE '[0-9]+$')
echo ""
echo "  App running at: http://localhost:$PORT"
echo "                   http://127.0.0.1:$PORT"
echo ""
tail -f /dev/null
