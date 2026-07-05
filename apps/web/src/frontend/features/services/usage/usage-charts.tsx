import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { usageChartConfig } from "./chart-config";

type SeriesPoint = {
  label: string;
  ok: number;
  err4: number;
  err5: number;
  avgMs: number;
};

export function UsageVolumeChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ChartContainer config={usageChartConfig} className="h-44 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="ok" stackId="status" fill="var(--color-ok)" />
        <Bar dataKey="err4" stackId="status" fill="var(--color-err4)" />
        <Bar
          dataKey="err5"
          stackId="status"
          fill="var(--color-err5)"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function UsageLatencyChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ChartContainer config={usageChartConfig} className="h-44 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
          unit="ms"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="avgMs"
          stroke="var(--color-avgMs)"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
