# Trading Journal

A full-featured trading journal built with Next.js 14 for tracking trades, analyzing performance, and improving as a trader. Includes AI-powered weekly coaching, RAG-based journal search, strategy management with rule adherence tracking, and comprehensive analytics.

## Features

- **Trade Logging** — Record entries/exits, risk, P&L, partials, commissions, screenshots, mood, and mistakes
- **Multi-Account Support** — Separate accounts with initial balance tracking (Paper Account built-in)
- **Analytics Dashboard** — Win rate, R-multiples, P&L distribution, time-of-day profitability, strategy breakdown charts
- **Daily Journal** — Log daily notes, mood, energy/sleep/focus levels, premarket plans, and screenshots
- **Strategy Manager** — Define strategies with rules, setups, and example screenshots
- **Daily Rule Adherence** — Track daily checklist compliance for your trading rules
- **Setup Profiler** — Analyze which setups perform best across your trading history
- **AI Weekly Coach** — Groq-powered weekly performance reports with strengths, improvements, and action items
- **Ask Your Journal (RAG)** — Semantic search across trades and journal entries using local embeddings
- **Tags & Filtering** — Organize trades with custom tags and filter by date, strategy, account, side, and more
- **CSV Import** — Bulk import trades from CSV files

## Tech Stack

| Layer        | Technology                      |
| ------------ | ------------------------------- |
| Framework    | Next.js 14 (App Router)         |
| Language     | TypeScript (strict mode)        |
| UI           | MUI v7 + TailwindCSS            |
| State        | Redux Toolkit + RTK Query       |
| Database     | PostgreSQL via Prisma 7         |
| Auth         | JWT (httpOnly cookies) + jose   |
| Forms        | Formik + Yup                    |
| Validation   | Zod (all API routes)            |
| Charts       | Recharts v3                     |
| AI           | Groq SDK + @xenova/transformers |
| File Storage | Cloudinary                      |
| Deployment   | Vercel                          |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Cloudinary account (for screenshot uploads)

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd Trading-Journal
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Fill in your `.env`:

   ```
   DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
   JWT_SECRET=           # Required, min 32 chars. Generate: openssl rand -base64 48
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   GROQ_API_KEY=         # Optional — enables AI weekly coach
   ```

3. Push the database schema:

   ```bash
   npx prisma db push
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                 | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Start development server                                          |
| `npm run build`         | Production build (prisma generate + next build)                   |
| `npm run verify`        | Run all quality checks (typecheck + lint + format + test + build) |
| `npm run lint`          | ESLint check                                                      |
| `npm run typecheck`     | TypeScript strict check                                           |
| `npm run format`        | Format code with Prettier                                         |
| `npm run format:check`  | Check formatting without writing                                  |
| `npm test`              | Run unit tests                                                    |
| `npm run test:coverage` | Run tests with coverage report                                    |
| `npx prisma db push`    | Sync schema to database                                           |
| `npx prisma studio`     | Open Prisma database GUI                                          |

## Quality Gates

All code changes are validated through multiple layers:

- **Pre-commit hooks** (Husky + lint-staged) — Prettier formatting and ESLint on staged files
- **Commit messages** — Conventional commits enforced by commitlint (`feat:`, `fix:`, `test:`, etc.)
- **CI pipeline** (GitHub Actions) — Lint, format check, typecheck, tests with coverage, and build on all PRs
- **Verification script** — `npm run verify` runs all 5 checks locally before committing

## Project Structure

```
src/
  app/
    (dashboard)/           # Protected dashboard routes
      analytics/           # Charts and performance analytics
      daily-rules/         # Daily rule adherence tracking
      journal/             # Daily journal entries
      settings/            # User settings
      setup-profiler/      # Setup performance analysis
      strategies/          # Strategy management
      trades/              # Trade list and detail views
    api/                   # API route handlers
      auth/                # Login, signup, profile
      trades/              # CRUD + CSV import
      strategies/          # CRUD
      journal/             # CRUD
      analytics/           # Analytics queries
      ai/                  # Weekly coach + RAG
      upload/              # Cloudinary uploads
  components/              # React components
    analytics/             # Chart components (Recharts)
    common/                # Shared UI components
    journal/               # Journal-specific components
    trades/                # Trade-specific components
  lib/                     # Server-side utilities
    api-helpers.ts         # Standardized API responses
    auth-helpers.ts        # Auth utilities
    auth-edge.ts           # JWT verification (Edge runtime)
    env.ts                 # Zod environment validation
    query-helpers.ts       # Prisma query builders
    rate-limiter.ts        # In-memory rate limiting
    validation-schemas.ts  # Zod schemas for all API inputs
  store/                   # Redux Toolkit + RTK Query
  utils/                   # Client-side utilities
  types/                   # TypeScript type definitions
__tests__/                 # Unit tests (mirrors src/ structure)
prisma/
  schema.prisma            # Database schema
```

## Security

- JWT secret validated at startup (no hardcoded fallbacks)
- Environment variables validated via Zod at import time
- Security headers (X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy)
- Rate limiting on auth (10/min), AI (20/min), and general API (100/min) endpoints
- Zod validation on all API route inputs
- File uploads restricted to 5MB, image types only
- Error messages sanitized in production
- User data isolation enforced via `userId` in all Prisma queries

## Demo Account

```
Email:    demo@gmail.com
Password: demopw
```

## License

Private project.
