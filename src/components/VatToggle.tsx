interface Props {
  vatIncluded: boolean;
  onChange: (v: boolean) => void;
}

export function VatToggle({ vatIncluded, onChange }: Props) {
  return (
    <div className="vat-toggle">
      <input
        id="vat-switch"
        type="checkbox"
        className="switch"
        role="switch"
        checked={vatIncluded}
        aria-label="Include VAT 25.5% in prices"
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor="vat-switch">
        VAT 25.5% {vatIncluded ? "included" : "excluded"}
      </label>
    </div>
  );
}
