/**
 * Small scale/tick helpers for the hand-rolled chart. Kept dependency-free.
 */

/** Linear interpolation from a data domain to a pixel range. */
export function makeScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): (v: number) => number {
  const span = domainMax - domainMin || 1;
  return (v: number) =>
    rangeMin + ((v - domainMin) / span) * (rangeMax - rangeMin);
}

function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range || 1));
  const frac = (range || 1) / Math.pow(10, exp);
  let nice: number;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exp);
}

/**
 * "Nice" evenly-spaced tick values covering [min, max]. The step is derived
 * directly from the target count so the axis hugs the data (the top tick sits
 * just above the peak) rather than over-extending to the next decade. Always
 * includes a tick at 0 when the domain crosses it, so the zero line is clear.
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    const pad = Math.abs(min) || 1;
    min -= pad;
    max += pad;
  }
  const step = niceNum((max - min) / Math.max(1, count), true);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Guard against floating-point drift with a small epsilon and a hard cap.
  for (let v = start; v <= end + step * 0.5 && ticks.length < 100; v += step) {
    ticks.push(Math.abs(v) < step * 1e-6 ? 0 : v);
  }
  return ticks;
}
