# BrokerMind backend

NestJS + Prisma + PostgreSQL backend for the BrokerMind ops dashboard.

## Quick start

```bash
cd brokermind
npm install
cp .env.example .env             # fill DATABASE_URL + OPENAI_API_KEY
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run start:dev
```

Default port: `4000`. The Vite frontend proxies `/api` here.

## Layout

- `prisma/schema.prisma` — all 13 entity models (Client, CallRecording, Conversation, Email, Escalation, FAQ, Margin, Orders, Portfolio, PerformedAction, SupportQuery, Ticket, AISOPSuggestion)
- `src/entities/` — generic CRUD controller: list / filter / get / create / update / delete for every entity
- `src/functions/` — ports of the 18 legacy serverless functions (ingestRecording, ingestEmail, ticketAutomation, clientLookup, getOrders, getMargin, getPortfolio, cancelOrder, squareOff, searchFaq, saveConversation, generateSOPSuggestions, syncBolnaCalls, bolnaWebhook, triggerBolnaCall, backfillCallRecordings, createEscalation, fetchGmailEmails)
- `src/llm/` — `/api/llm/invoke` thin wrapper over OpenAI used by AI-driven UI panels
- `src/auth/` — `/api/auth/me` stub (auth intentionally skipped for now)

## HTTP surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/entities/:name?sort=-field&limit=100` | List records |
| `POST` | `/api/entities/:name/query?sort=-field` | Filter — body is the `where` object |
| `GET` | `/api/entities/:name/:id` | Get one |
| `POST` | `/api/entities/:name` | Create |
| `PATCH` | `/api/entities/:name/:id` | Update |
| `DELETE` | `/api/entities/:name/:id` | Delete |
| `POST` | `/api/functions/:name` | Invoke a backend function |
| `POST` | `/api/llm/invoke` | Run an LLM prompt (OpenAI) |
| `GET` | `/api/auth/me` | Current user (stubbed) |
