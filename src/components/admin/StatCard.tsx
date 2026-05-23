import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: number;
  hint?: string;
}) {
  const positive = typeof delta === "number" ? delta >= 0 : null;
  const deltaColor = positive === null
    ? "var(--text-subtle)"
    : positive
      ? "#16a34a"
      : "#dc2626";

  return (
    <div className="hf-card p-5">
      <div className="text-[12.5px] text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-[26px] font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        {typeof delta === "number" && (
          <div
            className="flex items-center gap-0.5 text-[12px]"
            style={{ color: deltaColor }}
          >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span className="tabular-nums">
              {positive ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      {hint && (
        <div className="mt-1.5 text-[11.5px] text-[var(--text-subtle)]">
          {hint}
        </div>
      )}
    </div>
  );
}
