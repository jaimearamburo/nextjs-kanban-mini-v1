# Kanban Mini

A single, public, login-free kanban **Board**, inspired by Jira, built to show what Next.js 16 and React 19 can do end to end: Server Components with streaming, Server Actions, optimistic updates, transitions, caching and invalidation, and intercepting routes.

## What the demo shows

- **No sign-up.** Every visitor is a **Guest** with a generated name such as "Curious Otter", remembered per browser, and everyone works on the same Board.
- **Tasks** move through four fixed **Statuses** (To Do, In Progress, In Review, Done), shown as columns.
- **Drag and drop** between and within columns, with a Jira-style drop line showing where a card will land. Moves land instantly and roll back with a toast if saving fails.
- **Task detail** opens as a modal while the URL changes, like GitHub Projects. Priority, Status, Assignee and Labels each save on their own, optimistically, and **Comments** can be added and archived.
- **Label Filter** pills, kept in the URL so a filtered view can be shared.
- **Phones:** one column at a time with Status pills and swiping, long-press dragging, a "Move to…" menu, and Tasks opening as a full-screen sheet.
- **Demo controls** let a viewer add latency or force failures, so they can watch pending states, optimistic updates and rollbacks happen. They affect only that viewer's browser.
- Light, dark and system themes.
- Nothing is destroyed: Tasks and Comments are archived, never deleted.

The domain language (Board, Task, Rank, Guest, …) is defined in [`GLOSSARY.md`](GLOSSARY.md), and the key decisions are recorded in [`docs/adr/`](docs/adr/).

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
