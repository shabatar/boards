<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Supabase-3ecf8e?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

# Boards

Infinite canvas app. Notes, shapes, arrows, freehand — shared in realtime.

## Run locally

```bash
npm install
supabase start && supabase db reset
cp .env.local.example .env.local   # paste keys from supabase start output
npm run dev
```

Open **http://localhost:3000**.

## Run with Docker

```bash
docker compose up --build
```

Open **http://localhost:3000**.

## Environment

| Variable | Required | Description |
|----------|:--------:|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin key (server only) |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | No | Enable analytics |

## Shortcuts

| Key | Action |
|-----|--------|
| `1`–`7` | Tools: select, marquee, note, text, shape, arrow, freehand |
| `]` / `[` | Bring forward / send back |
| `Ctrl+C/V/D/A` | Copy / paste / duplicate / select all |
| `Delete` | Delete selected |
| `Space+drag` | Pan |
| `Ctrl+scroll` | Zoom |

## Deploy

**Vercel + Supabase Cloud:**

```bash
supabase link --project-ref <ref> && supabase db push
# Set env vars in Vercel, update Site URL in Supabase Auth settings
```

**Self-hosted:** `docker compose up --build -d`

## Architecture

```
src/
  proxy.ts              Auth session refresh
  lib/                  Supabase clients, data access, item factory, coords, analytics
  app/
    (auth)/             Login, signup
    (app)/dashboard/    Board list
    (app)/boards/[id]/  Board editor, sharing
    shared/[token]/     Anonymous access via share link
    stores/             Zustand (board items + UI state)
    hooks/              Pan/zoom, realtime, polling
    components/board/   Canvas, items, toolbar, panels
```

## License

[MIT](LICENSE)
