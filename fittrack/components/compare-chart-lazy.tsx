"use client";
import dynamic from "next/dynamic";

export type { ChartPoint } from "@/components/compare-chart";

/** The charting library is only downloaded when a friend profile with history is opened. */
export const CompareChart = dynamic(() => import("@/components/compare-chart").then((m) => m.CompareChart), {
  ssr: false,
  loading: () => <div className="h-52 animate-pulse rounded-xl bg-card2" />,
});
