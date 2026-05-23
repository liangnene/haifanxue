"use client";

import { forwardRef } from "react";
import type { Card } from "@/lib/cards-store";

type Props = {
  card: Card;
  index: number;
  total: number;
  scale?: number;
};

export const CardSquare = forwardRef<HTMLDivElement, Props>(function CardSquare(
  { card, index, total, scale = 1 },
  ref
) {
  const SIZE = 1080;

  return (
    <div
      ref={ref}
      style={{
        width: SIZE,
        height: SIZE,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        background: "#fbfaf6",
        color: "#1a1a1a",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif",
        position: "relative",
        boxSizing: "border-box",
        padding: "84px 88px 88px 88px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 12,
          background: "#3B5BDB",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 22,
          letterSpacing: "0.08em",
          color: "#9a9a9a",
          textTransform: "uppercase",
          marginBottom: 36,
        }}
      >
        <span>考点卡片 · {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span style={{ fontSize: 20 }}>海翻学</span>
      </div>

      <div
        style={{
          fontSize: 56,
          lineHeight: 1.25,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          marginBottom: 56,
          color: "#1a1a1a",
          maxHeight: 160,
          overflow: "hidden",
        }}
      >
        {card.concept || "—"}
      </div>

      <Section label="定义" body={card.definition} bodyFontSize={32} maxHeight={180} />
      <Section
        label="易错点"
        body={card.caution}
        bodyFontSize={28}
        accent="#6d5fa6"
        maxHeight={140}
      />
      <Section
        label="可能考题"
        body={card.question}
        bodyFontSize={28}
        accent="#64748b"
        maxHeight={180}
      />

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 20,
          color: "#9a9a9a",
        }}
      >
        <span>大部头教材，不必硬啃</span>
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          haifanxue.app
        </span>
      </div>
    </div>
  );
});

function Section({
  label,
  body,
  bodyFontSize,
  accent = "#3B5BDB",
  maxHeight,
}: {
  label: string;
  body: string;
  bodyFontSize: number;
  accent?: string;
  maxHeight?: number;
}) {
  if (!body) return null;
  return (
    <div style={{ marginBottom: 36 }}>
      <div
        style={{
          fontSize: 18,
          letterSpacing: "0.12em",
          color: accent,
          textTransform: "uppercase",
          marginBottom: 12,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: bodyFontSize,
          lineHeight: 1.55,
          color: "#1a1a1a",
          maxHeight: maxHeight ?? "none",
          overflow: "hidden",
        }}
      >
        {body}
      </div>
    </div>
  );
}
