/**
 * Shared domain types. Imported by both the ingestion pipeline (scripts/)
 * and the frontend (src/). The frontend knows nothing about source-specific
 * API formats — only these normalized shapes.
 *
 * Internal price unit is always EUR/MWh, VAT-excluded (VAT0). Presentation
 * conversion to c/kWh and VAT re-application happens centrally in units.ts.
 */

export type SourceType = "official" | "forecast" | "forward";

/** A single normalized price observation over a half-open interval [start, end). */
export interface Observation {
  /** ISO-8601 UTC instant, inclusive start of the interval. */
  start: string;
  /** ISO-8601 UTC instant, exclusive end of the interval. */
  end: string;
  /** Price in EUR/MWh, VAT-excluded. */
  priceEurMWh: number;
  type: SourceType;
  /** ISO-8601 duration, e.g. "PT15M" or "PT60M". */
  resolution: string;
  /** Human-facing source label, e.g. "Nord Pool" or "nordpool-predict-fi". */
  source: string;
  /** ISO-8601 UTC instant when this value was fetched/produced. */
  updatedAt: string;
  /** Optional lower prediction bound (EUR/MWh, VAT0), e.g. P10. */
  lowEurMWh?: number;
  /** Optional upper prediction bound (EUR/MWh, VAT0), e.g. P90. */
  highEurMWh?: number;
}

/** data/timeline.json — the resolved, coherent curve the frontend renders. */
export interface Timeline {
  /** ISO-8601 UTC instant this file was generated. */
  generatedAt: string;
  /** VAT rate the source data used and which we re-apply for display, e.g. 0.255. */
  vatRate: number;
  /** Observations sorted ascending by start; official first, then forecast. */
  observations: Observation[];
}

export interface SourceCredit {
  id: string;
  label: string;
  url: string;
  license: string;
}

/** data/status.json — the at-a-glance headline figures. */
export interface Status {
  updatedAt: string;
  /** "Now" instant used when the file was generated (ISO-8601 UTC). */
  now: string;
  vatRate: number;
  /** Price of the interval containing "now", EUR/MWh VAT0, or null if unknown. */
  currentPriceEurMWh: number | null;
  /** Average across the Finnish calendar "today", EUR/MWh VAT0, or null. */
  todayAverageEurMWh: number | null;
  /** Average across the Finnish calendar "tomorrow", EUR/MWh VAT0, or null. */
  tomorrowAverageEurMWh: number | null;
  /** Whether tomorrow's average is backed by official prices or forecast. */
  tomorrowType: SourceType | null;
  /** End instant of the last official observation (ISO-8601 UTC), or null. */
  officialEndsAt: string | null;
  /** End instant of the last forecast observation (ISO-8601 UTC), or null. */
  forecastEndsAt: string | null;
  sources: SourceCredit[];
}

/** data/observations.json — internal accumulated official store (merge target). */
export interface ObservationStore {
  updatedAt: string;
  /** Accumulated official observations, sorted ascending by start. */
  observations: Observation[];
}
