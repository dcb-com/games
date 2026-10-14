import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCanvas } from "~/dashboard/components/dashboard/chart-canvas";
import {
  AXIS_TICK,
  ChartTooltip,
} from "~/dashboard/components/dashboard/chart-theme";
import { tickLines } from "~/dashboard/components/dashboard/tick-lines";

const MARGIN = { top: 0, right: 28, left: 0, bottom: 0 };

// About how wide one character of a 12px axis label is. A label longer than
// its column wraps onto a second line at a space; only a name that still
// does not fit in two lines is cut with an ellipsis, and the whole name shows
// on hover.
const CHAR_WIDTH = 6.2;
const LINE_HEIGHT = 14;

function WrappedTick({
  x,
  y,
  payload,
  width,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  width: number;
}) {
  const name = payload?.value ?? "";
  const room = Math.max(4, Math.floor((width - 8) / CHAR_WIDTH));
  const lines = tickLines(name, room);
  // Two lines sit either side of the bar's middle.
  const firstDy = 4 - ((lines.length - 1) * LINE_HEIGHT) / 2;
  return (
    <text
      x={x}
      y={y}
      textAnchor="end"
      fill={AXIS_TICK.fill}
      fontSize={AXIS_TICK.fontSize}
      fontFamily={AXIS_TICK.fontFamily}
    >
      <title>{name}</title>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? firstDy : LINE_HEIGHT}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

interface RankedBarChartItem {
  name: string;
  count: number;
}

// Recharts reads `fill` straight off each data entry, so per-bar color is baked into the data, not a `<Cell>` per bar.
export function RankedBarChart<T extends RankedBarChartItem>({
  items,
  axisWidth,
  barCategoryGap,
  maxBarSize,
  fillFor,
}: {
  items: T[];
  axisWidth: number;
  barCategoryGap: number;
  maxBarSize: number;
  fillFor: (item: T, index: number) => string;
}) {
  const data = items.map((item, i) => ({ ...item, fill: fillFor(item, i) }));

  return (
    <ChartCanvas>
      <BarChart
        layout="vertical"
        data={data}
        margin={MARGIN}
        barCategoryGap={barCategoryGap}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={<WrappedTick width={axisWidth} />}
          tickLine={false}
          axisLine={false}
          width={axisWidth}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          content={<ChartTooltip hideName />}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={maxBarSize}>
          <LabelList
            dataKey="count"
            position="right"
            className="fill-muted-foreground text-xs tabular-nums"
          />
        </Bar>
      </BarChart>
    </ChartCanvas>
  );
}
