"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { ChartCard } from "@/components/admin/ChartCard";
import { fetchDashboard } from "@/lib/admin-data";

function formatNumber(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return n.toLocaleString();
  return `${n}`;
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default function AdminDashboardPage() {
  const data = fetchDashboard();
  const today = data.trend30d[data.trend30d.length - 1].date;

  return (
    <AdminShell
      title="总览"
      subtitle={`数据截至 ${today}（演示数据，未接入真实埋点）`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="今日活跃用户"
          value={formatNumber(data.dauToday)}
          delta={data.dauDelta}
          hint="DAU · 较昨日"
        />
        <StatCard
          label="累计注册用户"
          value={formatNumber(data.totalUsers)}
          delta={data.totalUsersDelta}
          hint="较上周"
        />
        <StatCard
          label="今日 API 调用"
          value={formatNumber(data.apiCallsToday)}
          delta={data.apiCallsDelta}
          hint="三条路由合计"
        />
        <StatCard
          label="今日 Token 消耗"
          value={formatTokens(data.tokensToday)}
          delta={data.tokensDelta}
          hint="估算 · DeepSeek + OpenAI"
        />
      </div>

      <div className="mt-6">
        <ChartCard
          title="近 30 天趋势"
          subtitle="DAU / API 调用 / 文档上传，同轴对比"
        >
          <div style={{ width: "100%", height: 320, minWidth: 0 }}>
            <ResponsiveContainer>
              <LineChart
                data={data.trend30d}
                margin={{ top: 8, right: 16, bottom: 0, left: -10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--text-subtle)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  interval={4}
                  tickFormatter={(s: string) => s.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-subtle)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-muted)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="dau"
                  name="DAU"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="apiCalls"
                  name="API 调用"
                  stroke="#a5b4fc"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="uploads"
                  name="文档上传"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </AdminShell>
  );
}
