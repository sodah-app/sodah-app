# Sodah WhatsApp AI Provider v4.0.1

Production-oriented single Baileys socket owner for Sodah WhatsApp AI.

## Render deployment

This package is intentionally structured for a Render Node Web Service whose project root contains:

- `server.js`
- `package.json`
- `Dockerfile` (optional if using Docker runtime)

If your Render service currently starts with `node server.js`, use this package as-is.

### Build command
`npm install`

### Start command
`node server.js`

Do NOT deploy only `server.js`. The `package.json` must be deployed with it so Render installs `pg` and the other dependencies.

### Required environment variables

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (persistent PostgreSQL connection string)
- `PROVIDER_API_KEY` if your deployment uses provider authentication

Optional:

- `DATABASE_SSL=true`
- `AUTH_DIR=./auth_sessions`
- `DATA_DIR=./data`
- `AI_ENABLED=true`
- `OPENAI_MODEL=gpt-4o-mini`
- `BUSINESS_TIMEZONE=Asia/Dubai`
- `FOLLOWUP_ENABLED=true`
- `REMINDERS_ENABLED=true`

## Why the previous deployment failed

The server imports the Node PostgreSQL package with `require("pg")`. The Render runtime log showed:

`Error: Cannot find module 'pg'`

That means the runtime did not have the dependency installed. This package includes `pg` in `dependencies` and puts `package.json` in the same project root as `server.js`.

## Important architecture

Keep `sodah-whatsapp-qr-provider` as the single Baileys socket owner for the connected WhatsApp account. Do not run a second Baileys socket for the same account.

Persistent customer conversation memory is stored in PostgreSQL and isolated by:

`sodah:{business_id}:{customer_phone}`

Appointments remain in Supabase.
