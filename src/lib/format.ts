/**
 * Presentation helpers that combine time + unit formatting for the readout and
 * the accessible (screen-reader) description. Language- and locale-aware.
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

export interface Readout {
  day: string; // "ti 18. elok."
  interval: string; // "18.15–18.30"
  price: string; // "8,42"
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
  const vatText = vat.vatIncluded ? s.vatInclShort : s.vatExclShort;

  const aria = `${day}, ${interval}. ${price} ${s.ariaUnit} ${vatText}.`;

  return { day, interval, price, aria };
}
