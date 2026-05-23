"use client";

import { AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChartCard } from "@/components/admin/ChartCard";
import { Sparkline } from "@/components/admin/Sparkline";
import { fetchApi } from "@/lib/admin-data";
import type { ErrorLog } from "@/lib/admin-mock";

const ERROR_TYPE_COLOR: Record<ErrorLog["type"], string> = {
  TIMEOUT: "#f59e0b",
  RATE_LIMIT: "#eab308",
  INVALID_INPUT: "#64748b",
  UPSTREAM_5XX: "#dc2626",
  PARSE_FAILED: "#a855f7",
};

export default function AdminApiPage() {
  const data = fetchApi();

  return (
    <AdminShell
      title="API 调用监控"
      subtitle="三条 API 路由的调用明细与错误日志"
    >
      <ChartCard
        title="路由明细"
        subtitle="按调用量排序 · 近 24h 趋势"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr
                className="text-left text-[12px] text-[var(--text-subtle)]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <th className="py-2.5 pr-4 font-medium">路由</th>
                <th className="py-2.5 px-4 font-medium tabular-nums">调用数</th>
                <th className="py-2.5 px-4 font-medium tabular-nums">P50</th>
                <th className="py-2.5 px-4 font-medium tabular-nums">P95</th>
                <th className="py-2.5 px-4 font-medium tabular-nums">错误率</th>
                <th className="py-2.5 pl-4 font-medium">24h 趋势</th>
              </tr>
            </thead>
            <tbody>
              {data.routes.map((r) => (
                <tr
                  key={r.route}
                  className="hover:bg-[var(--surface-muted)] transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="py-3 pr-4">
                    <code
                      className="text-[12.5px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      {r.route}
                    </code>
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    {r.calls.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 tabular-nums text-[var(--text-muted)]">
                    {r.p50}ms
                  </td>
                  <td className="py-3 px-4 tabular-nums text-[var(--text-muted)]">
                    {r.p95}ms
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    <span
                      style={{
                        color: r.errorRate > 0.03 ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {(r.errorRate * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 pl-4">
                    <Sparkline data={r.trend} width={120} height={26} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="mt-6">
        <ChartCard
          title="错误日志"
          subtitle={`最近 ${data.errors.length} 条`}
          action={
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
              <AlertCircle size={13} />
              <span>仅展示，无告警动作</span>
            </div>
          }
        >
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
                <tr
                  className="text-left text-[12px] text-[var(--text-subtle)]"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <th className="py-2 pr-4 font-medium">时间</th>
                  <th className="py-2 px-4 font-medium">路由</th>
                  <th className="py-2 px-4 font-medium">错误类型</th>
                  <th className="py-2 pl-4 font-medium">摘要</th>
                </tr>
              </thead>
              <tbody>
                {data.errors.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-[var(--surface-muted)] transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="py-2 pr-4 tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                      {e.time}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <code className="text-[12px] text-[var(--text-muted)]">
                        {e.route}
                      </code>
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center text-[11.5px] px-2 py-0.5 rounded-full"
                        style={{
                          background: `${ERROR_TYPE_COLOR[e.type]}1a`,
                          color: ERROR_TYPE_COLOR[e.type],
                        }}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="py-2 pl-4 text-[var(--text)]">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </AdminShell>
  );
}
