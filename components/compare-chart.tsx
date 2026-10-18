"use client";
import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartPoint = { label: string; me: number | null; friend: number | null };

const AXIS = "#8e8e96";

function useAccent() {
  const [c, setC] = useState("#34d36c");
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (v) setC(`rgb(${v.split(/\s+/).join(",")})`);
  }, []);
  return c;
}

export function CompareChart({ data, unit, friendName, showFriend = true }: { data: ChartPoint[]; unit: string; friendName: string; showFriend?: boolean }) {
  const accent = useAccent();
  return (
    <div className="h-52 w-full" role="img" aria-label={`Daily ${unit} chart comparing you and ${friendName}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(128,128,128,0.2)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
          <YAxis tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#16161a", border: "1px solid #2c2c30", borderRadius: 12, fontSize: 12, color: "#f5f5f7" }} formatter={(v) => `${Math.round(Number(v)).toLocaleString("en-US")} ${unit}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="me" name="You" stroke={accent} strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
          {showFriend && <Line dataKey="friend" name={friendName} stroke="#a1a1aa" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
