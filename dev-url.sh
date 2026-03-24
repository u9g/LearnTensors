#!/bin/sh
# Wait for wrangler to report its URL
while ! grep -q 'http://localhost' dev-logs/wrangler.log 2>/dev/null; do sleep 0.3; done
URL=$(grep -o 'http://localhost:[0-9]*' dev-logs/wrangler.log | head -1)
echo ""
echo "  App running at: $URL"
echo ""
tail -f /dev/null
