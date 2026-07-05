import type { ChartConfig } from "@/components/ui/chart";

export const SUCCESS_GREEN = "#15803d";

export const usageChartConfig = {
  ok: { label: "2xx/3xx", color: SUCCESS_GREEN },
  err4: { label: "4xx", color: "#ec835a" },
  err5: { label: "5xx", color: "#d03b3b" },
  avgMs: { label: "Avg latency", color: "#3b82f6" },
} satisfies ChartConfig;

export type UsageRange = "24h" | "7d" | "30d";

export function mapUsageSeries(
  series: {
    bucket: string;
    count: number;
    ok: number;
    err4: number;
    err5: number;
    latencyMsSum: number;
  }[],
  range: UsageRange,
) {
  return series.map((point) => ({
    ...point,
    avgMs: point.count > 0 ? Math.round(point.latencyMsSum / point.count) : 0,
    label:
      range === "24h"
        ? new Date(point.bucket).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date(point.bucket).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          }),
  }));
}

export function sumUsageTotals(
  series: {
    count: number;
    ok: number;
    err4: number;
    err5: number;
    latencyMsSum: number;
  }[],
) {
  return series.reduce(
    (result, point) => ({
      count: result.count + point.count,
      ok: result.ok + point.ok,
      err4: result.err4 + point.err4,
      err5: result.err5 + point.err5,
      latencyMsSum: result.latencyMsSum + point.latencyMsSum,
    }),
    { count: 0, ok: 0, err4: 0, err5: 0, latencyMsSum: 0 },
  );
}
