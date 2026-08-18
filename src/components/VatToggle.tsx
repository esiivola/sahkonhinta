import type { Strings } from "../lib/i18n.ts";

interface Props {
  vatIncluded: boolean;
  onChange: (v: boolean) => void;
  s: Strings;
}

export function VatToggle({ vatIncluded, onChange, s }: Props) {
  return (
    <div className="vat-toggle">
      <input
        id="vat-switch"
        type="checkbox"
        className="switch"
        role="switch"
        checked={vatIncluded}
        aria-label={s.vatAria}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor="vat-switch">{s.vatToggle(vatIncluded)}</label>
    </div>
  );
}
