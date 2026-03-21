---
name: Cloudflare deployment
description: Project deploys to Cloudflare (Pages/Workers) and uses D1 for the database
type: project
---

LearnTensors deploys via Cloudflare. Uses Cloudflare D1 (serverless SQLite) for the database.

**Why:** User chose Cloudflare as hosting platform — all backend/database choices should align with Cloudflare's ecosystem (D1, Workers, Pages).

**How to apply:** Use Wrangler for DB management, D1 bindings for data access, and Cloudflare Pages/Workers for any server-side logic. Don't suggest non-Cloudflare alternatives like standalone SQLite, Postgres, etc.
