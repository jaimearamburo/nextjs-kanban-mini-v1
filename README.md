# Kanban Mini

[![CI](https://github.com/jaimearamburo/nextjs-kanban-mini-v1/actions/workflows/ci.yml/badge.svg)](https://github.com/jaimearamburo/nextjs-kanban-mini-v1/actions/workflows/ci.yml)

A shared, login-free kanban **Board**, inspired by Jira, built to show what Next.js 16 and React 19 can do end to end: Server Components with streaming, Server Actions, optimistic updates, transitions, caching and intercepting routes.

**[Live Demo](https://kanban.jaimearamburo.dev/)** - There's no sign-up: open it and start dragging. Use **Demo controls** in the header to add latency or force failures, and watch the pending states and rollbacks happen.

## Features

- **No sign-up.** Every visitor is a **Guest** with a generated name such as "Curious Otter", and everyone works on the same Board.
- **Drag and drop** across four Statuses, with a Jira-style drop line showing where a card will land.
- **Task detail** in a modal with its own URL (NextJS intercepted routes). Priority, Status, Assignee and Labels each save on their own, and Comments can be added and archived.
- **Label Filter and text search**, both kept in the URL so a filtered view can be shared.
- **Mobiles:** long-press to drag, a "Move to…" menu, and Tasks open as a full-screen sheet.
- **Demo controls** add 1s or 3s of latency, or random or forced failures, for the viewer's browser only.
- Light, dark and system themes.

## Async React patterns

Everything below is built with React and Next.js primitives, without a client state library.

| Where | What happens | How |
|---|---|---|
| Board load | The page shell paints at once, and the toolbar and Board stream in behind skeletons | Partial Prerendering (`cacheComponents`) + `<Suspense>` boundaries |
| Drag and drop | The card lands instantly and rolls back with a toast if the save fails | `useOptimistic` with a reducer + `startTransition`; a Server Action works out the new Rank from the neighbouring Tasks |
| Create Task | The new card appears on the Board while it saves, and the modal closes with the saved Task in one step | `useActionState` + an optimistic list shared from the root layout + `startTransition` after the `await` |
| Task detail | Opens as a modal with its own URL, or as a full page on reload, and opens instantly from a hovered card | Intercepting and parallel routes (`@modal/(.)tasks/[id]`) + `"use cache"` / `cacheTag` + `<Link prefetch>` on hover and focus |
| Task fields | Priority, Status, Assignee and Labels change instantly and dim while saving | `useOptimistic` + `useTransition` + `data-pending` |
| Label Filter | The pill highlights instantly while the Board dims until the filtered results arrive | `useOptimistic` + `useTransition`, with `data-pending` styled from an ancestor (`group-has-[[data-pending]]`) |
| Comments | A new Comment appears immediately, and a deleted one fades out before it's gone | `useOptimistic` list + `has-data-pending:` CSS |
| After a write | Only what changed is re-read | `updateTag` for the Task + `refresh()` |

## Design decisions

| Decision | Why |
|---|---|
| [Fractional Rank for ordering](docs/adr/0001-fractional-rank-for-task-ordering.md) | A move rewrites only the moved Task, never its neighbours, so concurrent moves don't conflict |
| [Nothing is hard-deleted](docs/adr/0002-nothing-is-hard-deleted.md) | The Board is public, so no visitor can destroy content: deleted Comments are archived |
| [dnd-kit with a hand-built drop line](docs/adr/0003-dnd-kit-with-custom-drop-indicator.md) | Native drag and drop (and libraries built on it) is unreliable on touch screens |
| [Last write wins, per field](docs/adr/0004-last-write-wins-per-field-no-locks.md) | Every change sends the final value ("set High"), not an instruction ("cycle priority"), so fast repeated clicks don't race, with no locks needed |
| [No live sync](docs/adr/0005-realtime-events-are-invalidation-signals.md) | Built with Ably, then removed: a third-party service and an event on every write was more than a small demo Board needed |
| [Isolated environments, any Postgres](docs/adr/0006-environment-isolation-and-provider-agnostic-database.md) | Dev, tests and CI can't reach production, and the database provider can change without code changes |
| [Unsigned Guest cookie](docs/adr/0007-unsigned-guest-cookie.md) | A Guest is a label, not an account, so signing the cookie would protect nothing |

## Testing

| Type | Tool | What it covers |
|---|---|---|
| Integration | Vitest + Postgres | The Board module against a real database: moves and Ranks, creating and editing Tasks, archiving Comments, Guests, demo controls |
| End to end | Playwright | Mouse and touch drag and drop, modal routes, filters and search, optimistic rollbacks, phones, themes, accessibility (axe, WCAG 2 AA) |
| CI | GitHub Actions | Lint, type check, build and both suites on every pull request, against a throwaway Postgres container. Merging to `main` requires them to pass |

## How AI Coding Agents were used in this project

This project was built with an AI coding agent. I own the planning and the decisions. The agent implements one task at a time, and every change goes through me.

1. **Plan.** I write the spec: the requirements, the desired behaviour and the stack.
2. **Slice.** I break the spec into small vertical slices, each one working end to end on its own, and turn them into GitHub issues with acceptance criteria.
3. **Delegate.** I hand one issue at a time to the coding agent.
4. **Build together.** I work with the agent until the issue is done, tests included.
5. **Review and merge.** I review the code, open a pull request, and merge it into `main` once CI passes.

## Lighthouse

The Board, measured on 10 November 2026 with Lighthouse 12.8.

| | Performance | Accessibility | CLS |
|---|---|---|---|
| Mobile | 90 | 100 | 0 |
| Desktop | 99 | 100 | 0 |

## Environments

Nothing outside production may touch production, and the database is plain Postgres, so the provider can be swapped without code changes ([ADR-0006](docs/adr/0006-environment-isolation-and-provider-agnostic-database.md)).

| Environment | Database |
|---|---|
| Production (`main`) | Production database. Its URL exists only in Vercel's Production scope. |
| Local development and Vercel previews | The `dev` database, currently a free Neon branch. |
| Local integration and Playwright tests | A disposable `test` database, currently a free Neon branch. |
| CI | A GitHub Actions Postgres service container. |

### Environment variables

Every variable is listed in [`.env.example`](.env.example).

| Variable | Used for |
|---|---|
| `DATABASE_URL` | The `dev` database's pooled connection, used by the app at runtime. |
| `DIRECT_URL` | The `dev` database's direct (non-pooled) connection, used by Prisma migrations and the seed/reset scripts. |
| `TEST_DATABASE_URL` | The `test` database's pooled connection, used by the integration tests and the Playwright test server. |
| `TEST_DIRECT_URL` | The `test` database's direct connection, used to migrate and seed it. |
| `PRODUCTION_DATABASE_HOST` | The production database's hostname only, with no credentials, so it isn't secret. The scripts and tests refuse to run against it, and refuse to run at all if it's unset. |

If your provider has no separate pooled connection, use the same URL for both the pooled and the direct variable.

## Local setup

You need Node.js 22 or later and pnpm 11. On Node 22 and 24, `corepack enable` picks up the pnpm version in `package.json`. Newer Node releases don't bundle Corepack, so install pnpm 11 yourself.

1. **Clone and install.** Installing also generates the Prisma client.

   ```bash
   git clone https://github.com/jaimearamburo/nextjs-kanban-mini-v1.git
   cd nextjs-kanban-mini-v1
   pnpm install
   ```

2. **Create two Postgres databases**, `dev` and `test`. Any Postgres works. On Neon, two free branches of one project will do.

3. **Configure the environment.** Copy the example and fill in both databases' URLs and the production host:

   ```bash
   cp .env.example .env.local
   ```

4. **Migrate and seed the `dev` database** with the demo Board:

   ```bash
   pnpm db:migrate
   pnpm db:seed --yes
   ```

   `pnpm db:reset --yes` empties it again. Both scripts replace everything in the database, so they need `--yes`, and they refuse the production host.

5. **Start the dev server** and open [http://localhost:3000](http://localhost:3000):

   ```bash
   pnpm dev
   ```

## Checks and tests

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript, including the typedRoutes route types
pnpm build       # production build (reads the dev database)
```

### Integration tests

The Board module's integration tests (Vitest) run against the `test` database. Each test file starts by wiping it. Apply the migrations to it first, and again whenever new ones are added:

```bash
pnpm db:test:migrate
pnpm test          # or `pnpm test:watch`
```

### Playwright tests

The end-to-end tests also use the `test` database, so it needs the migrations (`pnpm db:test:migrate`, above). Install the browser once:

```bash
pnpm exec playwright install chromium
```

Then:

```bash
pnpm test:e2e
```

Playwright seeds the `test` database, makes a production build and serves it on port 3100. If that server is already running locally, it reuses it.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and every push to `main`. It fails if any step fails.

- **Lint and type check:** `pnpm lint` and `pnpm typecheck`.
- **Build and test:** starts a Postgres service container, applies the migrations to it, then runs `pnpm build`, the integration tests and the Playwright tests. If a Playwright test fails, its traces are uploaded as an artifact.

CI needs no secrets. Its database exists only for the run, and it never connects to the `dev` or production databases.

## Deploying to Vercel

Import the repository into Vercel. `vercel.json` sets the build command to `pnpm run vercel-build` ([`scripts/vercel-build.sh`](scripts/vercel-build.sh)).

Set these environment variables in Vercel's scopes:

| Variable | Production | Preview | Development |
|---|---|---|---|
| `DATABASE_URL` | production, pooled | `dev`, pooled | `dev`, pooled |
| `DIRECT_URL` | production, direct | `dev`, direct | `dev`, direct |
| `PRODUCTION_DATABASE_HOST` | production host | production host | production host |

The test database URLs aren't needed on Vercel. The Development scope is what `vercel env pull` writes locally, so add the `TEST_*` variables to `.env.local` yourself.

**Migrations run automatically on merge to `main`.** Only Production builds run `prisma migrate deploy`, followed by a bootstrap that seeds the demo Board if the production database is empty (its first deploy) and otherwise does nothing. Preview builds never migrate, so a pull request that adds a migration needs it applied to the `dev` database (`pnpm db:migrate`) before its preview will work.

## Swapping the database provider

The app uses Prisma's generic `@prisma/adapter-pg` and no provider-specific features, so moving from Neon to Supabase or any other Postgres host takes no code changes:

1. Create the new databases and apply the migrations (`pnpm exec prisma migrate deploy` with `DIRECT_URL` pointing at each one, or `pnpm db:test:migrate` for `test`).
2. Change `DATABASE_URL` and `DIRECT_URL` (and the `TEST_*` URLs) in `.env.local` and in each Vercel scope.
3. Change `PRODUCTION_DATABASE_HOST` everywhere to the new production database's hostname.

## Learn more

- [`GLOSSARY.md`](GLOSSARY.md): the domain language.
- [`docs/adr/`](docs/adr/): architecture decision records.
