/**
 * Source resolver. For each period, use the best available source following
 * the hierarchy: official → forecast (forward tier intentionally omitted).
 *
 * Official prices are authoritative and supersede any forecast for the same
 * period, so a refresh that brings new official data automatically upgrades a
 * period Forecast → Official with no frontend change. Forecast is kept only for
 * periods strictly after official coverage ends.
 */
import type { Observation } from "./types.ts";
import { toMs } from "./time.ts";

export interface ResolvedTimeline {
  observations: Observation[];
  officialEndsAt: string | null;
  forecastEndsAt: string | null;
}

/** Sort ascending by start; on duplicate start keep the freshest updatedAt. */
function dedupeSort(obs: Observation[]): Observation[] {
  const byStart = new Map<string, Observation>();
  for (const o of obs) {
    const prev = byStart.get(o.start);
    if (!prev || toMs(o.updatedAt) >= toMs(prev.updatedAt)) byStart.set(o.start, o);
  }
  return [...byStart.values()].sort((a, b) => toMs(a.start) - toMs(b.start));
}

export function resolveTimeline(
  official: Observation[],
  forecast: Observation[],
): ResolvedTimeline {
  const off = dedupeSort(official);
  const officialEndMs = off.reduce(
    (max, o) => Math.max(max, toMs(o.end)),
    Number.NEGATIVE_INFINITY,
  );
  const officialEndsAt = off.length
    ? new Date(officialEndMs).toISOString()
    : null;

  // Forecast only fills the future beyond official coverage.
  const fc = dedupeSort(forecast).filter((f) => toMs(f.start) >= officialEndMs);
  const forecastEndsAt = fc.length ? fc[fc.length - 1].end : null;

  const observations = [...off, ...fc].sort(
    (a, b) => toMs(a.start) - toMs(b.start),
  );
  return { observations, officialEndsAt, forecastEndsAt };
}
