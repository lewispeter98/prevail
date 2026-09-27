# Prevail

A personal app for weight, goals and journaling. Next.js on Vercel, Supabase for data.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. Run the SQL in `supabase/migrations/` in the Supabase SQL editor (once).
4. `npm run dev` and open http://localhost:3000

## How it's put together

- **Passcode gate.** `src/proxy.ts` sends any device without the session cookie to `/unlock`.
  The cookie lasts a year. Changing `PREVAIL_PASSCODE` signs every device out.
- **Server-only data.** All database access goes through `db()` in `src/lib/db.ts`, which
  re-checks the session and uses the Supabase secret key. RLS is on with no policies, so the
  public key can read nothing.
- **Days run 4am to 4am, London time.** Use `today()` / `dayOf()` from `src/lib/day.ts`,
  never `new Date()` directly, when deciding which day something belongs to.
- **Streaks** are calculated from the data (`src/lib/streaks.ts`); there's no streak table.

## Modules

| Module  | Tabs                          |
| ------- | ----------------------------- |
| Weight  | Today · Trends · History      |
| Goals   | Script · Objectives · Record  |
| Journal | Today · Reflections · History |
