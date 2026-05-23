"use client";

import { useState } from "react";
import { X, MessageSquareText, Languages, NotebookPen } from "lucide-react";

type Step = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    icon: <MessageSquareText size={22} />,
    title: "粘贴日语，或者直接提问",
    body: "把不懂的日语段落粘到对话框，或者直接问『善意第三者是什么』这类问题。AI 会用中文回答你。",
  },
  {
    icon: <Languages size={22} />,
    title: "选择你要的形式",
    body: "可以让 AI 给你高质量翻译，也可以让它把这段内容做成考点卡片。两种输出都能继续追问。",
  },
  {
    icon: <NotebookPen size={22} />,
    title: "上传整章资料",
    body: "侧边栏的『翻译资料』里可以上传 PDF、图片或 txt，AI 会按段落处理。先粘短段熟悉，再上传整章。",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingModal({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);

  if (!open) return null;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  function handleNext() {
    if (isLast) {
      onClose();
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(20, 20, 20, 0.32)" }}
      onClick={onClose}
    >
      <div
        className="hf-card w-full max-w-[460px] p-8 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="absolute top-4 right-4 text-[var(--text-subtle)] hover:text-[var(--text)]"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} />
        </button>

        <div
          className="w-11 h-11 rounded-xl grid place-items-center mb-5"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {step.icon}
        </div>

        <h2 className="text-[19px] font-semibold tracking-tight">
          {step.title}
        </h2>
        <p className="text-[14px] leading-relaxed text-[var(--text-muted)] mt-2.5">
          {step.body}
        </p>

        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 20 : 6,
                  background:
                    i === index
                      ? "var(--accent)"
                      : "var(--border-strong)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isLast && (
              <button className="hf-btn-ghost text-[13px]" onClick={onClose}>
                跳过
              </button>
            )}
            <button
              className="hf-btn-primary text-[13px] px-5 py-2"
              onClick={handleNext}
            >
              {isLast ? "开始使用" : "下一步"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
