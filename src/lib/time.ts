/**
 * Timezone-aware helpers for the Finnish (Europe/Helsinki) market day.
 * Electricity days are Finnish calendar days; timestamps from sources are UTC.
 * DST changes mean a "day" is not always 24h, so day boundaries are computed
 * via real timezone offsets rather than fixed arithmetic.
 */

export const TZ = "Europe/Helsinki";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

function readParts(ms: number) {
  const p = partsFmt.formatToParts(ms);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour"),
    min: get("minute"),
    s: get("second"),
  };
}

/** Milliseconds the given instant is offset from UTC in Europe/Helsinki. */
function tzOffsetMs(ms: number): number {
  const p = readParts(ms);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return asUtc - ms;
}

/** The Finnish calendar Y-M-D that the given instant falls on. */
export function helsinkiYmd(ms: number): Ymd {
  const p = readParts(ms);
  return { y: p.y, m: p.m, d: p.d };
}

/**
 * UTC milliseconds of Helsinki local midnight (00:00) for the given calendar
 * date. DST-safe: guesses with a naive offset, then refines once.
 */
export function helsinkiMidnightUtc({ y, m, d }: Ymd): number {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const off1 = tzOffsetMs(guess);
  let utc = guess - off1;
  const off2 = tzOffsetMs(utc);
  if (off2 !== off1) utc = guess - off2;
  return utc;
}

/** Add `n` calendar days to a Y-M-D (handles month/year rollover). */
export function addDays(ymd: Ymd, n: number): Ymd {
  const t = Date.UTC(ymd.y, ymd.m - 1, ymd.d + n);
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** Start (inclusive) and end (exclusive) UTC ms of the Finnish day containing `ms`. */
export function helsinkiDayRange(ms: number): { start: number; end: number } {
  const today = helsinkiYmd(ms);
  const start = helsinkiMidnightUtc(today);
  const end = helsinkiMidnightUtc(addDays(today, 1));
  return { start, end };
}

// ---------- Formatting (all rendered in Helsinki local time) ----------

// Locale-aware formatter cache. All formatters render in the Helsinki zone;
// only the locale (weekday/month names, decimal + time separators) varies.
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function getFmt(
  locale: string,
  kind: string,
  opts: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${kind}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

/** e.g. "Tue 18 Aug" / "ti 18. elok." */
export function fmtWeekdayDayMonth(ms: number, locale: string): string {
  return getFmt(locale, "wdm", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(ms);
}

/** e.g. "18:15" / "18.15" */
export function fmtTime(ms: number, locale: string): string {
  return getFmt(locale, "time", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ms);
}

/** e.g. "Wed 19" / "ke 19" - compact axis label for day boundaries */
export function fmtWeekdayDay(ms: number, locale: string): string {
  return getFmt(locale, "wd", { weekday: "short", day: "numeric" }).format(ms);
}

/** e.g. "18:15–18:30" (interval within, typically, one day) */
export function fmtInterval(
  startMs: number,
  endMs: number,
  locale: string,
): string {
  return `${fmtTime(startMs, locale)}–${fmtTime(endMs, locale)}`;
}

export function toMs(iso: string): number {
  return new Date(iso).getTime();
}
