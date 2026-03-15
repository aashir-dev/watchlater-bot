import * as chrono from "chrono-node";

/**
 * Returns the current date/time shifted into the user's IANA timezone.
 * Uses Intl to extract local date parts without any third-party library.
 */
function nowInTimezone(timezone: string): {
  year: number;
  month: number; // 1-indexed
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun … 6=Sat
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    weekday: weekdayMap[weekdayStr] ?? 0,
  };
}

/**
 * Build a UTC timestamp (ms) for a given local date at a specific hour/minute
 * in the user's timezone.
 */
function localToUtcMs(
  timezone: string,
  year: number,
  month: number, // 1-indexed
  day: number,
  hour: number,
  minute = 0
): number {
  // ISO-like string that Intl can interpret as local time in the given zone
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const localIso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;

  // Find the UTC offset by formatting a reference UTC time and comparing
  // We rely on a small binary-search / offset trick via Intl.
  // Simpler: parse via Date constructor then subtract the tz offset.
  const naiveDate = new Date(localIso + "Z"); // pretend it's UTC first
  const offsetMs = getTimezoneOffsetMs(timezone, naiveDate);
  return naiveDate.getTime() - offsetMs;
}

/**
 * Returns timezone offset in ms for a given timezone at a given UTC instant.
 * Positive value means tz is ahead of UTC (e.g. IST = +5:30 → +19800000 ms).
 */
function getTimezoneOffsetMs(timezone: string, utcDate: Date): number {
  const utcStr = utcDate.toLocaleString("en-US", { timeZone: "UTC" });
  const localStr = utcDate.toLocaleString("en-US", { timeZone: timezone });
  const utcParsed = new Date(utcStr).getTime();
  const localParsed = new Date(localStr).getTime();
  return localParsed - utcParsed;
}

// ────────────────────────────────────────────────────────────────────────────
// Public helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tonight at 8:00 PM in the user's timezone.
 * If it's already past 8 PM, use tomorrow at 8 PM.
 */
export function getTonightTimestamp(timezone: string): number {
  const local = nowInTimezone(timezone);
  let { year, month, day } = local;

  // If already past 19:45 (15 min buffer), push to tomorrow
  if (local.hour >= 20) {
    const tomorrow = new Date(
      localToUtcMs(timezone, year, month, day, 0) + 24 * 60 * 60 * 1000
    );
    const tParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(tomorrow);
    const tGet = (type: string) =>
      Number(tParts.find((p) => p.type === type)?.value ?? 0);
    year = tGet("year");
    month = tGet("month");
    day = tGet("day");
  }

  return localToUtcMs(timezone, year, month, day, 20, 0);
}

/**
 * Tomorrow at 9:00 AM in the user's timezone.
 */
export function getTomorrowTimestamp(timezone: string): number {
  const local = nowInTimezone(timezone);
  const todayMidnightUtc = localToUtcMs(
    timezone,
    local.year,
    local.month,
    local.day,
    0
  );
  const tomorrowMidnightUtc = todayMidnightUtc + 24 * 60 * 60 * 1000;
  const tomorrow = new Date(tomorrowMidnightUtc);
  const tParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(tomorrow);
  const tGet = (type: string) =>
    Number(tParts.find((p) => p.type === type)?.value ?? 0);

  return localToUtcMs(timezone, tGet("year"), tGet("month"), tGet("day"), 9, 0);
}

/**
 * This Saturday at 10:00 AM in the user's timezone.
 * If today IS Saturday, use next Saturday.
 */
export function getThisWeekendTimestamp(timezone: string): number {
  const local = nowInTimezone(timezone);
  // weekday: 0=Sun,1=Mon,…,6=Sat
  const daysUntilSat = local.weekday === 6 ? 7 : (6 - local.weekday + 7) % 7 || 7;

  const todayMidnightUtc = localToUtcMs(
    timezone,
    local.year,
    local.month,
    local.day,
    0
  );
  const satMidnightUtc =
    todayMidnightUtc + daysUntilSat * 24 * 60 * 60 * 1000;
  const sat = new Date(satMidnightUtc);
  const sParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(sat);
  const sGet = (type: string) =>
    Number(sParts.find((p) => p.type === type)?.value ?? 0);

  return localToUtcMs(timezone, sGet("year"), sGet("month"), sGet("day"), 10, 0);
}

/**
 * Parse a free-form time string using chrono-node, anchored to "now" in the
 * user's IANA timezone. Returns a UTC millisecond timestamp, or null.
 *
 * WHY NOT `{ instant: now, timezone: offsetMinutes }`?
 * Chrono's `timezone` field shifts the *reference instant* into the given tz,
 * but the machine's runtime timezone also affects how chrono interprets `now`.
 * On a machine already in IST, passing `timezone: 330` applies the +5:30
 * shift twice — once by the JS runtime, once by chrono — producing a result
 * that is 5:30 hours too late.
 *
 * THE FIX — machine-timezone-independent:
 * 1. Get the user's current wall-clock via Intl (e.g. "00:27 AM IST on Mar 16")
 * 2. Construct a fake Date whose UTC values equal those wall-clock numbers,
 *    so chrono operates in "UTC mode" against the user's local wall clock.
 * 3. Parse without a `timezone` option — no runtime tz is involved.
 * 4. Read back the UTC components of the result (= user's local parsed time).
 * 5. Convert those local components to true UTC via localToUtcMs.
 */
export function parseCustomTime(
  text: string,
  timezone: string
): number | null {
  // Step 1 — user's current local wall clock
  const local = nowInTimezone(timezone);

  // Step 2 — fake reference: UTC clock == user's local clock
  const fakeRef = new Date(
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0)
  );

  // Step 3 — let chrono parse (no `timezone`; operates on UTC values)
  const parsed = chrono.parseDate(text, fakeRef, { forwardDate: true });
  if (!parsed) return null;

  // Step 4 — UTC components of result == user's local parsed wall-clock
  const py = parsed.getUTCFullYear();
  const pm = parsed.getUTCMonth() + 1; // 1-indexed
  const pd = parsed.getUTCDate();
  const ph = parsed.getUTCHours();
  const pmin = parsed.getUTCMinutes();

  // Step 5 — convert user's local wall-clock to true UTC
  return localToUtcMs(timezone, py, pm, pd, ph, pmin);
}
