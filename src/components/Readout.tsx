import type { Observation } from "../lib/types.ts";
import type { Strings } from "../lib/i18n.ts";
import { describe, type VatOpts } from "../lib/format.ts";

interface Props {
  obs: Observation | null;
  vat: VatOpts;
  s: Strings;
  locale: string;
}

/**
 * Stable detail readout for the currently selected point: just the time range
 * and its price. Updated by both tap and keyboard; announced via aria-live.
 */
export function Readout({ obs, vat, s, locale }: Props) {
  if (!obs) {
    return (
      <div className="readout" aria-live="polite">
        <span className="hint">{s.readoutHint}</span>
      </div>
    );
  }
  const r = describe(obs, vat, s, locale);
  return (
    <div className="readout" aria-live="polite">
      <span className="sr-only">{r.aria}</span>
      <span className="readout-time num" aria-hidden="true">
        {r.day} · {r.interval}
      </span>
      <span className="readout-price num" aria-hidden="true">
        {r.price}
        <span className="readout-unit">{s.unit}</span>
      </span>
    </div>
  );
}
