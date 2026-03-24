#!/bin/sh
set -e

npm run dev:clean
npm run dev:ssr
npm run dev:migrate
npm run dev:seed

sh scripts/free-port.sh > dev-logs/vite-port

stmux -- \
  [ [ "npm run dev:vite" \
   .. "npm run dev:wrangler" ] \
   : "sh dev-url.sh" ]
