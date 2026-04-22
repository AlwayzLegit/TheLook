"use client";

import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

// One chart wrapper = one palette, one axis style, one tooltip style.
// Replaces the current saturated green/blue/yellow/red grab bag (plan §10.8).

export const CHART_COLORS = [
  "var(--color-chart-1)", // navy
  "var(--color-chart-2)", // crimson
  "var(--color-chart-3)", // gold
  "var(--color-chart-4)", // sage
  "var(--color-chart-5)", // rose dusk
  "var(--color-chart-6)", // warm grey
];

const axisProps = {
  stroke: "var(--color-text-subtle)",
  tick: { fill: "var(--color-text-muted)", fontSize: 11 },
  tickLine: { stroke: "var(--color-border-strong)" },
  axisLine: { stroke: "var(--color-border)" },
};

const tooltipStyle = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--color-text)",
  padding: "8px 10px",
  boxShadow: "var(--shadow-raised)",
};

interface ChartProps {
  data: Array<Record<string, string | number | null>>;
  dataKey: string; // X axis key
  series: Array<{ key: string; label?: string; color?: string }>;
  kind?: "line" | "bar" | "area";
  height?: number;
  yFormatter?: (v: number) => string;
  xFormatter?: (v: string | number) => string;
  stacked?: boolean;
  className?: string;
}

export function Chart({
  data,
  dataKey,
  series,
  kind = "line",
  height = 220,
  yFormatter,
  xFormatter,
  stacked,
  className,
}: ChartProps) {
  const coloredSeries = series.map((s, i) => ({ ...s, color: s.color || CHART_COLORS[i % CHART_COLORS.length] }));
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        {kind === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
            <XAxis dataKey={dataKey} {...axisProps} tickFormatter={xFormatter} />
            <YAxis {...axisProps} tickFormatter={yFormatter ? (v) => yFormatter(Number(v)) : undefined} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => (yFormatter ? yFormatter(Number(v)) : String(v))} />
            {coloredSeries.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label || s.key} fill={s.color} stackId={stacked ? "s" : undefined} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : kind === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
            <XAxis dataKey={dataKey} {...axisProps} tickFormatter={xFormatter} />
            <YAxis {...axisProps} tickFormatter={yFormatter ? (v) => yFormatter(Number(v)) : undefined} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => (yFormatter ? yFormatter(Number(v)) : String(v))} />
            {coloredSeries.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key} stroke={s.color} fill={s.color} fillOpacity={0.15} strokeWidth={2} />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
            <XAxis dataKey={dataKey} {...axisProps} tickFormatter={xFormatter} />
            <YAxis {...axisProps} tickFormatter={yFormatter ? (v) => yFormatter(Number(v)) : undefined} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => (yFormatter ? yFormatter(Number(v)) : String(v))} />
            {coloredSeries.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key} stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Tiny sparkline — used inside StatCard. No axis, no grid, one-colour, no
// tooltip. Accepts a plain number[] so callers don't need to build series.
export function Sparkline({
  values,
  color = CHART_COLORS[1],
  height = 32,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ series }: { series: Array<{ label: string; color?: string }> }) {
  return (
    <div className="flex flex-wrap gap-3 text-[0.75rem] text-[var(--color-text-muted)]">
      {series.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export type ChartNodeProps = Parameters<typeof Chart>[0] & { title?: ReactNode };
