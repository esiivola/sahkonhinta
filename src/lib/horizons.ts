/**
 * View horizons and time-axis ticks. Horizons are rolling windows anchored to
 * "now", weighted toward the future because the service is about the price
 * going forward. Windows are clamped to the available data range so we never
 * render empty space beyond the forecast or before the earliest observation.
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

export type HorizonKey = "24h" | "48h" | "7d";

export interface Horizon {
  key: HorizonKey;
  label: string;
  hoursPast: number;
  hoursFuture: number;
}

export const HORIZONS: Horizon[] = [
  { key: "24h", label: "24 h", hoursPast: 4, hoursFuture: 20 },
  { key: "48h", label: "48 h", hoursPast: 8, hoursFuture: 40 },
  { key: "7d", label: "7 d", hoursPast: 24, hoursFuture: 24 * 6 },
];

export interface Window {
  from: number;
  to: number;
}

/** Compute the visible [from, to] window for a horizon, clamped to data bounds. */
export function windowFor(
  horizon: Horizon,
  nowMs: number,
  dataStart: number,
  dataEnd: number,
): Window {
  const from = Math.max(nowMs - horizon.hoursPast * H, dataStart);
  const to = Math.min(nowMs + horizon.hoursFuture * H, dataEnd);
  return { from, to };
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
export function timeTicks(from: number, to: number): TimeTick[] {
  const spanH = (to - from) / H;
  if (spanH <= 60) {
    const stepH = spanH <= 30 ? 3 : 6;
    return hourTicks(from, to, stepH);
  }
  return dayTicks(from, to);
}

function hourTicks(from: number, to: number, stepH: number): TimeTick[] {
  const dayStart = helsinkiMidnightUtc(helsinkiYmd(from));
  const ticks: TimeTick[] = [];
  for (let ms = dayStart; ms <= to; ms += stepH * H) {
    if (ms < from) continue;
    const hour = helsinkiHour(ms);
    const major = hour === 0;
    ticks.push({
      ms,
      label: major ? fmtWeekdayDay(ms) : fmtTime(ms),
      major,
    });
  }
  return ticks;
}

function dayTicks(from: number, to: number): TimeTick[] {
  let ymd = helsinkiYmd(from);
  const ticks: TimeTick[] = [];
  // Advance until the first midnight >= from.
  let ms = helsinkiMidnightUtc(ymd);
  if (ms < from) {
    ymd = addDays(ymd, 1);
    ms = helsinkiMidnightUtc(ymd);
  }
  while (ms <= to) {
    ticks.push({ ms, label: fmtWeekdayDay(ms), major: true });
    ymd = addDays(ymd, 1);
    ms = helsinkiMidnightUtc(ymd);
  }
  return ticks;
}
