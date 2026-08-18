import { HORIZONS, type HorizonKey } from "../lib/horizons.ts";

interface Props {
  value: HorizonKey;
  onChange: (key: HorizonKey) => void;
}

export function HorizonSelector({ value, onChange }: Props) {
  return (
    <div
      className="segmented"
      role="group"
      aria-label="Time range"
    >
      {HORIZONS.map((h) => (
        <button
          key={h.key}
          type="button"
          aria-pressed={value === h.key}
          onClick={() => onChange(h.key)}
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}
