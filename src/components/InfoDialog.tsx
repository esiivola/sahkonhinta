import { useEffect, useRef } from "react";
import type { Status } from "../lib/types.ts";
import type { Lang, Strings } from "../lib/i18n.ts";
import { fmtTime, fmtWeekdayDayMonth, toMs } from "../lib/time.ts";

interface Props {
  open: boolean;
  onClose: () => void;
  status: Status;
  lang: Lang;
  locale: string;
  s: Strings;
}

/**
 * "About this service" dialog. Uses the native <dialog> element for built-in
 * modal semantics, focus handling and Esc-to-close. Holds the source
 * attribution, notes and the site-maker credit (kept out of the main view).
 */
export function InfoDialog({ open, onClose, status, lang, locale, s }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  const updated = toMs(status.updatedAt);
  const updatedLine = s.updatedLine(
    fmtWeekdayDayMonth(updated, locale),
    fmtTime(updated, locale),
  );

  const porssi = (
    <a href="https://porssisahko.net/api" rel="noopener noreferrer" target="_blank">
      porssisahko.net
    </a>
  );
  const predict = (
    <a
      href="https://github.com/vividfog/nordpool-predict-fi"
      rel="noopener noreferrer"
      target="_blank"
    >
      nordpool-predict-fi
    </a>
  );
  const euronext = (
    <a
      href="https://live.euronext.com/en/products/commodities/power-derivatives"
      rel="noopener noreferrer"
      target="_blank"
    >
      Euronext
    </a>
  );
  const tutka = (
    <a href="https://sahkotutka.fi/futuurit" rel="noopener noreferrer" target="_blank">
      sähkötutka.fi
    </a>
  );

  const body =
    lang === "fi" ? (
      <>
        <p>
          Viralliset vuorokausihinnat: Nord Pool / ENTSO-E Transparency Platform,
          lähde {porssi}. Ennuste: {predict} (MIT). Hinnat snt/kWh; ALV 25,5 %
          valinnan mukaan.
        </p>
        <p>
          Pitkän aikavälin futuureja ei näytetä: Euronextin / Nord Poolin
          selvityshintoja ei saa vapaasti jakaa. Futuurikäyrän näet palvelusta{" "}
          {euronext} tai {tutka}.
        </p>
        <p>
          Ennusteet ovat arvioita, eivät toteutuneita hintoja, ja ne korvautuvat
          virallisilla vuorokausihinnoilla julkaisun myötä.
        </p>
      </>
    ) : (
      <>
        <p>
          Official day-ahead prices from Nord Pool / ENTSO-E Transparency Platform
          via {porssi}. Forecast from {predict} (MIT). Prices in c/kWh; VAT 25.5%
          applied per the toggle.
        </p>
        <p>
          Longer-term market forwards are not shown: Euronext / Nord Pool
          settlement prices cannot be freely redistributed. For the forward curve
          see {euronext} or {tutka}.
        </p>
        <p>
          Forecasts are estimates, not actual prices, and are replaced by official
          day-ahead prices as they are published.
        </p>
      </>
    );

  return (
    <dialog
      ref={ref}
      className="info-dialog"
      aria-label={s.infoAria}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
    >
      <div className="info-inner">
        <div className="info-head">
          <h2>{s.infoTitle}</h2>
          <button type="button" className="info-close" aria-label={s.close} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="maker">
          <div>
            <span className="maker-label">{s.maker}:</span> Eero Siivola
          </div>
          <div>
            <span className="maker-label">{s.homepage}:</span>{" "}
            <a href="https://esiivola.github.io/" rel="noopener noreferrer" target="_blank">
              esiivola.github.io
            </a>
          </div>
        </div>

        <div className="info-body">{body}</div>

        <p className="info-updated">{updatedLine}</p>
      </div>
    </dialog>
  );
}
