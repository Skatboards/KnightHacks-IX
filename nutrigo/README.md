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
```

Run an import for one or more FoodData Central IDs:

```bash
npm run import:usda -- --fdc-id 747448 --fdc-id 170379
```

The temporary admin endpoint accepts the same IDs at
`POST /api/admin/usda/import` with an `Authorization: Bearer` header. Imported
records use `usda:fdc:<fdcId>` as `external_id`, default rarity to `none`, and
map USDA categories to the application taxonomy with `Other` as the fallback.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
