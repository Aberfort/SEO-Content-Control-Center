"use client";

import { useId, useMemo, useState } from "react";

import type { GscDailyMetric } from "@/lib/types";

type GscTrendChartProps = {
  metrics: GscDailyMetric[];
};

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

export function GscTrendChart({ metrics }: GscTrendChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => metrics.slice(-30), [metrics]);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const maxClicks = Math.max(1, ...points.map((point) => point.clicks));
  const niceMax = computeNiceMax(maxClicks);

  const xFor = (index: number) =>
    points.length > 1 ? PAD_LEFT + (index / (points.length - 1)) * plotWidth : PAD_LEFT;
  const yFor = (clicks: number) => PAD_TOP + plotHeight - (clicks / niceMax) * plotHeight;

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index)},${yFor(point.clicks)}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${xFor(points.length - 1)},${PAD_TOP + plotHeight} L${xFor(0)},${PAD_TOP + plotHeight} Z`
      : "";

  const ticks = [0, 0.5, 1].map((fraction) => Math.round(niceMax * fraction));
  const lastPoint = points.at(-1);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  if (points.length < 2) {
    return (
      <p className="empty-copy">
        Not enough synced days yet to plot a trend. The table below has what has synced.
      </p>
    );
  }

  return (
    <div className="gsc-trend-chart">
      <div className="gsc-trend-chart-header">
        <h3>Clicks, last {points.length} synced days</h3>
        {lastPoint ? (
          <span className="gsc-trend-chart-value">{lastPoint.clicks.toLocaleString("en")}</span>
        ) : null}
      </div>
      <svg
        role="img"
        aria-label={`Daily clicks trend over the last ${points.length} synced days, ending at ${lastPoint?.clicks.toLocaleString("en")} clicks on ${lastPoint?.date}.`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const relativeX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
          const ratio = (relativeX - PAD_LEFT) / plotWidth;
          const index = Math.round(ratio * (points.length - 1));
          setHoverIndex(Math.min(points.length - 1, Math.max(0, index)));
        }}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="gsc-trend-gridline"
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(tick)}
              y2={yFor(tick)}
            />
            <text className="gsc-trend-tick" x={PAD_LEFT - 10} y={yFor(tick)} textAnchor="end">
              {tick.toLocaleString("en")}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path
          className="gsc-trend-line"
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {lastPoint ? (
          <circle
            cx={xFor(points.length - 1)}
            cy={yFor(lastPoint.clicks)}
            r={5}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ) : null}

        {hoverIndex !== null ? (
          <line
            className="gsc-trend-crosshair"
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
          />
        ) : null}
        {hoverIndex !== null && hovered ? (
          <circle
            cx={xFor(hoverIndex)}
            cy={yFor(hovered.clicks)}
            r={5}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ) : null}

        <text x={xFor(points.length - 1)} y={yFor(lastPoint!.clicks) - 12} textAnchor="end" className="gsc-trend-end-label">
          {lastPoint!.clicks.toLocaleString("en")}
        </text>

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          tabIndex={0}
          onFocus={() => setHoverIndex(points.length - 1)}
          onBlur={() => setHoverIndex(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              setHoverIndex((current) => Math.max(0, (current ?? points.length - 1) - 1));
            }
            if (event.key === "ArrowRight") {
              setHoverIndex((current) => Math.min(points.length - 1, (current ?? 0) + 1));
            }
          }}
        />
      </svg>

      {hoverIndex !== null && hovered ? (
        <div
          className="gsc-trend-tooltip"
          style={{ left: `${clamp((xFor(hoverIndex) / WIDTH) * 100, 14, 86)}%` }}
          role="status"
        >
          <strong>{hovered.date}</strong>
          <dl>
            <div>
              <dt>Clicks</dt>
              <dd>{hovered.clicks.toLocaleString("en")}</dd>
            </div>
            <div>
              <dt>Impressions</dt>
              <dd>{hovered.impressions.toLocaleString("en")}</dd>
            </div>
            <div>
              <dt>CTR</dt>
              <dd>{(hovered.ctr * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>{hovered.position.toFixed(1)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeNiceMax(value: number): number {
  if (value <= 10) {
    return Math.ceil(value / 2) * 2 || 2;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}
