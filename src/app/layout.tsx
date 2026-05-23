import type { Metadata } from "next";
import { AmbientBackdrop } from "@/components/AmbientBackdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: "海翻学｜大部头教材，不必硬啃",
  description: "上传日语教材，得到中文笔记。AI 翻译 · 考点卡片 · 智能追问。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col relative"
        suppressHydrationWarning
      >
        <AmbientBackdrop />
        {children}
      </body>
    </html>
  );
}
