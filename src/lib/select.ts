/**
 * Selection helpers shared by the chart and the app so the highlighted point
 * and the readout always refer to the same observation.
 */
import type { Observation } from "./types.ts";
import { toMs } from "./time.ts";

export const centerMs = (o: Observation): number =>
  (toMs(o.start) + toMs(o.end)) / 2;

/** Index of the observation containing `ms`, else the nearest by center. */
export function indexAt(list: Observation[], ms: number): number {
  if (!list.length) return -1;
  const contains = list.findIndex(
    (o) => toMs(o.start) <= ms && ms < toMs(o.end),
  );
  if (contains >= 0) return contains;
  let best = 0;
  let bestD = Infinity;
  list.forEach((o, i) => {
    const d = Math.abs(centerMs(o) - ms);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** The observation containing `ms`, else the nearest, or null if list empty. */
export function obsAt(list: Observation[], ms: number): Observation | null {
  const i = indexAt(list, ms);
  return i >= 0 ? list[i] : null;
}
