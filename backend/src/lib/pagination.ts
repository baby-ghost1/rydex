/**
 * Pagination parsing lives in its own module so it can be unit tested without
 * pulling the Auth.js runtime into the test environment.
 */
function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export function parsePagination(url: string, defaultLimit = 12) {
  const { searchParams } = new URL(url);
  const page = Math.max(1, positiveInteger(searchParams.get("page"), 1));
  const limit = Math.min(50, Math.max(1, positiveInteger(searchParams.get("limit"), defaultLimit)));
  return { page, limit, skip: (page - 1) * limit };
}
