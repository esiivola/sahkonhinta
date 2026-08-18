import { useEffect, useMemo, useState } from "react";
import { useTimeline } from "./hooks/useTimeline.ts";
import { type HorizonKey, windowFor } from "./lib/horizons.ts";
import { toMs } from "./lib/time.ts";
import { obsAt } from "./lib/select.ts";
import { LOCALE, type Lang, strings } from "./lib/i18n.ts";
import type { VatOpts } from "./lib/format.ts";
import { PriceHeader } from "./components/PriceHeader.tsx";
import { PriceChart } from "./components/PriceChart.tsx";
import { HorizonSelector } from "./components/HorizonSelector.tsx";
import { VatToggle } from "./components/VatToggle.tsx";
import { LanguageToggle } from "./components/LanguageToggle.tsx";
import { Readout } from "./components/Readout.tsx";
import { Footer } from "./components/Footer.tsx";

const VAT_KEY = "sahkonhinta.vatIncluded";
const LANG_KEY = "sahkonhinta.lang";

export function App() {
  const { data, error, loading } = useTimeline();

  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem(LANG_KEY) === "en" ? "en" : "fi"), // Finnish default
  );
  const [horizon, setHorizon] = useState<HorizonKey>("today");
  const [vatIncluded, setVatIncluded] = useState<boolean>(
    () => localStorage.getItem(VAT_KEY) !== "false",
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [activeMs, setActiveMs] = useState<number>(() => Date.now());
  const [userSelected, setUserSelected] = useState(false);

  useEffect(() => {
    localStorage.setItem(VAT_KEY, String(vatIncluded));
  }, [vatIncluded]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Keep "now" live so the marker and current price track the real clock.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const s = strings(lang);
  const locale = LOCALE[lang];

  const vat: VatOpts = useMemo(
    () => ({ vatIncluded, rate: data?.timeline.vatRate ?? 0.255 }),
    [vatIncluded, data],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const obs = data.timeline.observations;
    if (!obs.length) return null;
    const dataStart = toMs(obs[0].start);
    const dataEnd = toMs(obs[obs.length - 1].end);
    const win = windowFor(horizon, nowMs, dataStart, dataEnd);
    const vis = obs.filter(
      (o) => toMs(o.start) < win.to && toMs(o.end) > win.from,
    );
    const officialEndMs = data.status.officialEndsAt
      ? toMs(data.status.officialEndsAt)
      : null;
    const livePriceNow = obsAt(obs, nowMs)?.priceEurMWh ?? null;
    const showLegend =
      vis.some((o) => o.type === "official") &&
      vis.some((o) => o.type === "forecast");
    return { obs, win, vis, officialEndMs, livePriceNow, showLegend };
  }, [data, horizon, nowMs]);

  if (loading) {
    return (
      <main className="app">
        <div className="state">{s.loading}</div>
      </main>
    );
  }
  if (error || !data || !view) {
    return (
      <main className="app">
        <div className="state error">{s.error}</div>
      </main>
    );
  }

  const effectiveActiveMs = userSelected ? activeMs : nowMs;
  const activeObs = obsAt(view.vis, effectiveActiveMs);
  const headerStatus = {
    ...data.status,
    currentPriceEurMWh: view.livePriceNow ?? data.status.currentPriceEurMWh,
  };

  return (
    <main className="app">
      <header className="site-head">
        <div className="head-titles">
          <h1>
            {s.title} <span className="sub">· {s.region}</span>
          </h1>
          <span className="sub">{s.subtitle}</span>
        </div>
        <LanguageToggle lang={lang} onChange={setLang} />
      </header>

      <PriceHeader status={headerStatus} vat={vat} s={s} locale={locale} />

      <div className="controls">
        <HorizonSelector value={horizon} onChange={setHorizon} s={s} />
        <VatToggle vatIncluded={vatIncluded} onChange={setVatIncluded} s={s} />
      </div>

      <div className="chart-card">
        <PriceChart
          vis={view.vis}
          from={view.win.from}
          to={view.win.to}
          officialEndMs={view.officialEndMs}
          nowMs={nowMs}
          currentPriceEurMWh={view.livePriceNow}
          vat={vat}
          activeMs={effectiveActiveMs}
          onSelect={(ms) => {
            setUserSelected(true);
            setActiveMs(ms);
          }}
          s={s}
          locale={locale}
        />
        {view.showLegend && (
          <div className="legend" aria-hidden="true">
            <span className="key">
              <svg width="24" height="8" viewBox="0 0 24 8">
                <line x1="0" y1="4" x2="24" y2="4" className="line-official" />
              </svg>
              {s.official}
            </span>
            <span className="key">
              <svg width="24" height="8" viewBox="0 0 24 8">
                <line x1="0" y1="4" x2="24" y2="4" className="line-forecast" />
              </svg>
              {s.forecast}
            </span>
          </div>
        )}
        <Readout obs={activeObs} vat={vat} s={s} locale={locale} />
      </div>

      <Footer status={data.status} lang={lang} locale={locale} />
    </main>
  );
}
