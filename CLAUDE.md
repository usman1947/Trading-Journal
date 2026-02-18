# Trading Journal - Claude Code Guide

## Quick Start

```bash
npm run dev          # Start development server
npm run build        # Production build (prisma generate + next build)
npm run lint         # ESLint check
npm run typecheck    # TypeScript strict check
npm run format:check # Prettier format check
npm run test         # Run unit tests
npm run verify       # Run ALL quality checks (typecheck + lint + format + test + build)
prisma db push       # Sync schema to database (NOT prisma migrate dev — see Database section)
prisma generate      # Regenerate Prisma client after schema changes
```

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript (strict mode)
- **UI**: MUI v7 + TailwindCSS (utility classes only; MUI for component styling)
- **State**: Redux Toolkit + RTK Query (all API calls go through RTK Query)
- **Database**: Prisma 7 + PostgreSQL (via @prisma/adapter-pg)
- **Auth**: JWT via httpOnly cookies, middleware-protected routes (jose library)
- **Forms**: Formik + Yup for form validation
- **API Validation**: Zod schemas in `src/lib/validation-schemas.ts`
- **Charts**: Recharts v3
- **AI**: Groq SDK (weekly coach), @xenova/transformers (local embeddings for RAG)
- **File Storage**: Cloudinary

## Architecture Rules

### API Routes (`src/app/api/`)

Every route handler MUST follow this pattern:

```typescript
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const parsed = mySchema.safeParse(body);
    if (!parsed.success) return validationError(formatZodError(parsed.error));

    // ... business logic with userId: user.id in all Prisma queries
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'description of what failed');
  }
}
```

Key rules:

- `export const dynamic = 'force-dynamic'` on ALL API routes
- Auth check first: `getAuthUser()` from `src/lib/auth-helpers.ts`
- Validate input with Zod schemas from `src/lib/validation-schemas.ts`
- User isolation: ALWAYS include `userId: user.id` in Prisma where clauses
- Use `applyAccountFilter()` from `src/lib/query-helpers.ts` for account-scoped queries
- Wrap in try/catch with `handleApiError(error, 'context')` from `src/lib/api-helpers.ts`

### Redux / RTK Query (`src/store/`)

- ALL API calls go through RTK Query endpoints in `src/store/index.ts`
- Trade mutations MUST invalidate both `['Trades', 'Analytics']` tags
- `selectedAccountId` lives in UI slice — `null` means Paper Account
- Use typed hooks: `useAppDispatch()` and `useAppSelector()` from `src/store/hooks.ts`
- Tag types: Trades, Trade, Strategies, Tags, Journal, Analytics, Settings, Accounts, User, WeeklyCoach, RuleAdherence

### Components (`src/components/`)

- `'use client'` directive on all components using hooks or browser APIs
- Use `formatCurrency()` from `src/utils/formatters.ts` for ALL dollar amounts
- MUI v7 uses `slotProps` — NOT deprecated `InputProps`/`inputProps`
- MUI Grid syntax: `size={{ xs: 12, md: 6 }}` (not `item xs={12}`)
- Use `sx` prop for one-off styles, TailwindCSS for utility classes
- All charts in `src/components/analytics/` use Recharts
- Show user feedback via `dispatch(showSnackbar({ message, severity }))` from uiSlice

### Database (Prisma)

- Schema drift exists — use `prisma db push` instead of `prisma migrate dev`
- ALWAYS run `prisma generate` after any `schema.prisma` change
- Never use raw SQL (`$queryRaw`, `$executeRaw`) — Prisma ORM only
- Cascade deletes are configured in schema for user-owned data

## Testing

- Test files go in `__tests__/` mirroring the source structure
- Pure functions (utils, lib): test directly with Jest
- Redux slices: import reducer and actions, test state transitions
- Components: wrap in Redux Provider using test utilities
- API routes: mock Prisma with `jest.mock('@/lib/prisma')`
- Run `npm test -- --coverage` to check coverage
- Coverage thresholds enforced in `jest.config.js`

## What NOT to Do

- Do NOT use `any` type — use proper typing or create interfaces in `src/types/`
- Do NOT use inline styles — use MUI `sx` prop or Tailwind classes
- Do NOT create API endpoints without Zod validation schemas
- Do NOT use `console.log` in production code — use `console.error` in catch blocks only
- Do NOT commit `.env` files or hardcode secrets
- Do NOT use `prisma migrate dev` — use `prisma db push` (schema drift)
- Do NOT use deprecated MUI props (`InputProps`, `inputProps`) — use `slotProps`
- Do NOT use `dangerouslySetInnerHTML` — React's JSX escaping handles XSS prevention

## Commit Convention

Use conventional commits enforced by commitlint:

```
feat: add trade duration analytics chart
fix: correct R-multiple calculation for partial exits
refactor: extract date filter logic to query-helpers
test: add unit tests for trade calculations
chore: update dependencies
```

## Key Files Reference

| Purpose             | File                              |
| ------------------- | --------------------------------- |
| RTK Query + Store   | `src/store/index.ts`              |
| Typed Redux hooks   | `src/store/hooks.ts`              |
| API error handling  | `src/lib/api-helpers.ts`          |
| Auth helpers        | `src/lib/auth-helpers.ts`         |
| Auth edge (JWT)     | `src/lib/auth-edge.ts`            |
| Route protection    | `src/middleware.ts`               |
| Account filtering   | `src/lib/query-helpers.ts`        |
| Zod API schemas     | `src/lib/validation-schemas.ts`   |
| Currency formatting | `src/utils/formatters.ts`         |
| Trade calculations  | `src/utils/trade-calculations.ts` |
| Prisma schema       | `prisma/schema.prisma`            |
| Rate limiting       | `src/lib/rate-limiter.ts`         |
| Env validation      | `src/lib/env.ts`                  |

## Verification

Before committing, run: `npm run verify`

This executes: TypeScript check → ESLint → Prettier → Unit tests → Build
