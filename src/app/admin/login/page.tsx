"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { adminLogin } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = adminLogin({ email, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-10">
          <BrandMark size={32} />
        </div>

        <div className="hf-card p-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[22px] font-semibold tracking-tight">
              管理后台
            </h1>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              ADMIN
            </span>
          </div>
          <p className="text-[14px] text-[var(--text-muted)] mt-1.5">
            仅限超级管理员访问。
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@haifanxue"
                className="hf-input w-full px-3.5 py-2.5 text-[14px]"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入超管密码"
                className="hf-input w-full px-3.5 py-2.5 text-[14px]"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="hf-btn-primary w-full py-2.5 text-[14px] mt-2"
            >
              {loading ? "登录中…" : "进入后台"}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-[var(--text-subtle)] mt-6">
          后台账号与 C 端账号互不相通。
        </p>
      </div>
    </main>
  );
}
