/**
 * Minimal HTTP helpers for the ingestion pipeline: timeout + bounded retry with
 * backoff. Runs in Node (GitHub Actions) using the global fetch.
 */

const DEFAULT_TIMEOUT = 20_000;
const DEFAULT_RETRIES = 3;

async function withTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface FetchOpts {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  /** HTTP statuses to treat as a non-retryable "expected empty" result. */
  emptyStatuses?: number[];
}

/** Fetch text with retries. Returns null for an expected-empty status. */
export async function fetchText(
  url: string,
  opts: FetchOpts = {},
): Promise<string | null> {
  const {
    timeoutMs = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    headers = {},
    emptyStatuses = [],
  } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withTimeout(url, { headers }, timeoutMs);
      if (emptyStatuses.includes(res.status)) return null;
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      }
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(500 * 2 ** attempt);
    }
  }
  throw new Error(
    `Failed after ${retries + 1} attempts: ${String(lastErr)}`,
  );
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOpts = {},
): Promise<T> {
  const text = await fetchText(url, opts);
  if (text === null) throw new Error(`Empty response for ${url}`);
  return JSON.parse(text) as T;
}
