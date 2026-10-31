import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

/**
 * Standalone backend processes (seed, create-admin, Socket.IO) run with the
 * backend workspace as their cwd. The single source of truth for configuration
 * is the repository-level .env, so walk up until we find it.
 */
function findRepoRoot(startDir: string) {
  let current = path.resolve(startDir);
  while (current !== path.dirname(current)) {
    if (
      existsSync(path.join(current, ".env")) &&
      existsSync(path.join(current, "package.json"))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  return path.resolve(startDir);
}

let cachedRoot: string | null = null;

export function loadRootEnv() {
  if (cachedRoot) return cachedRoot;
  const root = findRepoRoot(process.cwd());
  loadEnvConfig(root, process.env.NODE_ENV !== "production");
  cachedRoot = root;
  return root;
}

export function repoRoot() {
  return cachedRoot ?? loadRootEnv();
}

// Importing this module is enough: it runs before any entrypoint module that
// reads process.env at module scope.
loadRootEnv();
