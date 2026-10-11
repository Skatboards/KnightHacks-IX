This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

Install [Node.js 20.9 or later](https://nodejs.org/). npm is included with
Node.js.

### Install dependencies

From the `nutrigo` directory, install the dependencies listed in
`package.json`:

```bash
npm install
```

This installs Next.js, React, React DOM, Leaflet, React Leaflet, TypeScript,
Tailwind CSS, ESLint, the PostgreSQL client, and the related type definitions.

### Run locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page
auto-updates as you edit the file.

### Start PostgreSQL with Docker Compose

The repository includes a Docker Compose setup for the Next.js app and a
PostGIS-enabled PostgreSQL server. Docker Desktop or Docker Engine with the
Compose plugin is required.

From the repository root, configure the development user and start both
services:

```bash
cp nutrigo/.env.example nutrigo/.env.local
# Edit nutrigo/.env.local and set NUTRIGO_USER_ID to an active users.id value.
docker compose -p nutrigo -f compose.yaml up --build
# Older installations may use: docker-compose -p nutrigo -f compose.yaml up --build
```

Open [http://localhost:3000](http://localhost:3000) after the services become
healthy. The database is available from the host at `localhost:5432` with
these development credentials:

```text
Database: nutrigo
User: nutrigo
Password: nutrigo_dev_password
```

The initial schema at
[`src/lib/db/migrations/0001_initial.sql`](./src/lib/db/migrations/0001_initial.sql)
is mounted into PostgreSQL's initialization directory and runs automatically
when the database volume is created for the first time. The migration requires
PostgreSQL 18 because it uses `uuidv7()`.

Stop the services without deleting the database:

```bash
docker compose -p nutrigo -f compose.yaml down
```

To delete and recreate the development database, run the guarded reset script
from the `nutrigo` directory:

```bash
npm run db:reset
```

The script asks for confirmation, removes only the Compose database volume,
and starts the services again. For a non-interactive reset, run:

```bash
npm run db:reset -- --yes
```

After the schema is recreated, the reset also applies
[`scripts/seed-dev-db.sql`](../scripts/seed-dev-db.sql). This creates a local
development user, sample food types, POIs, appearances, owned collectibles,
and acquisition events. Set `NUTRIGO_USER_ID` to
`11111111-1111-4111-8111-111111111111` in `.env.local` to use the seeded user.

The API reference is available in the repository's
[`docs/API.md`](../docs/API.md) file.

### Verify the project

Create a production build with:

```bash
npm run build
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## USDA food imports

The USDA importer writes full FoodData Central records into PostgreSQL as food
collectible types. Configure these server-only environment variables before
running it:

```text
DATABASE_URL=postgresql://...
USDA_API_KEY=...
USDA_IMPORT_ADMIN_TOKEN=...
USDA_IMPORT_ERROR_LOG_PATH=logs/usda-import-errors.log
```

Run an import for one or more FoodData Central IDs:

```bash
npm run import:usda -- --fdc-id 747448 --fdc-id 170379
```

The temporary admin endpoint accepts the same IDs at
`POST /api/admin/usda/import` with an `Authorization: Bearer` header. Imported
records use `usda:fdc:<fdcId>` as `external_id`, default rarity to `none`, and
map USDA categories to the application taxonomy with `Other` as the fallback.
Failed imports are appended as JSON lines to the configured server-side log
file. The default location is `nutrigo/logs/usda-import-errors.log`; the log
directory is ignored by git. Non-success USDA responses include the upstream
HTTP status and a truncated response body in the log.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
