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
Tailwind CSS, ESLint, and the related type definitions. No additional
packages are required.

### Run locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page
auto-updates as you edit the file.

### Enable collectible saving

The collectible route uses the PostgreSQL schema in
[`lib/db/migrations/0001_initial.sql`](./lib/db/migrations/0001_initial.sql).
Copy [`.env.example`](./.env.example) to `.env.local` and set:

```env
DATABASE_URL=postgresql://username:password@host:5432/database_name
NUTRIGO_USER_ID=your-existing-users-table-uuid
```

`NUTRIGO_USER_ID` must be the ID of an active row in the `users` table. The
current project does not have an authentication provider yet, so this server
environment variable identifies the user while the feature is being tested.
Replace it with the authenticated user's ID when authentication is added.

When the player is within 100 meters of the generated Golden Apple marker,
`src/app/components/MapView.tsx` first calls the POI API to create the
location and its Golden Apple appearance. The **Collect** button then calls
the collectible API with those IDs. The collectible API only verifies the
existing POI/appearance and records the owned collectible plus its `acquired`
lifecycle event in one database transaction.

The AR collectible panel watches the player's location and shows the nearest
collectible when it is within 20 meters. Pressing **Collect** opens the rear
camera; pressing **Confirm collection** in the camera view submits the same
location-validated collectible request.

For local demonstrations, use **Place here** in the AR panel after location
access is granted. It creates a `Demo Collectible` at the current GPS
coordinates through the POI API, making it immediately available to test the
collect-and-confirm camera flow.

When the camera opens, the AR apple uses the device compass and GPS bearing
to move horizontally in the camera view as the player turns. iOS may ask for
motion and orientation permission when **Collect** is pressed. Compass support
is device/browser dependent; if it is unavailable, the app shows a calibration
message and still preserves the location-based collection check.
The compass overlay must be tested on a phone or tablet with motion sensors;
desktop browsers generally do not emit device-orientation events, so the apple
will remain centered there.

### Verify the project

Create a production build with:

```bash
npm run build
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
