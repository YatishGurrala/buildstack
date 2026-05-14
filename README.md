This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## What This App Is

Buildstack is a multi-project backend platform. The home dashboard shows the global project list, while each project dashboard focuses on the smallest useful set of controls for that project: service overview, API access, storage, and settings.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Infrastructure Env Notes

- Current database envs are `CORE_DATABASE_URL` and `PROJECTS_DATABASE_URL`.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are optional, but both are required if you use `POST /api/core/auth/login`.
- If you use Google OAuth or local `SKIP_AUTH=true`, admin email/password can remain unset.

## Project Dashboard

The project dashboard is intentionally compact.

- Open a service card to see only the most important controls for that service.
- Use the API panel to create and revoke keys.
- Use the database and auth views to confirm current project state without digging through dense diagnostics.
- The documentation links in the app are meant to support a quick "what do I need next?" workflow rather than a full admin manual.
## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
