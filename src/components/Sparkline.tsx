"use client";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

export default function Sparkline({
  data,
  color = "#7a0f17",
  height = 60,
}: {
  data: { x: string; y: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 4 }}
            labelStyle={{ color: "#666" }}
            formatter={(v: number) => v.toLocaleString("en-PH")}
          />
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
