/**
 * Ingestion orchestrator (runs in GitHub Actions and locally):
 *
 *   fetch official + forecast
 *   → merge official into the accumulated, pruned store
 *   → resolve the coherent official→forecast timeline
 *   → compute headline status
 *   → write public/data/{observations,timeline,status}.json
 *
 * The accumulated store is what lets us retain "yesterday/today" without a
 * historical API: each run merges freshly-fetched official prices into a
 * committed JSON file. No credentials are required; ENTSO_E_TOKEN is optional.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  Observation,
  ObservationStore,
  SourceCredit,
  Status,
  Timeline,
} from "../src/lib/types.ts";
import { FINNISH_VAT } from "../src/lib/units.ts";
import { resolveTimeline } from "../src/lib/resolver.ts";
import { helsinkiDayRange, addDays, helsinkiYmd, helsinkiMidnightUtc, toMs } from "../src/lib/time.ts";
import { fetchForecast } from "./fetch-forecast.ts";
import { fetchEntsoe, fetchPorssisahko } from "./fetch-official.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "public", "data");
const STORE_PATH = join(DATA_DIR, "observations.json");
const TIMELINE_PATH = join(DATA_DIR, "timeline.json");
const STATUS_PATH = join(DATA_DIR, "status.json");

const RETENTION_DAYS = 45;
const DAY = 86_400_000;

const SOURCES: SourceCredit[] = [
  {
    id: "official",
    label: "Day-ahead prices: Nord Pool / ENTSO-E via porssisahko.net",
    url: "https://porssisahko.net/api",
    license: "ENTSO-E Transparency Platform (attribution required)",
  },
  {
    id: "forecast",
    label: "Forecast: nordpool-predict-fi",
    url: "https://github.com/vividfog/nordpool-predict-fi",
    license: "MIT",
  },
];

async function main(): Promise<void> {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // ---- Fetch official (resilient: any one source may fail) ----
  const official: Observation[] = [];
  const problems: string[] = [];

  try {
    const p = await fetchPorssisahko(nowIso);
    official.push(...p);
    log(`porssisahko.net: ${p.length} official points`);
  } catch (err) {
    problems.push(`porssisahko: ${String(err)}`);
  }

  const token = process.env.ENTSO_E_TOKEN;
  if (token) {
    try {
      const start = fmtEntsoe(nowMs - 2 * DAY);
      const end = fmtEntsoe(nowMs + 2 * DAY);
      const e = await fetchEntsoe(token, start, end, nowIso);
      official.push(...e);
      log(`ENTSO-E: ${e.length} official points`);
    } catch (err) {
      problems.push(`entsoe: ${String(err)}`);
    }
  }

  // ---- Fetch forecast ----
  let forecast: Observation[] = [];
  try {
    forecast = await fetchForecast(nowIso);
    log(`nordpool-predict-fi: ${forecast.length} forecast points`);
  } catch (err) {
    problems.push(`forecast: ${String(err)}`);
  }

  // ---- Merge official into accumulated store ----
  const existing = readStore();
  const store = mergeStore(existing, official, nowMs);
  log(`store: ${store.length} accumulated official points (was ${existing.length})`);

  if (store.length === 0 && forecast.length === 0) {
    console.error("No data from any source. Problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  if (problems.length) console.warn("Warnings:\n  " + problems.join("\n  "));

  // ---- Resolve coherent timeline ----
  const resolved = resolveTimeline(store, forecast);

  const timeline: Timeline = {
    generatedAt: nowIso,
    vatRate: FINNISH_VAT,
    observations: resolved.observations,
  };

  const status: Status = {
    updatedAt: nowIso,
    now: nowIso,
    vatRate: FINNISH_VAT,
    currentPriceEurMWh: priceAt(resolved.observations, nowMs),
    todayAverageEurMWh: averageOver(
      resolved.observations,
      helsinkiDayRange(nowMs).start,
      helsinkiDayRange(nowMs).end,
    ),
    tomorrowAverageEurMWh: null,
    tomorrowType: null,
    officialEndsAt: resolved.officialEndsAt,
    forecastEndsAt: resolved.forecastEndsAt,
    sources: SOURCES,
  };

  // Tomorrow (Finnish calendar) average + whether it's official or forecast.
  const tomorrowYmd = addDays(helsinkiYmd(nowMs), 1);
  const tStart = helsinkiMidnightUtc(tomorrowYmd);
  const tEnd = helsinkiMidnightUtc(addDays(tomorrowYmd, 1));
  status.tomorrowAverageEurMWh = averageOver(resolved.observations, tStart, tEnd);
  status.tomorrowType = coverageType(resolved.observations, tStart, tEnd);

  // ---- Write ----
  mkdirSync(DATA_DIR, { recursive: true });
  const outStore: ObservationStore = { updatedAt: nowIso, observations: store };
  writeJson(STORE_PATH, outStore);
  writeJson(TIMELINE_PATH, timeline);
  writeJson(STATUS_PATH, status);

  log(
    `wrote timeline (${resolved.observations.length} pts), ` +
      `official ends ${resolved.officialEndsAt ?? "—"}, ` +
      `forecast ends ${resolved.forecastEndsAt ?? "—"}`,
  );
}

// ---------- store merge ----------

function readStore(): Observation[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as ObservationStore;
    return Array.isArray(parsed.observations) ? parsed.observations : [];
  } catch {
    return [];
  }
}

/** Merge fresh official over the store (freshest per start), prune, sort. */
function mergeStore(
  existing: Observation[],
  fresh: Observation[],
  nowMs: number,
): Observation[] {
  const byStart = new Map<string, Observation>();
  for (const o of existing) byStart.set(o.start, o);
  for (const o of fresh) {
    const prev = byStart.get(o.start);
    if (!prev || toMs(o.updatedAt) >= toMs(prev.updatedAt)) byStart.set(o.start, o);
  }
  const cutoff = nowMs - RETENTION_DAYS * DAY;
  return [...byStart.values()]
    .filter((o) => toMs(o.end) >= cutoff)
    .sort((a, b) => toMs(a.start) - toMs(b.start));
}

// ---------- status computation ----------

function priceAt(obs: Observation[], ms: number): number | null {
  const hit = obs.find((o) => toMs(o.start) <= ms && ms < toMs(o.end));
  return hit ? hit.priceEurMWh : null;
}

function averageOver(obs: Observation[], from: number, to: number): number | null {
  const inRange = obs.filter((o) => toMs(o.start) < to && toMs(o.end) > from);
  if (!inRange.length) return null;
  const sum = inRange.reduce((s, o) => s + o.priceEurMWh, 0);
  return Math.round((sum / inRange.length) * 1e4) / 1e4;
}

/** "official" if every covering point is official, else "forecast", else null. */
function coverageType(
  obs: Observation[],
  from: number,
  to: number,
): "official" | "forecast" | null {
  const inRange = obs.filter((o) => toMs(o.start) < to && toMs(o.end) > from);
  if (!inRange.length) return null;
  return inRange.every((o) => o.type === "official") ? "official" : "forecast";
}

// ---------- misc ----------

function fmtEntsoe(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
  );
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function log(msg: string): void {
  console.log(`[build-data] ${msg}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
