/**
 * Presentation helpers that combine time + unit formatting for the readout and
 * the accessible (screen-reader) descriptions. Keeps the source-type labelling
 * in one place so the visual badge and the aria-live text never disagree.
 */
import type { Observation } from "./types.ts";
import { displayCents, formatCents } from "./units.ts";
import { fmtInterval, fmtWeekdayDayMonth, toMs } from "./time.ts";

export interface VatOpts {
  vatIncluded: boolean;
  rate: number;
}

/** e.g. "8.42" (c/kWh, VAT applied per opts). */
export function priceText(
  eurMWhVat0: number,
  opts: VatOpts,
  decimals = 2,
): string {
  return formatCents(displayCents(eurMWhVat0, opts), decimals);
}

export function sourceTypeLabel(type: Observation["type"]): string {
  if (type === "official") return "Official";
  if (type === "forecast") return "Forecast";
  return "Market forward";
}

export interface Readout {
  /** "Tue 18 Aug" */
  day: string;
  /** "18:15–18:30" */
  interval: string;
  /** "8.42" */
  price: string;
  /** "Official" | "Forecast" */
  typeLabel: string;
  /** "Nord Pool" */
  source: string;
  /** Optional P10–P90 band text if the observation carries bounds. */
  band?: string;
  /** Full sentence for aria-live. */
  aria: string;
}

export function describe(obs: Observation, opts: VatOpts): Readout {
  const startMs = toMs(obs.start);
  const endMs = toMs(obs.end);
  const day = fmtWeekdayDayMonth(startMs);
  const interval = fmtInterval(startMs, endMs);
  const price = priceText(obs.priceEurMWh, opts);
  const typeLabel = sourceTypeLabel(obs.type);
  const vatText = opts.vatIncluded ? "incl. VAT" : "excl. VAT";

  let band: string | undefined;
  if (obs.lowEurMWh !== undefined && obs.highEurMWh !== undefined) {
    band = `P10–P90: ${priceText(obs.lowEurMWh, opts)}–${priceText(obs.highEurMWh, opts)}`;
  }

  const aria =
    `${day}, ${interval}. ${price} cents per kilowatt-hour ${vatText}. ` +
    `${typeLabel}, ${obs.source}.` +
    (band ? ` ${band}.` : "");

  return { day, interval, price, typeLabel, source: obs.source, band, aria };
}
