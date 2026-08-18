/**
 * Presentation helpers that combine time + unit formatting for the readout and
 * the accessible (screen-reader) descriptions. Language- and locale-aware so the
 * visual badge and the aria-live text never disagree.
 */
import type { Observation } from "./types.ts";
import type { Strings } from "./i18n.ts";
import { displayCents, formatCents } from "./units.ts";
import { fmtInterval, fmtWeekdayDayMonth, toMs } from "./time.ts";

export interface VatOpts {
  vatIncluded: boolean;
  rate: number;
}

/** e.g. "8.42" / "8,42" (c/kWh, VAT applied per opts). */
export function priceText(
  eurMWhVat0: number,
  opts: VatOpts,
  locale: string,
  decimals = 2,
): string {
  return formatCents(displayCents(eurMWhVat0, opts), decimals, locale);
}

export function sourceTypeLabel(type: Observation["type"], s: Strings): string {
  if (type === "forecast") return s.forecast;
  return s.official;
}

export interface Readout {
  day: string; // "Tue 18 Aug" / "ti 18. elok."
  interval: string; // "18:15–18:30"
  price: string; // "8.42" / "8,42"
  typeLabel: string; // "Official" / "Virallinen"
  source: string; // "Nord Pool"
  band?: string; // P10–P90 band text if the observation carries bounds
  aria: string; // full sentence for aria-live
}

export function describe(
  obs: Observation,
  vat: VatOpts,
  s: Strings,
  locale: string,
): Readout {
  const startMs = toMs(obs.start);
  const endMs = toMs(obs.end);
  const day = fmtWeekdayDayMonth(startMs, locale);
  const interval = fmtInterval(startMs, endMs, locale);
  const price = priceText(obs.priceEurMWh, vat, locale);
  const typeLabel = sourceTypeLabel(obs.type, s);
  const vatText = vat.vatIncluded ? s.vatInclShort : s.vatExclShort;

  let band: string | undefined;
  if (obs.lowEurMWh !== undefined && obs.highEurMWh !== undefined) {
    band =
      `P10–P90: ${priceText(obs.lowEurMWh, vat, locale)}–` +
      `${priceText(obs.highEurMWh, vat, locale)}`;
  }

  const aria =
    `${day}, ${interval}. ${price} ${s.ariaUnit} ${vatText}. ` +
    `${typeLabel}, ${obs.source}.` +
    (band ? ` ${band}.` : "");

  return { day, interval, price, typeLabel, source: obs.source, band, aria };
}
