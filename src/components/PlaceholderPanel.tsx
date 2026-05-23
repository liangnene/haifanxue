import { Construction } from "lucide-react";

type Props = {
  title: string;
  description: string;
};

export function PlaceholderPanel({ title, description }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center max-w-[420px]">
        <div
          className="w-12 h-12 rounded-xl grid place-items-center mx-auto mb-5"
          style={{ background: "var(--surface-muted)", color: "var(--text-subtle)" }}
        >
          <Construction size={20} />
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
        <p className="text-[14px] text-[var(--text-muted)] mt-2 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
