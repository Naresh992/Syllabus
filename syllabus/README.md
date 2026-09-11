# Syllabus — Add someone to your syllabus.

A dating platform exclusively for **verified college students (18+)**.
Enroll with your `.edu` email → get ID-verified → browse **The Syllabus** →
build **My Roster** → chat in **Office Hours** → meet IRL at **Study Group** events.

**Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS · Prisma ·
PostgreSQL (Neon) · Razorpay (subscriptions)

## Quickstart

```bash
cd syllabus
cp .env.example .env   # then set DATABASE_URL (free DB at https://neon.tech)
npm install            # also runs `prisma generate`
npm run setup          # creates tables + seeds demo data
npm run dev            # → http://localhost:3000
```

## Deploy to Vercel (app) + Neon (Postgres) — free tiers

1. **Neon:** create a project at https://neon.tech → copy the connection string
   (`postgresql://...?sslmode=require`).
2. **Create tables + demo data** (from this machine, or anywhere with the URL):
   ```bash
   DATABASE_URL="<paste-neon-url>" npx prisma db push
   DATABASE_URL="<paste-neon-url>" npm run db:seed
   ```
3. **GitHub:** create an empty repo → push this code:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin master
   ```
4. **Vercel:** Add New → Project → Import the repo → set **Root Directory** to
   `syllabus` → add Environment Variables:
   - `DATABASE_URL` = the Neon connection string
   - `SESSION_SECRET` = a long random string
   - (leave Razorpay vars empty for mock-mode payments)
   → **Deploy**. That's it — HTTPS is automatic, so secure cookies just work.

### Demo accounts (see the login page shortcuts)

| Role | Email | Password | Notes |
|---|---|---|---|
| Student | `alex@verrill.edu` | `password123` | Free **Audit** tier, 2 matches, incoming likes |
| Admin | `admin@syllabus.app` | `admin123` | Approve/reject IDs at `/admin` |
| Everyone | any seed `*@*.edu` | `password123` | 13 verified students across 3 campuses |

### Suggested demo script

1. **Landing (`/`)** — brand, trust angle, pricing.
2. **Sign in as Alex** (`alex@verrill.edu`) → **The Syllabus** (`/syllabus`):
   swipe/drop a few cards, hit ✋ Raise Hand, open 🧾 Class Roster (locked teaser on free).
3. **My Roster** (`/roster`) → open Priya → **Office Hours** (`/office-hours/...`) — send a message.
4. **Study Group** (`/study-group`) — RSVP to the Verrill mixer.
5. **Pricing** (`/pricing`) — upgrade to Enrolled (demo-mode payment, no real charge),
   then Class Roster unlocks.
6. **Enroll a new student**: sign out → `/enroll` → sign up as `you@verrill.edu`,
   upload any ID photo + selfie, DOB (try a 2015 date to see the 18+ gate),
   build a profile, set Prerequisites → lands in **pending review**.
7. **Sign in as admin** → `/admin` → approve the new student → sign back in as them
   and browse The Syllabus.

## Project layout

```
src/
  app/
    page.tsx                 landing page
    login/  enroll/          auth + 6-step onboarding
    (app)/                   authenticated shell (AppShell + bottom nav on mobile)
      syllabus/              The Syllabus (swipe deck)
      roster/                My Roster (matches)
      office-hours/          inbox + real-time thread (2.5s polling)
      study-group/           events + RSVP
      pricing/               paywall + Razorpay checkout
      settings/              profile editor, discovery prefs, privacy, blocks
      admin/                 verification desk (approve/reject)
    api/                     REST routes (auth, verification, admin, discovery,
                             swipe, likes, matches, messages, events, report,
                             block, billing, avatar)
  components/                Logo, AppShell, ProfileCard, Modal, ReportBlockMenu, ui
  lib/                       db, auth (JWT sessions), tiers, limits, discovery,
                             razorpay, avatar, constants, serialize, time
prisma/
  schema.prisma              full data model (see below)
  seed.ts                    3 campuses · 13 students · matches/chats · events
```

## Data model

`campuses` · `users` (email, password_hash, name, dob, campus_id,
verification_status) · `verification_docs` (id + selfie URLs kept **private** —
never joined into public card queries) · `profiles` (bio, photos, major,
class_year, intent/"Prerequisites", prompts, discovery prefs, privacy flags) ·
`swipes` · `matches` · `messages` · `subscriptions` · `events` + `event_rsvps` ·
`reports` · `blocks`.

## Subscriptions (Razorpay)

Tiers: **Audit** (free, 15 swipes/day) · **Enrolled** ₹599/mo · **Honor Roll**
₹1299/mo · **Extra Credit** ₹2399/mo.

- **No keys?** The paywall runs in **mock mode** — checkout + upgrades complete
  instantly with no charge, so the full flow is demoable offline.
- **Real payments:** add test keys to `.env` (`RAZORPAY_KEY_ID`,
  `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, plus
  `RAZORPAY_WEBHOOK_SECRET`) and live Razorpay Checkout + signature verification
  take over automatically. Point the webhook at `/api/billing/webhook`.

## Production notes

- **Database:** PostgreSQL everywhere (Neon recommended; `docker-compose.yml`
  runs local Postgres 16 if you have Docker). Point `DATABASE_URL` at it and
  run `npm run setup`. Profile `photos`/`prompts` are JSON-encoded strings.
- **HTTPS cookies:** session cookies are `Secure` in production builds. Serving
  `next start` locally over plain HTTP requires `SESSION_COOKIE_SECURE=0`.
  Real HTTPS deployments (Vercel) need no extra config.
- **Before real launch:** replace the placeholder face-match with a KYC vendor
  (Persona/Onfido), move ID photos to encrypted object storage, add rate
  limiting, and run behind HTTPS.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run setup` | `prisma db push` + seed |
| `npm run db:reset` | wipe + reseed (fresh demo state) |
| `npm run db:studio` | Prisma Studio DB browser |
