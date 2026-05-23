"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import { EXAMS, findExam } from "@/lib/exams";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
};

const DROPDOWN_WIDTH = 320;
const DROPDOWN_GAP = 8;

export function ExamSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selected = findExam(value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const recalc = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current?.offsetHeight ?? 360;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      let left = rect.left;
      if (left + DROPDOWN_WIDTH > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - DROPDOWN_WIDTH - 8);
      }
      let top = rect.top - DROPDOWN_GAP - dropdownHeight;
      if (top < 8) {
        const below = rect.bottom + DROPDOWN_GAP;
        top = below + dropdownHeight <= viewportHeight - 8
          ? below
          : Math.max(8, viewportHeight - dropdownHeight - 8);
      }
      setPos({ left, top });
    };
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setPos(null);
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-full border transition-colors"
        style={{
          background: selected ? "#f0ecf7" : "rgba(255,255,255,0.7)",
          borderColor: selected ? "#d6cdec" : "var(--border)",
          color: selected ? "#6d5fa6" : "var(--text-muted)",
        }}
      >
        <span className="font-medium">
          {selected ? selected.name : "选择考试方向"}
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="清除选择"
            className="hover:bg-[#e5dff3] rounded p-0.5 -mr-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onChange(null);
                setOpen(false);
              }
            }}
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={13} />
        )}
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed rounded-xl border shadow-lg flex flex-col"
            style={{
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              width: DROPDOWN_WIDTH,
              visibility: pos ? "visible" : "hidden",
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(20px) saturate(120%)",
              WebkitBackdropFilter: "blur(20px) saturate(120%)",
              borderColor: "var(--border)",
              maxHeight: "min(520px, 70vh)",
              zIndex: 100,
            }}
          >
            <div
              className="shrink-0 px-3 py-2 text-[11.5px] text-[var(--text-subtle)] border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <span>选择后，AI 会聚焦该考试领域</span>
              <span className="text-[10.5px] text-[var(--text-subtle)]">
                共 {EXAMS.length} 个
              </span>
            </div>
            <div className="overflow-y-auto">
              {EXAMS.map((exam) => {
                const isActive = exam.id === value;
                return (
                  <button
                    key={exam.id}
                    onClick={() => {
                      onChange(exam.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--surface-muted)] transition-colors flex items-start gap-2"
                  >
                    <span className="flex-shrink-0 mt-0.5 w-4">
                      {isActive && (
                        <Check size={13} className="text-[#6d5fa6]" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-[var(--text)] truncate">
                        {exam.name}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-subtle)] truncate">
                        {exam.nameJa} · {exam.field}
                      </div>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
