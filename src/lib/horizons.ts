/**
 * View horizons and time-axis ticks. All horizons are calendar-anchored to the
 * Finnish day and start at today 00:00, so each view is "today + N days":
 * Today (0), Tomorrow (today + 1), Week (today + ~6). This makes the three views
 * directly comparable. Windows are clamped to the available data range.
 */
import {
  TZ,
  addDays,
  fmtTime,
  fmtWeekdayDay,
  helsinkiMidnightUtc,
  helsinkiYmd,
} from "./time.ts";

const H = 3_600_000;

export type HorizonKey = "today" | "tomorrow" | "week";

export const HORIZON_KEYS: HorizonKey[] = ["today", "tomorrow", "week"];

export interface Window {
  from: number;
  to: number;
}

/** Compute the visible [from, to] window for a horizon, clamped to data bounds. */
export function windowFor(
  key: HorizonKey,
  nowMs: number,
  dataStart: number,
  dataEnd: number,
): Window {
  const today = helsinkiYmd(nowMs);
  let from: number;
  let to: number;
  if (key === "today") {
    from = helsinkiMidnightUtc(today);
    to = helsinkiMidnightUtc(addDays(today, 1));
  } else if (key === "tomorrow") {
    // Today + tomorrow, so the view stays comparable with Today and Week.
    from = helsinkiMidnightUtc(today);
    to = helsinkiMidnightUtc(addDays(today, 2));
  } else {
    from = helsinkiMidnightUtc(today);
    to = dataEnd;
  }
  return {
    from: Math.max(from, dataStart),
    to: Math.min(to, dataEnd),
  };
}

export interface TimeTick {
  ms: number;
  label: string;
  /** Major ticks (day boundaries) get a date label and a stronger gridline. */
  major: boolean;
}

const hourInTz = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  hourCycle: "h23",
});

function helsinkiHour(ms: number): number {
  return Number(hourInTz.format(ms));
}

/** Time-axis ticks whose density adapts to the span. */
export function timeTicks(from: number, to: number, locale: string): TimeTick[] {
  const spanH = (to - from) / H;
  if (spanH <= 60) {
    const stepH = spanH <= 30 ? 3 : 6;
    return hourTicks(from, to, stepH, locale);
  }
  return dayTicks(from, to, locale);
}

function hourTicks(
  from: number,
  to: number,
  stepH: number,
  locale: string,
): TimeTick[] {
  const dayStart = helsinkiMidnightUtc(helsinkiYmd(from));
  const ticks: TimeTick[] = [];
  for (let ms = dayStart; ms <= to; ms += stepH * H) {
    if (ms < from) continue;
    const hour = helsinkiHour(ms);
    const major = hour === 0;
    ticks.push({
      ms,
      label: major ? fmtWeekdayDay(ms, locale) : fmtTime(ms, locale),
      major,
    });
  }
  return ticks;
}

function dayTicks(from: number, to: number, locale: string): TimeTick[] {
  let ymd = helsinkiYmd(from);
  const ticks: TimeTick[] = [];
  let ms = helsinkiMidnightUtc(ymd);
  if (ms < from) {
    ymd = addDays(ymd, 1);
    ms = helsinkiMidnightUtc(ymd);
  }
  while (ms <= to) {
    ticks.push({ ms, label: fmtWeekdayDay(ms, locale), major: true });
    ymd = addDays(ymd, 1);
    ms = helsinkiMidnightUtc(ymd);
  }
  return ticks;
}
