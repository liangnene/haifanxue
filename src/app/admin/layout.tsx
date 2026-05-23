import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "海翻学 · 管理后台",
  description: "海翻学产品管理后台",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 flex flex-col">
      <div
        aria-hidden
        className="fixed inset-0 -z-[5] pointer-events-none"
        style={{ background: "var(--bg)" }}
      />
      {children}
    </div>
  );
}
