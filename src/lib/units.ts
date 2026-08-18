/**
 * Central unit + VAT conversion. Everything internal is EUR/MWh, VAT-excluded.
 * The consumer-facing unit is c/kWh; VAT is applied only at presentation time.
 *
 *   1 EUR/MWh = 0.1 c/kWh    (1000 kWh per MWh, 100 cents per EUR)
 */

/** Finnish general VAT rate (electricity is taxed at the general rate). */
export const FINNISH_VAT = 0.255;

/** EUR/MWh → c/kWh (no VAT change). */
export function eurMWhToCentsPerKWh(eurMWh: number): number {
  return eurMWh / 10;
}

/** c/kWh → EUR/MWh (no VAT change). */
export function centsPerKWhToEurMWh(cents: number): number {
  return cents * 10;
}

/** Add VAT to a VAT-excluded value. */
export function withVat(value: number, rate: number): number {
  return value * (1 + rate);
}

/** Remove VAT from a VAT-included value. */
export function withoutVat(valueInclVat: number, rate: number): number {
  return valueInclVat / (1 + rate);
}

/**
 * Convert an internal EUR/MWh VAT0 price to the display value in c/kWh,
 * optionally with VAT applied. This is the single conversion the UI uses.
 */
export function displayCents(
  eurMWhVat0: number,
  opts: { vatIncluded: boolean; rate: number },
): number {
  const eurMWh = opts.vatIncluded ? withVat(eurMWhVat0, opts.rate) : eurMWhVat0;
  return eurMWhToCentsPerKWh(eurMWh);
}

/**
 * Format a c/kWh number for display with tabular-friendly fixed decimals.
 * Locale-aware (Finnish uses a comma decimal). Negative prices keep their sign
 * so the zero line stays meaningful.
 */
export function formatCents(cents: number, decimals = 2, locale = "en-GB"): string {
  // Avoid "-0.00"
  const v = Object.is(cents, -0) ? 0 : cents;
  return v.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
