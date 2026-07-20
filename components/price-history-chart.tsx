"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PriceHistoryChart({ data }: { data: { date: string; normal: number; loyalty?: number | null }[] }) {
  if (data.length === 0) {
    return <p className="rounded-md bg-market p-4 text-sm text-ink/65">No price history yet.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={["dataMin", "dataMax"]} />
          <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Price"]} />
          <Line type="monotone" dataKey="normal" stroke="#1f7a4d" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="loyalty" stroke="#a23b72" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
