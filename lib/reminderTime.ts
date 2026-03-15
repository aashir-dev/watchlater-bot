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
 * user's timezone. Returns null if chrono-node can't parse it.
 */
export function parseCustomTime(
  text: string,
  timezone: string
): number | null {
  const parsed = chrono.parseDate(text, {
    instant: new Date(),
    timezone,
  });
  if (!parsed) return null;
  return parsed.getTime();
}
