import type { Status } from "../lib/types.ts";
import type { Strings } from "../lib/i18n.ts";
import { priceText, sourceTypeLabel, type VatOpts } from "../lib/format.ts";

interface Props {
  status: Status;
  vat: VatOpts;
  s: Strings;
  locale: string;
}

function Value({
  v,
  vat,
  locale,
  unit,
}: {
  v: number | null;
  vat: VatOpts;
  locale: string;
  unit: string;
}) {
  if (v === null) return <span className="num">—</span>;
  return (
    <span className="num">
      {priceText(v, vat, locale)}
      <span className="unit">{unit}</span>
    </span>
  );
}

function TypeBadge({ type, s }: { type: Status["tomorrowType"]; s: Strings }) {
  if (!type || type === "forward") return null;
  return <span className={`badge ${type}`}>{sourceTypeLabel(type, s)}</span>;
}

export function PriceHeader({ status, vat, s, locale }: Props) {
  const vatNote = vat.vatIncluded ? s.vatInclShort : s.vatExclShort;
  const tomorrowMeta =
    status.tomorrowType === "official"
      ? s.dayAheadConfirmed
      : status.tomorrowType === "forecast"
        ? s.estimateUntilPublished
        : s.notAvailable;

  return (
    <section className="stats" aria-label={s.priceNow}>
      <div className="tile lead">
        <div className="label">{s.priceNow}</div>
        <div className="value">
          <Value v={status.currentPriceEurMWh} vat={vat} locale={locale} unit={s.unit} />
        </div>
        <div className="meta">{vatNote}</div>
      </div>

      <div className="tile">
        <div className="label">{s.todayAvg}</div>
        <div className="value">
          <Value v={status.todayAverageEurMWh} vat={vat} locale={locale} unit={s.unit} />
        </div>
        <div className="meta">{s.official}</div>
      </div>

      <div className="tile">
        <div className="label">
          {s.tomorrowAvg} <TypeBadge type={status.tomorrowType} s={s} />
        </div>
        <div className="value">
          <Value
            v={status.tomorrowAverageEurMWh}
            vat={vat}
            locale={locale}
            unit={s.unit}
          />
        </div>
        <div className="meta">{tomorrowMeta}</div>
      </div>
    </section>
  );
}
