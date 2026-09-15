# PatchPilot — AI Software Engineer for Hire (MVP)

## Customer website (live at `/`)
The landing site is the product front door: hero, how-it-works, safety,
pricing, FAQ, and a **hire form** that creates a real customer account via
`POST /customers`. After hiring, the customer clicks **Install the GitHub App**
(`GET /github/install-url`); the `installation.created` webhook then
auto-connects their repos. Label any issue `ai-fix` → fix PR.
Internal dashboard lives at `/app`. API docs at `/docs`.

## Quickstart
1. `cp .env.example .env` — fill in `GITHUB_APP_ID`, private key path, webhook secret, `ANTHROPIC_API_KEY`.
2. `docker compose up --build` — starts Postgres (pgvector), Redis, API (:8000), worker, dashboard (:5173).
3. Create GitHub App (read/write code, read issues, write PRs, read checks), install on a repo, set webhook to `https://<you>/webhooks/github`.
4. `POST /customers` + `POST /repos` to connect the repo (or auto-create on install event).
5. Label an issue `ai-fix` → job enqueued → sandbox → agent loop → PR `ai-fix/issue-N` for human review.

## API
- `POST /webhooks/github` — GitHub App webhooks (HMAC verified).
- `POST /jobs` / `GET /jobs` / `GET /jobs/{id}` / `GET /jobs/{id}/transcript`
- `GET /prs`
- `POST /repos` / `GET /repos` / `PATCH /repos/{id}` (label, branch, budgets) / `POST /repos/{id}/pause` (kill switch)
- `POST /customers` / `GET /customers` / `PATCH /customers/{id}`
- `GET /usage?customer_id=` — tokens, seconds, cost (billed vs unbilled). `POST /billing/stripe-webhook` is a stub for Stripe metered billing.

## Guardrails (in code, not prompts)
- No merge function exists anywhere (`tests` assert this). Agent opens PRs only.
- Only `ai-fix/*` branches allowed; `main/master/prod` denied.
- Sandbox commands gated by allowlist + destructive-pattern denylist; path traversal blocked.
- Caps per job: iterations, wall-clock, tokens, cost. Kill switch per repo + per customer.
- Full transcript stored per job for audit.

## RAG memory
`app/memory.py`: on first job, indexes README/CONTRIBUTING/style configs/past PRs into `repo_docs`; retrieves top-k chunks into the system prompt. No external vector DB required; pgvector/Chroma can replace the scorer later (same function signatures).

## Dev
- `python -m pytest -q` (6 agent/guardrail tests + 4 memory/billing/budget tests).
- Dashboard: `cd dashboard && npm install && npm run dev`.
