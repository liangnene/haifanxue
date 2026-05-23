"use client";

import { useState } from "react";
import { Languages, ChevronUp, Loader2 } from "lucide-react";
import { streamChat } from "@/lib/stream";
import { detectLang, type Lang } from "@/lib/lang";

type Props = {
  source: string;
  cached?: string;
  onTranslated: (translation: string) => void;
};

export function TranslateAffordance({ source, cached, onTranslated }: Props) {
  const [translation, setTranslation] = useState<string>(cached || "");
  const [streaming, setStreaming] = useState(false);
  const [expanded, setExpanded] = useState<boolean>(!!cached);
  const [error, setError] = useState<string | null>(null);

  const sourceLang: Lang = detectLang(source);
  const targetLabel = sourceLang === "ja" ? "中文" : "日语";
  const mode = sourceLang === "ja" ? "ja2zh" : "zh2ja";

  async function handleClick() {
    if (translation) {
      setExpanded((v) => !v);
      return;
    }
    setStreaming(true);
    setExpanded(true);
    setError(null);

    let acc = "";
    await streamChat(
      [{ role: "user", content: source }],
      mode,
      {
        onChunk: (chunk) => {
          acc += chunk;
          setTranslation(acc);
        },
        onDone: () => {
          setStreaming(false);
          if (acc) onTranslated(acc);
        },
        onError: (msg) => {
          setStreaming(false);
          setError(msg);
          setExpanded(false);
        },
      }
    );
  }

  if (!source.trim()) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={handleClick}
        disabled={streaming}
        className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-md text-[var(--text-subtle)] hover:bg-[var(--surface-muted)] hover:text-[#6d5fa6] transition-colors disabled:opacity-60"
      >
        {streaming ? (
          <Loader2 size={12} className="animate-spin" />
        ) : expanded && translation ? (
          <ChevronUp size={12} />
        ) : (
          <Languages size={12} />
        )}
        {translation
          ? expanded
            ? "收起译文"
            : `查看${targetLabel}译文`
          : `翻译成${targetLabel}`}
      </button>

      {expanded && (translation || streaming) && (
        <div
          className="mt-2 px-3 py-2.5 rounded-lg text-[13.5px] leading-relaxed whitespace-pre-wrap"
          style={{
            background: "rgba(240, 236, 247, 0.6)",
            borderLeft: "2px solid #c4b5fd",
            color: "var(--text)",
          }}
        >
          {translation}
          {streaming && (
            <span
              className="inline-block w-[6px] h-[12px] align-[-1px] ml-0.5 animate-pulse"
              style={{ background: "var(--text-muted)" }}
            />
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 text-[12px] text-red-600">
          翻译失败：{error}
        </div>
      )}
    </div>
  );
}
