import type { ReactNode } from "react";

// Chart colors are the theme's CSS variables, written as `var(...)`. Recharts
// puts them on SVG presentation attributes (fill, stroke, stop-color), and
// browsers resolve those like any other CSS value, so the charts follow the
// theme and there is no hex copy of the palette to keep in sync.
//
// These are the raw tokens on :root (`--chart-1`), not the Tailwind names
// (`--color-chart-1`). The theme block is `@theme inline`, so Tailwind bakes
// values into utilities and never emits the `--color-*` variables.
const color = (token: string) => `var(--${token})`;

export const CHART = {
  scale: [
    color("chart-1"),
    color("chart-2"),
    color("chart-3"),
    color("chart-4"),
    color("chart-5"),
  ],
  primary: color("chart-1"),
  employees: color("chart-1"),
  contractors: color("chart-3"),
  hires: color("chart-1"),
  terminations: color("chart-muted"),
  grid: color("border"),
  axis: color("muted-foreground"),
} as const;

export const AXIS_TICK = {
  fill: CHART.axis,
  fontSize: 12,
  fontFamily: "var(--font-sans)",
} as const;

// Recharts requires CartesianGrid/XAxis/YAxis as direct children, so these
// are prop bags to spread, not a wrapper component.
export const TIME_SERIES_MARGIN = {
  top: 4,
  right: 8,
  left: -8,
  bottom: 0,
} as const;

export const GRID_PROPS = {
  vertical: false,
  stroke: CHART.grid,
} as const;

export const Y_AXIS_PROPS = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  width: 36,
  allowDecimals: false,
} as const;

interface TooltipRow {
  name?: ReactNode;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: ReactNode;
  payload?: TooltipRow[];
  labelFormatter?: (label: ReactNode) => ReactNode;
  valueFormatter?: (value: number) => string;
  hideName?: boolean;
}

export function ChartTooltip({
  active,
  label,
  payload,
  labelFormatter,
  valueFormatter = (v) => v.toLocaleString(),
  hideName = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-popover min-w-32 rounded-xl border px-3 py-2 shadow-lg">
      {label != null && (
        <p className="text-popover-foreground mb-1.5 text-xs font-semibold">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((row, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs whitespace-nowrap"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            {!hideName && (
              <span className="text-muted-foreground">{row.name}</span>
            )}
            <span className="text-foreground ml-auto font-medium tabular-nums">
              {typeof row.value === "number"
                ? valueFormatter(row.value)
                : row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One key in a chart's legend: a dot in the series' color and its name. */
export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="type-caption">{label}</span>
    </div>
  );
}
