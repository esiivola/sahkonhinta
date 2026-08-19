import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Observation } from "../lib/types.ts";
import type { Strings } from "../lib/i18n.ts";
import { displayCents, formatCents } from "../lib/units.ts";
import { makeScale, niceTicks } from "../lib/scale.ts";
import { timeTicks } from "../lib/horizons.ts";
import { toMs } from "../lib/time.ts";
import { centerMs, indexAt } from "../lib/select.ts";
import type { VatOpts } from "../lib/format.ts";

interface Props {
  vis: Observation[];
  from: number;
  to: number;
  nowMs: number;
  vat: VatOpts;
  activeMs: number;
  onSelect: (ms: number) => void;
  s: Strings;
  locale: string;
}

/** Build an SVG step path for a run of contiguous observations. */
function stepPath(
  run: Observation[],
  x: (ms: number) => number,
  y: (v: number) => number,
  dv: (o: Observation) => number,
): string {
  if (!run.length) return "";
  let d = `M ${x(toMs(run[0].start)).toFixed(1)} ${y(dv(run[0])).toFixed(1)}`;
  for (const o of run) {
    const yy = y(dv(o)).toFixed(1);
    d += ` L ${x(toMs(o.start)).toFixed(1)} ${yy} L ${x(toMs(o.end)).toFixed(1)} ${yy}`;
  }
  return d;
}

export function PriceChart({
  vis,
  from,
  to,
  nowMs,
  vat,
  activeMs,
  onSelect,
  s,
  locale,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Measure synchronously on mount so the chart never renders blank while
    // waiting for the first (async) ResizeObserver callback.
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width ?? 0;
      if (cw > 0) setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const svgRef = useRef<SVGSVGElement>(null);

  const pickAtClientX = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || w === 0) return;
      const rect = svg.getBoundingClientRect();
      const scale = w / rect.width;
      const px = (clientX - rect.left) * scale;
      onSelect(from + ((px - MARGIN.l) / plotW(w) || 0) * (to - from));
    },
    [w, from, to, onSelect],
  );

  const idx = vis.length ? indexAt(vis, activeMs) : -1;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!vis.length) return;
      let next = idx;
      if (e.key === "ArrowRight") next = Math.min(vis.length - 1, idx + 1);
      else if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = vis.length - 1;
      else return;
      e.preventDefault();
      onSelect(centerMs(vis[next]));
    },
    [vis, idx, onSelect],
  );

  if (w === 0) {
    return <div className="chart-wrap" ref={wrapRef} style={{ height: 300 }} />;
  }

  const h = w < 380 ? 260 : w < 560 ? 300 : 340;
  const px0 = MARGIN.l;
  const px1 = w - MARGIN.r;
  const py0 = MARGIN.t;
  const py1 = h - MARGIN.b;

  const dv = (o: Observation) => displayCents(o.priceEurMWh, vat);

  const values = vis.map(dv);
  const rawMax = values.length ? Math.max(...values) : 1;
  const rawMin = values.length ? Math.min(...values) : 0;
  // Honest zero baseline for positive data; include negatives when present.
  // No large top headroom now that nothing is drawn inside the plot top; the
  // tick step hugs the peak so the line fills the height cleanly.
  const yTicks = niceTicks(rawMin < 0 ? rawMin : 0, rawMax, 5);
  const dMin = yTicks[0];
  const dMax = yTicks[yTicks.length - 1];

  const x = makeScale(from, to, px0, px1);
  const y = makeScale(dMin, dMax, py1, py0);

  // Split visible observations into runs of the same type for line styling.
  // The solid/dashed line style itself signals official vs forecast, so no
  // separate boundary marker is drawn.
  const runs: Observation[][] = [];
  for (const o of vis) {
    const last = runs[runs.length - 1];
    if (last && last[0].type === o.type) last.push(o);
    else runs.push([o]);
  }

  const step = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1;
  const yDec = step < 1 ? 2 : step < 5 ? 1 : 0;

  const xTicks = timeTicks(from, to, locale);
  const pxPerTick = (px1 - px0) / Math.max(1, xTicks.length);
  const labelEvery = Math.max(1, Math.ceil(50 / pxPerTick));

  const showNow = nowMs > from && nowMs < to;
  const nx = showNow ? x(nowMs) : 0;

  const active = idx >= 0 ? vis[idx] : null;
  const clipId = "plot-clip";

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="chart-svg"
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="application"
        tabIndex={0}
        aria-label={s.title}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          pickAtClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) pickAtClientX(e.clientX);
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={px0} y={py0 - 4} width={px1 - px0} height={py1 - py0 + 8} />
          </clipPath>
        </defs>

        {/* y gridlines + labels */}
        {yTicks.map((t) => {
          const gy = y(t);
          const isZero = Math.abs(t) < step * 1e-6;
          return (
            <g key={`y${t}`}>
              <line
                x1={px0}
                x2={px1}
                y1={gy}
                y2={gy}
                className={isZero ? "grid-zero" : "grid"}
              />
              <text x={px0 - 6} y={gy + 3.5} className="tick-y">
                {formatCents(t, yDec, locale)}
              </text>
            </g>
          );
        })}

        {/* x gridlines + labels */}
        {xTicks.map((t, i) => {
          const gx = x(t.ms);
          if (gx < px0 - 0.5 || gx > px1 + 0.5) return null;
          return (
            <g key={`x${t.ms}`}>
              <line
                x1={gx}
                x2={gx}
                y1={py0}
                y2={py1}
                className={t.major ? "grid-major" : "grid"}
              />
              {i % labelEvery === 0 && (
                <text
                  x={gx}
                  y={py1 + 14}
                  className={t.major ? "tick-x major" : "tick-x"}
                >
                  {t.label}
                </text>
              )}
            </g>
          );
        })}

        {/* active interval highlight */}
        {active && (
          <rect
            x={x(toMs(active.start))}
            y={py0}
            width={Math.max(1.5, x(toMs(active.end)) - x(toMs(active.start)))}
            height={py1 - py0}
            className="active-band"
            clipPath={`url(#${clipId})`}
          />
        )}

        {/* price step lines */}
        <g clipPath={`url(#${clipId})`}>
          {runs.map((run, i) => (
            <path
              key={i}
              d={stepPath(run, x, y, dv)}
              className={
                run[0].type === "official" ? "line-official" : "line-forecast"
              }
            />
          ))}
        </g>

        {/* now marker: a bare vertical line at the current time */}
        {showNow && (
          <line x1={nx} x2={nx} y1={py0} y2={py1} className="now-line" />
        )}

        {/* selection cursor + dot */}
        {active && (
          <g>
            <line
              x1={(x(toMs(active.start)) + x(toMs(active.end))) / 2}
              x2={(x(toMs(active.start)) + x(toMs(active.end))) / 2}
              y1={py0}
              y2={py1}
              className="cursor-line"
            />
            <circle
              cx={(x(toMs(active.start)) + x(toMs(active.end))) / 2}
              cy={y(dv(active))}
              r={4.5}
              className="cursor-dot"
            />
          </g>
        )}

        {/* axis baseline */}
        <line x1={px0} x2={px1} y1={py1} y2={py1} className="axis" />
      </svg>
    </div>
  );
}

const MARGIN = { l: 38, r: 14, t: 14, b: 30 };
const plotW = (w: number) => w - MARGIN.l - MARGIN.r;
