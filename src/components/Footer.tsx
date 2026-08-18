import type { Status } from "../lib/types.ts";
import { fmtTime, fmtWeekdayDayMonth, toMs } from "../lib/time.ts";

interface Props {
  status: Status;
}

export function Footer({ status }: Props) {
  const updated = toMs(status.updatedAt);
  return (
    <footer className="site-foot">
      <p className="updated">
        Data updated {fmtWeekdayDayMonth(updated)} at {fmtTime(updated)} (Helsinki
        time)
      </p>
      <p>
        Official day-ahead prices from Nord Pool / ENTSO-E Transparency Platform
        via{" "}
        <a href="https://porssisahko.net/api" rel="noopener noreferrer" target="_blank">
          porssisahko.net
        </a>
        . Forecast from{" "}
        <a
          href="https://github.com/vividfog/nordpool-predict-fi"
          rel="noopener noreferrer"
          target="_blank"
        >
          nordpool-predict-fi
        </a>{" "}
        (MIT). Prices in c/kWh; VAT 25.5% applied per the toggle above.
      </p>
      <p>
        Longer-term market forwards are not shown here — Euronext / Nord Pool
        settlement prices cannot be freely redistributed. For the forward curve
        see{" "}
        <a
          href="https://live.euronext.com/en/products/commodities/power-derivatives"
          rel="noopener noreferrer"
          target="_blank"
        >
          Euronext
        </a>{" "}
        or{" "}
        <a href="https://sahkotutka.fi/futuurit" rel="noopener noreferrer" target="_blank">
          sähkötutka.fi
        </a>
        .
      </p>
      <p>
        Forecasts are estimates, not actual prices, and are replaced by official
        day-ahead prices as they are published.
      </p>
    </footer>
  );
}
