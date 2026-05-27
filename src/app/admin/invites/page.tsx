"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, RotateCw, Ticket } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

type InviteCode = {
  code: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
};

export default function AdminInvitesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/list");
      const data = await res.json();
      if (data.ok) setCodes(data.codes ?? []);
      else setError(data.error || "加载失败");
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setJustCreated([]);
    try {
      const res = await fetch("/api/invites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (data.ok) {
        setJustCreated(data.created ?? []);
        await load();
      } else {
        setError(data.error || "生成失败");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    }
    setGenerating(false);
  }

  function copyJustCreated() {
    if (justCreated.length === 0) return;
    navigator.clipboard.writeText(justCreated.join("\n"));
  }

  const usedCount = codes.filter((c) => c.used_by).length;
  const availableCount = codes.length - usedCount;

  return (
    <AdminShell title="邀请码" subtitle="生成、查看、管理用户注册邀请码">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatBlock label="总计" value={codes.length} />
          <StatBlock label="可用" value={availableCount} accent />
          <StatBlock label="已使用" value={usedCount} />
        </div>

        <div className="hf-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Ticket size={16} className="text-[var(--accent)]" />
            <h2 className="text-[15px] font-semibold">生成新邀请码</h2>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-[180px]">
              <label className="block text-[12.5px] text-[var(--text-muted)] mb-1.5">
                数量（1-200）
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                className="hf-input w-full px-3 py-2 text-[14px]"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="hf-btn-primary px-5 py-2 text-[13.5px] flex items-center gap-2"
            >
              {generating && <Loader2 size={14} className="animate-spin" />}
              {generating ? "生成中…" : "生成"}
            </button>
          </div>

          {justCreated.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border" style={{ background: "#f4f0fc", borderColor: "#e0d6f5" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-medium text-[#6d5fa6]">
                  ✓ 刚刚生成 {justCreated.length} 个邀请码
                </div>
                <button onClick={copyJustCreated} className="hf-btn-ghost text-[12px] flex items-center gap-1">
                  <Copy size={12} /> 复制
                </button>
              </div>
              <div className="text-[13px] font-mono leading-relaxed text-[var(--text)] max-h-[160px] overflow-y-auto">
                {justCreated.join("  ")}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="hf-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold">已生成的邀请码（最近 500 条）</h2>
            <button onClick={load} disabled={loading} className="hf-btn-ghost text-[12.5px] flex items-center gap-1.5">
              <RotateCw size={12} className={loading ? "animate-spin" : ""} />
              刷新
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-[13px] text-[var(--text-muted)]">载入中…</div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-[var(--text-muted)]">还没有任何邀请码，先生成一批吧</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-[var(--text-muted)] border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="py-2 pr-4 font-medium">邀请码</th>
                    <th className="py-2 pr-4 font-medium">状态</th>
                    <th className="py-2 pr-4 font-medium">使用者</th>
                    <th className="py-2 pr-4 font-medium">使用时间</th>
                    <th className="py-2 font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.code} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 pr-4 font-mono">{c.code}</td>
                      <td className="py-2 pr-4">
                        {c.used_by ? (
                          <span className="text-[12px] px-1.5 py-0.5 rounded" style={{ background: "#f5e8e8", color: "#a85050" }}>已用</span>
                        ) : (
                          <span className="text-[12px] px-1.5 py-0.5 rounded" style={{ background: "#e8f5ec", color: "#3d8d5b" }}>可用</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-mono text-[11.5px] text-[var(--text-subtle)]">
                        {c.used_by ? c.used_by.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="py-2 pr-4 text-[12px] text-[var(--text-muted)]">
                        {c.used_at ? new Date(c.used_at).toLocaleString("zh-CN") : "—"}
                      </td>
                      <td className="py-2 text-[12px] text-[var(--text-muted)]">
                        {new Date(c.created_at).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="hf-card p-4">
      <div className="text-[12px] text-[var(--text-muted)]">{label}</div>
      <div
        className="text-[26px] font-semibold mt-1 tracking-tight"
        style={{ color: accent ? "var(--accent)" : "var(--text)" }}
      >
        {value}
      </div>
    </div>
  );
}
