import { LANGS, type Lang } from "../lib/i18n.ts";

interface Props {
  lang: Lang;
  onChange: (l: Lang) => void;
}

export function LanguageToggle({ lang, onChange }: Props) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language / Kieli">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          lang={l}
          onClick={() => onChange(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
