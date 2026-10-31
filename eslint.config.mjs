import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      // The Next.js app lives in the frontend workspace rather than at the
      // repository root.
      next: {
        rootDir: "frontend",
      },
    },
  },
  {
    rules: {
      // RYDEX intentionally loads dashboard data from client effects and
      // hydrates list filters from the URL on mount. The React Compiler rule
      // flags those synchronization patterns, so keep the remaining compiler
      // checks strict without failing on data fetching.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Local development artifacts and generated files:
    "**/node_modules/**",
    "coverage/**",
    "frontend/public/uploads/**",
    "frontend/.mail-outbox/**",
    "**/*.tsbuildinfo",
  ]),
]);

export default eslintConfig;
