import { HORIZON_KEYS, type HorizonKey } from "../lib/horizons.ts";
import type { Strings } from "../lib/i18n.ts";

interface Props {
  value: HorizonKey;
  onChange: (key: HorizonKey) => void;
  s: Strings;
}

export function HorizonSelector({ value, onChange, s }: Props) {
  return (
    <div className="segmented" role="group" aria-label={s.timeRangeAria}>
      {HORIZON_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {s[key]}
        </button>
      ))}
    </div>
  );
}
