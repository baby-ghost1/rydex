import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const resolveFromRoot = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@rydex/backend": resolveFromRoot("./backend/src"),
      "@rydex/shared": resolveFromRoot("./shared/src"),
      "@": resolveFromRoot("./frontend/src"),
    },
  },
  test: {
    environment: "node",
    include: ["backend/src/**/*.test.ts", "shared/src/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
