/**
 * Localization. Finnish is the default; English is available via the toggle.
 * `Strings` holds every UI string except the footer body (which branches on
 * `lang` in the Footer component because it is link-heavy).
 */
export type Lang = "fi" | "en";

export const LANGS: Lang[] = ["fi", "en"];

/** Intl locale used for date/number formatting per language. */
export const LOCALE: Record<Lang, string> = {
  fi: "fi-FI",
  en: "en-GB",
};

export interface Strings {
  title: string;
  region: string;
  subtitle: string;

  priceNow: string;
  todayAvg: string;
  tomorrowAvg: string;
  official: string; // also used as legend / badge text
  forecast: string;
  dayAheadConfirmed: string;
  estimateUntilPublished: string;
  notAvailable: string;

  today: string; // horizon labels
  tomorrow: string;
  week: string;
  timeRangeAria: string;

  unit: string; // "snt/kWh" | "c/kWh"
  vatToggle: (on: boolean) => string;
  vatAria: string;
  vatInclShort: string; // "sis. ALV 25,5 %"
  vatExclShort: string; // "ALV 0 %"

  nowShort: string; // "nyt" | "now"
  markerOfficial: string; // "VIRALLINEN"
  markerForecast: string; // "ENNUSTE"

  readoutHint: string;
  ariaUnit: string; // "senttiä kilowattitunnilta" | "cents per kilowatt-hour"

  loading: string;
  error: string;
}

const fi: Strings = {
  title: "Sähkön hinta",
  region: "Suomi",
  subtitle: "snt/kWh · pörssihinta",

  priceNow: "Hinta nyt",
  todayAvg: "Tänään · keskihinta",
  tomorrowAvg: "Huomenna · keskihinta",
  official: "Virallinen",
  forecast: "Ennuste",
  dayAheadConfirmed: "Vuorokausihinta vahvistettu",
  estimateUntilPublished: "Arvio kunnes vuorokausihinta julkaistaan",
  notAvailable: "Ei vielä saatavilla",

  today: "Tänään",
  tomorrow: "Huomenna",
  week: "Viikko",
  timeRangeAria: "Aikaväli",

  unit: "snt/kWh",
  vatToggle: (on) => (on ? "ALV 25,5 % mukana" : "ALV 25,5 % pois"),
  vatAria: "Sisällytä ALV 25,5 % hintoihin",
  vatInclShort: "sis. ALV 25,5 %",
  vatExclShort: "ALV 0 %",

  nowShort: "nyt",
  markerOfficial: "VIRALLINEN",
  markerForecast: "ENNUSTE",

  readoutHint: "Napauta kuvaajaa tai käytä nuolinäppäimiä hinnan tarkasteluun.",
  ariaUnit: "senttiä kilowattitunnilta",

  loading: "Ladataan hintoja…",
  error: "Hintatietoja ei voitu ladata. Yritä myöhemmin uudelleen.",
};

const en: Strings = {
  title: "Electricity price",
  region: "Finland",
  subtitle: "c/kWh · day-ahead",

  priceNow: "Price now",
  todayAvg: "Today · average",
  tomorrowAvg: "Tomorrow · average",
  official: "Official",
  forecast: "Forecast",
  dayAheadConfirmed: "Day-ahead confirmed",
  estimateUntilPublished: "Estimate until day-ahead publishes",
  notAvailable: "Not yet available",

  today: "Today",
  tomorrow: "Tomorrow",
  week: "Week",
  timeRangeAria: "Time range",

  unit: "c/kWh",
  vatToggle: (on) => (on ? "VAT 25.5% included" : "VAT 25.5% excluded"),
  vatAria: "Include VAT 25.5% in prices",
  vatInclShort: "incl. VAT 25.5%",
  vatExclShort: "excl. VAT",

  nowShort: "now",
  markerOfficial: "OFFICIAL",
  markerForecast: "FORECAST",

  readoutHint: "Tap the chart or use arrow keys to inspect a price.",
  ariaUnit: "cents per kilowatt-hour",

  loading: "Loading prices…",
  error: "Could not load price data. Please try again later.",
};

const STRINGS: Record<Lang, Strings> = { fi, en };

export function strings(lang: Lang): Strings {
  return STRINGS[lang];
}
