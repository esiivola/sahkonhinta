import type { Observation } from "../lib/types.ts";
import type { Strings } from "../lib/i18n.ts";
import type { HorizonKey } from "../lib/horizons.ts";
import { priceText, type VatOpts } from "../lib/format.ts";
import { fmtTime, fmtWeekdayDay, toMs } from "../lib/time.ts";

interface Props {
  currentPriceEurMWh: number | null;
  vis: Observation[];
  horizon: HorizonKey;
  /** Tomorrow's average, computed client-side relative to the real clock. */
  tomorrow: { avgEurMWh: number; official: boolean } | null;
  vat: VatOpts;
  s: Strings;
  locale: string;
}

function mean(obs: Observation[]): number | null {
  if (!obs.length) return null;
  return obs.reduce((sum, o) => sum + o.priceEurMWh, 0) / obs.length;
}

function extreme(obs: Observation[], dir: "min" | "max"): Observation | null {
  if (!obs.length) return null;
  return obs.reduce((best, o) =>
    dir === "min"
      ? o.priceEurMWh < best.priceEurMWh
        ? o
        : best
      : o.priceEurMWh > best.priceEurMWh
        ? o
        : best,
  );
}

/**
 * Newspaper-style header: a prominent live current price plus one concise,
 * horizon-aware summary line (average + cheapest/priciest, tomorrow on Today).
 * Replaces the boxed stat tiles — everything present, less chrome.
 */
export function PriceSummary({
  currentPriceEurMWh,
  vis,
  horizon,
  tomorrow,
  vat,
  s,
  locale,
}: Props) {
  const now =
    currentPriceEurMWh !== null ? priceText(currentPriceEurMWh, vat, locale) : "—";

  const avg = mean(vis);
  const isWeek = horizon === "week";

  let avgLine = "";
  if (avg !== null) {
    avgLine = s.summaryAverage(horizon, priceText(avg, vat, locale, 1));
    if (isWeek) avgLine += ` · ${s.weekIncludesForecast}`;
    else if (horizon === "today" && tomorrow) {
      avgLine += s.summaryTomorrow(
        priceText(tomorrow.avgEurMWh, vat, locale, 1),
        tomorrow.official,
      );
    }
  }

  // Cheapest / priciest — only for single-day views where a time is meaningful.
  let extremesLine = "";
  if (!isWeek) {
    const lo = extreme(vis, "min");
    const hi = extreme(vis, "max");
    if (lo && hi) {
      extremesLine = s.summaryExtremes(
        fmtTime(toMs(lo.start), locale),
        priceText(lo.priceEurMWh, vat, locale, 1),
        fmtTime(toMs(hi.start), locale),
        priceText(hi.priceEurMWh, vat, locale, 1),
      );
    }
  } else {
    // Week: name the day of the extreme so times aren't ambiguous.
    const lo = extreme(vis, "min");
    const hi = extreme(vis, "max");
    if (lo && hi) {
      extremesLine = s.summaryExtremes(
        `${fmtWeekdayDay(toMs(lo.start), locale)} ${fmtTime(toMs(lo.start), locale)}`,
        priceText(lo.priceEurMWh, vat, locale, 1),
        `${fmtWeekdayDay(toMs(hi.start), locale)} ${fmtTime(toMs(hi.start), locale)}`,
        priceText(hi.priceEurMWh, vat, locale, 1),
      );
    }
  }

  return (
    <section className="summary" aria-label={s.priceNow}>
      <div className="hero">
        <span className="hero-price num">
          {now}
          <span className="unit">{s.unit}</span>
        </span>
        <span className="hero-meta">{s.nowMeta(vat.vatIncluded)}</span>
      </div>
      {avgLine && <p className="summary-line num">{avgLine}</p>}
      {extremesLine && <p className="summary-line num">{extremesLine}</p>}
    </section>
  );
}
