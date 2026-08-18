/**
 * Official day-ahead prices, normalized to EUR/MWh VAT0 Observations.
 *
 * Primary source: porssisahko.net v2 (no API key, native 15-minute, VAT-inclusive
 * snt/kWh). This is Nord Pool / ENTSO-E day-ahead data behind a clean JSON API.
 *
 * Optional source: ENTSO-E Transparency Platform A44 (authoritative, EUR/MWh).
 * Enabled only when ENTSO_E_TOKEN is set; otherwise skipped entirely.
 */
import { z } from "zod";
import type { Observation } from "../src/lib/types.ts";
import { FINNISH_VAT, centsPerKWhToEurMWh, withoutVat } from "../src/lib/units.ts";
import { fetchJson, fetchText } from "./http.ts";

const PORSSISAHKO_URL = "https://api.porssisahko.net/v2/latest-prices.json";
const FI_EIC = "10YFI-1--------U";
const ENTSOE_BASE = "https://web-api.tp.entsoe.eu/api";

// ---------- porssisahko.net (primary) ----------

const PorssiSchema = z.object({
  prices: z
    .array(
      z.object({
        price: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .min(1),
});

/** Fetch and normalize porssisahko.net v2 prices (VAT-inclusive snt/kWh → EUR/MWh VAT0). */
export async function fetchPorssisahko(nowIso: string): Promise<Observation[]> {
  const raw = await fetchJson(PORSSISAHKO_URL);
  const data = PorssiSchema.parse(raw);

  return data.prices.map((p) => {
    const startMs = new Date(p.startDate).getTime();
    const endMs = new Date(p.endDate).getTime();
    // endDate is inclusive (…:59.999Z); +1ms gives the true interval length.
    const durationMin = Math.round((endMs - startMs + 1) / 60_000);
    const resolution = durationMin >= 45 ? "PT60M" : "PT15M";
    const end = new Date(startMs + durationMin * 60_000).toISOString();
    const eurMWhVat0 = centsPerKWhToEurMWh(withoutVat(p.price, FINNISH_VAT));
    return {
      start: new Date(startMs).toISOString(),
      end,
      priceEurMWh: round(eurMWhVat0, 4),
      type: "official",
      resolution,
      source: "Nord Pool",
      updatedAt: nowIso,
    } satisfies Observation;
  });
}

// ---------- ENTSO-E A44 (optional) ----------

/**
 * Fetch and normalize ENTSO-E day-ahead prices for the given UTC window.
 * Best-effort XML parse of the documented Publication_MarketDocument structure:
 * iterate every TimeSeries/Period, read its own resolution, and compute each
 * point's timestamp from Period.timeInterval.start + (position-1)*resolution.
 * Sparse points (repeated prices omitted) are carried forward.
 */
export async function fetchEntsoe(
  token: string,
  periodStart: string, // yyyyMMddHHmm UTC
  periodEnd: string, // yyyyMMddHHmm UTC
  nowIso: string,
): Promise<Observation[]> {
  const url =
    `${ENTSOE_BASE}?securityToken=${encodeURIComponent(token)}` +
    `&documentType=A44&in_Domain=${FI_EIC}&out_Domain=${FI_EIC}` +
    `&periodStart=${periodStart}&periodEnd=${periodEnd}`;

  // A44 "no data" is returned as HTTP 400 with an Acknowledgement doc.
  const xml = await fetchText(url, { emptyStatuses: [400] });
  if (!xml || xml.includes("Acknowledgement_MarketDocument")) return [];

  const out: Observation[] = [];
  for (const period of matchAll(xml, /<Period>([\s\S]*?)<\/Period>/g)) {
    const startIso = first(period, /<start>(.*?)<\/start>/);
    const resolution = first(period, /<resolution>(.*?)<\/resolution>/);
    if (!startIso || !resolution) continue;
    const stepMin = resolution.includes("PT15M")
      ? 15
      : resolution.includes("PT30M")
        ? 30
        : 60;
    const periodStartMs = new Date(startIso).getTime();

    let lastPrice: number | null = null;
    let lastPos = 0;
    for (const pt of matchAll(period, /<Point>([\s\S]*?)<\/Point>/g)) {
      const pos = Number(first(pt, /<position>(\d+)<\/position>/));
      const price = Number(first(pt, /<price\.amount>([-\d.]+)<\/price\.amount>/));
      if (!Number.isFinite(pos) || !Number.isFinite(price)) continue;
      // Carry the previous price forward across any skipped positions.
      for (let fill = lastPos + 1; fill < pos && lastPrice !== null; fill++) {
        out.push(pointObs(periodStartMs, fill, stepMin, lastPrice, nowIso));
      }
      out.push(pointObs(periodStartMs, pos, stepMin, price, nowIso));
      lastPrice = price;
      lastPos = pos;
    }
  }
  return out;
}

function pointObs(
  periodStartMs: number,
  position: number,
  stepMin: number,
  priceEurMWhInclNothing: number,
  nowIso: string,
): Observation {
  const startMs = periodStartMs + (position - 1) * stepMin * 60_000;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + stepMin * 60_000).toISOString(),
    priceEurMWh: round(priceEurMWhInclNothing, 4), // ENTSO-E is already EUR/MWh VAT0
    type: "official",
    resolution: `PT${stepMin}M`,
    source: "ENTSO-E",
    updatedAt: nowIso,
  };
}

// ---------- helpers ----------

function* matchAll(s: string, re: RegExp): Generator<string> {
  for (const m of s.matchAll(re)) yield m[1];
}
function first(s: string, re: RegExp): string | null {
  return s.match(re)?.[1] ?? null;
}
function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
