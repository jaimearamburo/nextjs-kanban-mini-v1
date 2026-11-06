import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
    environment: "node",
    // Integration tests share one disposable `test` database, so test files
    // run one at a time and each starts from an empty database.
    fileParallelism: false,
    setupFiles: ["./test/setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
