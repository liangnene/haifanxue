type Props = {
  size?: number;
  showWordmark?: boolean;
};

export function BrandMark({ size = 28, showWordmark = true }: Props) {
  const s = size;
  const stroke = Math.max(1, s * 0.055);

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* SVG 图标：三条弧线交织，象征翻译/流动 */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        {/* 外圆 */}
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="#4f46e5"
          strokeWidth={stroke * 0.8}
          strokeOpacity="0.35"
        />
        {/* 横向椭圆弧（水平轨道） */}
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="5.5"
          stroke="#4f46e5"
          strokeWidth={stroke}
          strokeOpacity="0.9"
        />
        {/* 斜向椭圆弧 45° */}
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="5.5"
          stroke="#7c3aed"
          strokeWidth={stroke}
          strokeOpacity="0.85"
          transform="rotate(60 16 16)"
        />
        {/* 斜向椭圆弧 -45° */}
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="5.5"
          stroke="#2563eb"
          strokeWidth={stroke}
          strokeOpacity="0.85"
          transform="rotate(-60 16 16)"
        />
        {/* 中心点 */}
        <circle cx="16" cy="16" r={stroke * 1.2} fill="#4f46e5" />
      </svg>

      {showWordmark && (
        <span
          style={{
            fontSize: s * 0.62,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          海翻学
        </span>
      )}
    </div>
  );
}
