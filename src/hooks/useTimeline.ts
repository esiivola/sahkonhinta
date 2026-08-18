import { useEffect, useState } from "react";
import type { Status, Timeline } from "../lib/types.ts";

interface Data {
  timeline: Timeline;
  status: Status;
}

interface State {
  data: Data | null;
  error: string | null;
  loading: boolean;
}

const base = import.meta.env.BASE_URL;

export function useTimeline(): State {
  const [state, setState] = useState<State>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    // Cache-bust so a freshly-deployed data file is not masked by an old cache.
    const bust = `?t=${Date.now()}`;
    Promise.all([
      fetch(`${base}data/timeline.json${bust}`).then(asJson<Timeline>),
      fetch(`${base}data/status.json${bust}`).then(asJson<Status>),
    ])
      .then(([timeline, status]) => {
        if (!cancelled) setState({ data: { timeline, status }, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ data: null, error: String(err), loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${res.url}`);
  return (await res.json()) as T;
}
