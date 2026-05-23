export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`hf-card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[14px] font-medium tracking-tight">{title}</div>
          {subtitle && (
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
