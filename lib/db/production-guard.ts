/**
 * Refuses to touch the production database from anywhere but production
 * (ADR-0006). Hosts are compared without Neon-style "-pooler" suffixes, so the
 * pooled and direct hosts of the same database both match.
 */
export function assertNotProductionDatabase(
  connectionString: string,
  productionHost: string | undefined,
): void {
  if (!productionHost) {
    throw new Error(
      "PRODUCTION_DATABASE_HOST is not set, so the production database can't be ruled out. Refusing to run.",
    );
  }
  const host = new URL(connectionString).hostname;
  if (normalizeHost(host) === normalizeHost(productionHost)) {
    throw new Error(
      `Refusing to run against the production database host (${host}).`,
    );
  }
}

function normalizeHost(host: string): string {
  const [first, ...rest] = host.trim().toLowerCase().split(".");
  return [first.replace(/-pooler$/, ""), ...rest].join(".");
}
