import type { Observation } from "../lib/types.ts";
import { describe, type VatOpts } from "../lib/format.ts";

interface Props {
  obs: Observation | null;
  vat: VatOpts;
}

/**
 * Stable detail readout for the currently selected point. Updated by both tap
 * and keyboard; announced to screen readers via aria-live.
 */
export function Readout({ obs, vat }: Props) {
  if (!obs) {
    return (
      <div className="readout" aria-live="polite">
        <span className="hint">Tap or use arrow keys on the chart to inspect a price.</span>
      </div>
    );
  }
  const r = describe(obs, vat);
  return (
    <div className="readout" aria-live="polite">
      <span className="sr-only">{r.aria}</span>
      <span className="when" aria-hidden="true">
        {r.day} · {r.interval}
      </span>
      <span className="price" aria-hidden="true">
        {r.price}
        <span className="unit">c/kWh</span>
      </span>
      <span className="interval" aria-hidden="true">
        <span className={`badge ${obs.type}`}>{r.typeLabel}</span> {r.source}
        {r.band ? ` · ${r.band}` : ""}
      </span>
    </div>
  );
}
