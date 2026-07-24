# Deployment

## Sites

The project uses vinext and includes `.openai/hosting.json`. The `DB` logical
binding is provisioned as Cloudflare D1 when the site is published. Generated
Drizzle migrations are included in the deployed artifact.

## Local development

Install dependencies, run the development server, and open
`http://localhost:3000`. The local D1 database is created automatically on first
use.

## Future Supabase / Vercel path

If Habi later needs shared access or multiple users, add Supabase Auth and
user-owned tables with RLS before exposing the application publicly. Keep
service-role credentials server-side and never place them in `NEXT_PUBLIC_*`
variables.
