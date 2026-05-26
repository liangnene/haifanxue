"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { MessageSquare, FileText, Layers } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChartCard } from "@/components/admin/ChartCard";
import { Sparkline } from "@/components/admin/Sparkline";
import { fetchUsage } from "@/lib/admin-data";
import type { FeatureKey } from "@/lib/admin-mock";

const FEATURE_ICON: Record<FeatureKey, React.ReactNode> = {
  chat: <MessageSquare size={16} />,
  translate: <FileText size={16} />,
  cards: <Layers size={16} />,
};

const FEATURE_DESC: Record<FeatureKey, string> = {
  chat: "AI 对话 · 带 RAG 检索",
  translate: "日 → 中 教材翻译",
  cards: "考点四段式卡片生成",
};

export default function AdminUsagePage() {
  const data = fetchUsage();

  return (
    <AdminShell
      title="功能使用分析"
      subtitle="对话 / 翻译资料 / 考点卡片 三大功能的使用情况"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.features.map((f) => (
          <div key={f.key} className="hf-card p-5">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <span style={{ color: "var(--accent)" }}>
                {FEATURE_ICON[f.key]}
              </span>
              <span className="text-[13px] font-medium text-[var(--text)]">
                {f.name}
              </span>
            </div>
            <div className="text-[11.5px] text-[var(--text-subtle)] mt-1">
              {FEATURE_DESC[f.key]}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-[var(--text-subtle)]">
                  调用数
                </div>
                <div className="text-[20px] font-semibold tabular-nums tracking-tight">
                  {f.calls.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-subtle)]">
                  使用用户
                </div>
                <div className="text-[20px] font-semibold tabular-nums tracking-tight">
                  {f.users.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-subtle)]">
                  平均时长
                </div>
                <div className="text-[16px] font-medium tabular-nums">
                  {(f.avgDurationMs / 1000).toFixed(2)}s
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-subtle)]">
                  近 14 天
                </div>
                <div className="mt-1">
                  <Sparkline data={f.trend} width={84} height={22} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <ChartCard
          title="热门考试类型 TOP"
          subtitle="用户选择考试类型分布"
          className="lg:col-span-2"
        >
          <div style={{ width: "100%", height: 260, minWidth: 0 }}>
            <ResponsiveContainer>
              <BarChart
                data={data.examTypes}
                layout="vertical"
                margin={{ top: 8, right: 20, bottom: 0, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--text-subtle)" }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--text)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${v ?? ""}%`, "占比"] as [string, string]}
                />
                <Bar
                  dataKey="value"
                  fill="var(--accent)"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="对话质量指标"
          subtitle="基于 chat + RAG 的命中情况"
        >
          <div className="space-y-4">
            <QualityRow
              label="平均轮次"
              value={`${data.chatQuality.avgTurns.toFixed(1)} 轮`}
              hint="单次会话内对话往返次数"
            />
            <QualityRow
              label="平均提问长度"
              value={`${data.chatQuality.avgQuestionLen} 字`}
              hint="用户单条消息字符数"
            />
            <QualityRow
              label="RAG 命中率"
              value={`${(data.chatQuality.ragHitRate * 100).toFixed(0)}%`}
              hint="问答用到检索上下文的比例"
              progress={data.chatQuality.ragHitRate}
            />
          </div>
        </ChartCard>
      </div>
    </AdminShell>
  );
}

function QualityRow({
  label,
  value,
  hint,
  progress,
}: {
  label: string;
  value: string;
  hint: string;
  progress?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] text-[var(--text-muted)]">{label}</div>
        <div className="text-[16px] font-semibold tabular-nums tracking-tight">
          {value}
        </div>
      </div>
      <div className="text-[11.5px] text-[var(--text-subtle)] mt-0.5">
        {hint}
      </div>
      {typeof progress === "number" && (
        <div
          className="mt-2 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--surface-muted)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      )}
    </div>
  );
}
