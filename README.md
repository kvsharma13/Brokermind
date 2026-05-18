# BrokerMind

Ops dashboard for a stock-brokerage support team — multi-channel customer interactions (voice, WhatsApp, email, web chat), AI triage, call-recording analysis, ticket workflow, and compliance monitoring.

## Layout

| Path | Purpose |
| --- | --- |
| [`src/`](src/) | React + Vite frontend (Tailwind, shadcn/ui, React Query, React Router) |
| [`brokermind/`](brokermind/) | NestJS + Prisma + PostgreSQL backend |

## Run it locally

You need two processes: the backend and the Vite frontend.

### Backend

```bash
cd brokermind
npm install
cp .env.example .env             # fill DATABASE_URL + OPENAI_API_KEY
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run start:dev                # http://localhost:4000
```

### Frontend

```bash
npm install
npm run dev                      # http://localhost:3001
```

The Vite dev server proxies `/api` to `http://localhost:4000` — override with `VITE_API_PROXY_TARGET` if your backend lives elsewhere. For production builds, set `VITE_API_BASE_URL` to the absolute backend URL.

## Environment

Frontend (optional):

```
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:4000
```

Backend (`brokermind/.env`):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/brokermind?schema=public
PORT=4000
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGINS=http://localhost:3001

# Optional integrations
BOLNA_API_KEY=
BOLNA_AGENT_ID=
BOLNA_WEBHOOK_SECRET=
GMAIL_ACCESS_TOKEN=
```

## API surface

See [brokermind/README.md](brokermind/README.md) for the full HTTP contract — generic entity CRUD under `/api/entities/:name`, all 18 backend functions under `/api/functions/:name`, plus `/api/llm/invoke` for ad-hoc OpenAI calls.
