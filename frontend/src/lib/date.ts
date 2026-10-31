/**
 * Returns a YYYY-MM-DD date in the user's local timezone.
 *
 * `toISOString()` always uses UTC, which can return yesterday's date for
 * users east of UTC during the first hours of the day.
 */
export function localDateISO(date: Date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function isPastLocalDate(value: string, now: Date = new Date()): boolean {
  return value < localDateISO(now);
}

export function formatLocalDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
