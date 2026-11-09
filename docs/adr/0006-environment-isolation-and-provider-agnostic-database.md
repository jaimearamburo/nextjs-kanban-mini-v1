# Environment isolation and a provider-agnostic database

Nothing outside production may ever touch production services, and the database provider must be swappable (e.g. from Neon to Supabase) without code changes.

## Database

- To the app, a database is just two connection strings: `DATABASE_URL` (pooled, used at runtime) and `DIRECT_URL` (used by migrations).
- We use Prisma's generic `@prisma/adapter-pg`, not `@prisma/adapter-neon`. We run on the Node.js runtime, where the generic driver has no real performance cost, and it works with any Postgres provider.
- We use no provider-specific features: no per-preview database branching, no provider APIs in scripts, no provider-specific extensions.
- The Rank column uses an explicit `"C"` collation, so ordering doesn't depend on the provider's default collation.

## Environments

| Environment | Database |
|---|---|
| Production (`main`) | Production database. Its URL exists only in Vercel's Production scope. |
| Local development and Vercel previews | The `dev` database, currently a free Neon branch. |
| Local integration tests | A disposable `test` database, currently a free Neon branch. |
| CI | A GitHub Actions Postgres service container. |

## Migrations

Only Production builds run `prisma migrate deploy`, so merging to `main` migrates production automatically. Developers migrate the dev database locally. Previews never run migrations.

## Guards

- A Zod-validated env module crashes at startup if any environment other than production is configured with the production database host (`PRODUCTION_DATABASE_HOST`, not secret), and if production is configured with anything else.
- The reset and seed scripts refuse the production host and require an explicit opt-in.

## Considered options

Neon's protected branches were not an option because they are a paid feature.
