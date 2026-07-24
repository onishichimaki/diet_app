# Habi architecture

Habi is a mobile-first personal health dashboard built with Next.js, TypeScript,
vinext, and Cloudflare D1. The UI is a single responsive application surface
with five focused views: Today, Meals, Records, Reports, and Settings.

## Data flow

1. `app/HabiApp.tsx` renders an immediate sample state and requests `/api/health`.
2. `app/api/health/route.ts` validates requests and delegates all persistence.
3. `db/health.ts` initializes D1 with prepared statements, seeds the first-use
   demo, and provides the query and mutation helpers.
4. `db/schema.ts` is the source schema for Drizzle migrations.

The first version is deliberately single-user and is intended to be deployed as
an owner-only site. A later Supabase integration can add accounts and row-level
security without changing the dashboard’s component structure.

## Records

- `meal`: category, label, calories, carbohydrates, protein, and fat
- `weight`: body weight in kilograms
- `activity`: steps, distance, duration, and activity label
- `sleep`: sleep duration in hours
- `health_goals`: daily nutrition, weight, steps, and sleep targets

## Privacy

No secret values are stored in the repository or sent to the browser. Records
are served through same-origin route handlers. Production access should remain
owner-only until user authentication and per-user ownership checks are added.
