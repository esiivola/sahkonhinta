/**
 * Short-term forecast from nordpool-predict-fi (MIT-licensed, freely
 * redistributable). Format: [[unix_ms, price_c_per_kWh_incl_VAT], ...], hourly,
 * ~7 days ahead. Normalized to EUR/MWh VAT0 Observations.
 *
 * There is no P10/P90 in this free feed, so no low/high bounds are set. The
 * schema still carries optional low/high, so a percentile source could later
 * populate a real prediction band with no frontend change.
 */
import { z } from "zod";
import type { Observation } from "../src/lib/types.ts";
import { FINNISH_VAT, centsPerKWhToEurMWh, withoutVat } from "../src/lib/units.ts";
import { fetchJson } from "./http.ts";

const FORECAST_URL =
  "https://raw.githubusercontent.com/vividfog/nordpool-predict-fi/main/deploy/prediction.json";

const HOUR = 3_600_000;

const ForecastSchema = z
  .array(z.tuple([z.number(), z.number()]))
  .min(1);

export async function fetchForecast(nowIso: string): Promise<Observation[]> {
  const raw = await fetchJson(FORECAST_URL);
  const points = ForecastSchema.parse(raw)
    .filter(([ms, price]) => Number.isFinite(ms) && Number.isFinite(price))
    .sort((a, b) => a[0] - b[0]);

  return points.map(([ms, centsInclVat], i): Observation => {
    const next = points[i + 1]?.[0];
    // Infer interval length from the next point (handles hourly or finer);
    // fall back to one hour at the end of the series.
    const step = next && next - ms <= 2 * HOUR ? next - ms : HOUR;
    const eurMWhVat0 = centsPerKWhToEurMWh(withoutVat(centsInclVat, FINNISH_VAT));
    const stepMin = Math.round(step / 60_000);
    return {
      start: new Date(ms).toISOString(),
      end: new Date(ms + step).toISOString(),
      priceEurMWh: Math.round(eurMWhVat0 * 1e4) / 1e4,
      type: "forecast",
      resolution: `PT${stepMin}M`,
      source: "nordpool-predict-fi",
      updatedAt: nowIso,
    };
  });
}
