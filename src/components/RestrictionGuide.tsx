"use client";

import { Info } from "lucide-react";
import { EXAMS } from "@/lib/exams";

type Props = {
  onPick: (sample: string, examId: string) => void;
  onDismiss: () => void;
};

export function RestrictionGuide({ onPick, onDismiss }: Props) {
  return (
    <div
      className="rounded-2xl border p-5 mb-4"
      style={{
        background: "rgba(255, 255, 255, 0.88)",
        borderColor: "#e5dff3",
        backdropFilter: "blur(14px) saturate(120%)",
        WebkitBackdropFilter: "blur(14px) saturate(120%)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center"
          style={{ background: "#f0ecf7", color: "#6d5fa6" }}
        >
          <Info size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14.5px] font-semibold text-[var(--text)]">
            海翻学只回答 15 个日本国家资格考试相关问题
          </h3>
          <p className="text-[13px] text-[var(--text-muted)] mt-1 leading-relaxed">
            点击下方任意考试，立即试一个示例问题：
          </p>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3 overflow-y-auto pr-1"
            style={{ maxHeight: 200 }}
          >
            {EXAMS.map((exam) => (
              <button
                key={exam.id}
                onClick={() => onPick(exam.sample, exam.id)}
                className="text-left px-2.5 py-1.5 rounded-md hover:bg-[var(--surface-muted)] transition-colors group"
              >
                <div className="text-[12.5px] font-medium text-[var(--text)] truncate">
                  {exam.name}
                </div>
                <div className="text-[11px] text-[var(--text-subtle)] truncate group-hover:text-[#6d5fa6] transition-colors">
                  {exam.sample}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onDismiss}
            className="text-[12px] text-[var(--text-subtle)] hover:text-[var(--text-muted)] mt-3"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
