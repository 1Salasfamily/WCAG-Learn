# Docs Guide

## Local development

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open http://localhost:3000

## Deployment (Vercel)

- Vercel detects this as a Next.js project from `package.json` and `next` dependency.
- Default Vercel build command works: `next build`.
- App Router entry points are in `app/layout.tsx` and `app/page.tsx`.

## Project docs

- `docs/PRD.md` is the product source-of-truth for this initialization phase.
