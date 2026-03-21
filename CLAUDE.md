# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LearnTensors is a web-based coding practice platform for tensor/matrix mathematics (Python/PyTorch). It runs on Cloudflare Pages with a D1 (SQLite) database.

## Commands

### Development
```bash
npm run dev        # Full dev environment (builds SSR, applies migrations, seeds DB, starts Vite + Wrangler)
```
Dev runs three processes via stmux: Vite dev server (:5173), Wrangler Pages dev (:8787, proxies to Vite), and a URL display script. Access the app at localhost:8787.

### Build
```bash
npm run build           # Production build (type-check + client + SSR bundles)
npm run build:ty-wasm   # Build ty WASM type checker from Astral's Ruff (skips if already built)
npm run preview         # Preview production build
```

### Type Checking
```bash
npx vue-tsc -b    # TypeScript check (strict mode, no unused locals/params)
```

### Database
```bash
npx wrangler d1 migrations apply learntensors-db --local   # Apply migrations locally
```
Migrations are in `migrations/` (SQL files). Seed data is in `seed.sql`.

There is no linter, formatter, or test runner configured.

## Architecture

### Two-Page App
1. **Problem List** (`/`) — Client-rendered Vue app. Entry: `src/main.ts` → `App.vue` → `ProblemList.vue`
2. **Problem Page** (`/problem/[slug]`) — Server-rendered (SSR) Vue page with client hydration. SSR entry: `src/entry-server.ts`, client entry: `src/entry-client-problem.ts` → `ProblemPage.vue`

### SSR Pattern
The problem page is server-rendered by a Cloudflare Pages Function (`functions/problem/[slug].ts`). It calls `renderProblemPage()` from the SSR bundle, inlines critical CSS, and passes problem data to the client via `window.__PROBLEM__`. The client entry hydrates the Vue component onto the server-rendered HTML.

### Monaco Editor
Loaded from CDN (not bundled) using AMD require/config. The editor is intentionally separated from Vue's DOM hydration. Enter key is explicitly bound to insert newlines (workaround for CDN loading).

### ty Type Checker (WASM)
`src/composables/useTyChecker.ts` integrates Astral's ty (from Ruff) as WASM to provide real-time Python diagnostics, hover info, completions, inlay hints, signature help, and semantic tokens in the Monaco editor. Built via `scripts/build-ty-wasm.sh`, output in `src/ty_wasm/`.

### Backend
Cloudflare Pages Functions in `functions/`:
- `api/problems.ts` — GET all problems
- `api/stars.ts` — GET/POST/DELETE starred problems
- `problem/[slug].ts` — SSR problem page

### Database Schema
Three tables: `problems` (name, slug, description, starter_code, difficulty), `test_cases` (problem_id, input, expected_output), `stars` (user_id, problem_id).

## Key Technical Decisions
- Vite SSR target is `webworker` (for Cloudflare Workers runtime)
- Problem page assets use predictable filenames (`problem-page.js`, `problem-page.css`) for caching
- ty_wasm is excluded from Vite dependency optimization
- Vue app has separate build entries for the two pages (not a SPA router)
