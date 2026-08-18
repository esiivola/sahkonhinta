import type { Status } from "../lib/types.ts";
import type { Lang } from "../lib/i18n.ts";
import { fmtTime, fmtWeekdayDayMonth, toMs } from "../lib/time.ts";

interface Props {
  status: Status;
  lang: Lang;
  locale: string;
}

export function Footer({ status, lang, locale }: Props) {
  const updated = toMs(status.updatedAt);
  const day = fmtWeekdayDayMonth(updated, locale);
  const time = fmtTime(updated, locale);

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

  if (lang === "fi") {
    return (
      <footer className="site-foot">
        <p className="updated">
          Päivitetty {day} klo {time} (Suomen aikaa)
        </p>
        <p>
          Viralliset vuorokausihinnat: Nord Pool / ENTSO-E Transparency Platform,
          lähde {porssi}. Ennuste: {predict} (MIT). Hinnat snt/kWh; ALV 25,5 %
          yllä olevan valinnan mukaan.
        </p>
        <p>
          Pitkän aikavälin futuureja ei näytetä tässä — Euronextin / Nord Poolin
          selvityshintoja ei saa vapaasti jakaa. Futuurikäyrän näet palvelusta{" "}
          {euronext} tai {tutka}.
        </p>
        <p>
          Ennusteet ovat arvioita, eivät toteutuneita hintoja, ja ne korvautuvat
          virallisilla vuorokausihinnoilla julkaisun myötä.
        </p>
      </footer>
    );
  }

  return (
    <footer className="site-foot">
      <p className="updated">
        Data updated {day} at {time} (Helsinki time)
      </p>
      <p>
        Official day-ahead prices from Nord Pool / ENTSO-E Transparency Platform
        via {porssi}. Forecast from {predict} (MIT). Prices in c/kWh; VAT 25.5%
        applied per the toggle above.
      </p>
      <p>
        Longer-term market forwards are not shown here — Euronext / Nord Pool
        settlement prices cannot be freely redistributed. For the forward curve
        see {euronext} or {tutka}.
      </p>
      <p>
        Forecasts are estimates, not actual prices, and are replaced by official
        day-ahead prices as they are published.
      </p>
    </footer>
  );
}
