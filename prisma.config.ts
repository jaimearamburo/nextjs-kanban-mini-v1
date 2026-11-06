import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Locally, connection strings live in .env.local. On Vercel they come from the
// environment, and dotenv never overrides variables that are already set.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma migrate reset` asks for confirmation before it seeds.
    seed: "tsx scripts/seed.ts --yes",
  },
  datasource: {
    // Migrations use the direct (non-pooled) connection. See ADR-0006.
    url: process.env.DIRECT_URL,
  },
});
