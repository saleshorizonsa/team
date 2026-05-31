"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { formatSAR } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#3b82f6",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

function periodLabel(p: string) {
  const [y, m] = p.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

const compactSAR = (v: number) =>
  `SAR ${v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}`;

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  },
};

export function ProfitChart({ data }: { data: { period: string; sales: number; profit: number }[] }) {
  if (data.length === 0) return <Empty />;
  const rows = data.map((d) => ({ ...d, label: periodLabel(d.period) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tickFormatter={compactSAR} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
        <Tooltip {...tooltipStyle} formatter={(v) => formatSAR(Number(v))} />
        <Line type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  if (data.every((d) => d.count === 0)) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
          {data.map((d) => <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#94a3b8"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CommissionChart({
  data,
}: {
  data: { userId: string; name: string; amount: number; isMe: boolean }[];
}) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tickFormatter={compactSAR} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={90} />
        <Tooltip {...tooltipStyle} formatter={(v) => formatSAR(Number(v))} />
        <Bar dataKey="amount" name="Commission" radius={[0, 4, 4, 0]}>
          {data.map((d) => <Cell key={d.userId} fill={d.isMe ? "#2563eb" : "#cbd5e1"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      No data for this range
    </div>
  );
}
