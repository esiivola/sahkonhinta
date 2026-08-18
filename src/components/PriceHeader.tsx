import type { Status } from "../lib/types.ts";
import { priceText, sourceTypeLabel, type VatOpts } from "../lib/format.ts";

interface Props {
  status: Status;
  vat: VatOpts;
}

function Value({ v, vat }: { v: number | null; vat: VatOpts }) {
  if (v === null) return <span className="num">—</span>;
  return (
    <span className="num">
      {priceText(v, vat)}
      <span className="unit">c/kWh</span>
    </span>
  );
}

function TypeBadge({ type }: { type: Status["tomorrowType"] }) {
  if (!type || type === "forward") return null;
  return (
    <span className={`badge ${type}`}>
      {sourceTypeLabel(type)}
    </span>
  );
}

export function PriceHeader({ status, vat }: Props) {
  const vatNote = vat.vatIncluded ? "incl. VAT 25.5%" : "excl. VAT";
  return (
    <section className="stats" aria-label="Price summary">
      <div className="tile lead">
        <div className="label">Price now</div>
        <div className="value">
          <Value v={status.currentPriceEurMWh} vat={vat} />
        </div>
        <div className="meta">{vatNote}</div>
      </div>

      <div className="tile">
        <div className="label">Today · average</div>
        <div className="value">
          <Value v={status.todayAverageEurMWh} vat={vat} />
        </div>
        <div className="meta">Official</div>
      </div>

      <div className="tile">
        <div className="label">
          Tomorrow · average <TypeBadge type={status.tomorrowType} />
        </div>
        <div className="value">
          <Value v={status.tomorrowAverageEurMWh} vat={vat} />
        </div>
        <div className="meta">
          {status.tomorrowType === "official"
            ? "Day-ahead confirmed"
            : status.tomorrowType === "forecast"
              ? "Estimate until day-ahead publishes"
              : "Not yet available"}
        </div>
      </div>
    </section>
  );
}
