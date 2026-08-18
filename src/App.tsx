import { useEffect, useMemo, useState } from "react";
import { useTimeline } from "./hooks/useTimeline.ts";
import { HORIZONS, type HorizonKey, windowFor } from "./lib/horizons.ts";
import { toMs } from "./lib/time.ts";
import { obsAt } from "./lib/select.ts";
import type { VatOpts } from "./lib/format.ts";
import { PriceHeader } from "./components/PriceHeader.tsx";
import { PriceChart } from "./components/PriceChart.tsx";
import { HorizonSelector } from "./components/HorizonSelector.tsx";
import { VatToggle } from "./components/VatToggle.tsx";
import { Readout } from "./components/Readout.tsx";
import { Footer } from "./components/Footer.tsx";

const VAT_KEY = "sahkonhinta.vatIncluded";

export function App() {
  const { data, error, loading } = useTimeline();

  const [horizon, setHorizon] = useState<HorizonKey>("7d");
  const [vatIncluded, setVatIncluded] = useState<boolean>(
    () => localStorage.getItem(VAT_KEY) !== "false",
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [activeMs, setActiveMs] = useState<number>(() => Date.now());
  const [userSelected, setUserSelected] = useState(false);

  useEffect(() => {
    localStorage.setItem(VAT_KEY, String(vatIncluded));
  }, [vatIncluded]);

  // Keep "now" live so the marker and current price track the real clock.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

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
    const h = HORIZONS.find((x) => x.key === horizon) ?? HORIZONS[2];
    const win = windowFor(h, nowMs, dataStart, dataEnd);
    const vis = obs.filter(
      (o) => toMs(o.start) < win.to && toMs(o.end) > win.from,
    );
    const officialEndMs = data.status.officialEndsAt
      ? toMs(data.status.officialEndsAt)
      : null;
    const livePriceNow = obsAt(obs, nowMs)?.priceEurMWh ?? null;
    return { obs, win, vis, officialEndMs, livePriceNow };
  }, [data, horizon, nowMs]);

  if (loading) {
    return (
      <main className="app">
        <div className="state">Loading prices…</div>
      </main>
    );
  }
  if (error || !data || !view) {
    return (
      <main className="app">
        <div className="state error">
          Could not load price data. Please try again later.
        </div>
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
        <h1>
          Electricity price <span className="sub">· Finland</span>
        </h1>
        <span className="sub">c/kWh · day-ahead</span>
      </header>

      <PriceHeader status={headerStatus} vat={vat} />

      <div className="controls">
        <HorizonSelector value={horizon} onChange={setHorizon} />
        <VatToggle vatIncluded={vatIncluded} onChange={setVatIncluded} />
      </div>

      <div className="chart-card">
        <PriceChart
          vis={view.vis}
          from={view.win.from}
          to={view.win.to}
          officialEndMs={view.officialEndMs}
          nowMs={nowMs}
          vat={vat}
          activeMs={effectiveActiveMs}
          onSelect={(ms) => {
            setUserSelected(true);
            setActiveMs(ms);
          }}
        />
        <div className="legend" aria-hidden="true">
          <span className="key">
            <svg width="24" height="8" viewBox="0 0 24 8">
              <line x1="0" y1="4" x2="24" y2="4" className="line-official" />
            </svg>
            Official
          </span>
          <span className="key">
            <svg width="24" height="8" viewBox="0 0 24 8">
              <line x1="0" y1="4" x2="24" y2="4" className="line-forecast" />
            </svg>
            Forecast
          </span>
        </div>
        <Readout obs={activeObs} vat={vat} />
      </div>

      <Footer status={data.status} />
    </main>
  );
}
