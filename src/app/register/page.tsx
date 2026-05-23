"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await register({ email, nickname, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-10">
          <BrandMark size={32} />
        </div>

        <div className="hf-card p-8">
          <h1 className="text-[22px] font-semibold tracking-tight">
            创建账号
          </h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-1.5">
            注册海翻学，让 AI 帮你啃下日语大部头。
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5">
                昵称
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="希望我们怎么称呼你"
                className="hf-input w-full px-3.5 py-2.5 text-[14px]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                placeholder="至少 6 位"
                className="hf-input w-full px-3.5 py-2.5 text-[14px]"
                autoComplete="new-password"
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
              {loading ? "创建中…" : "创建账号"}
            </button>
          </form>

          <div className="text-center text-[13px] text-[var(--text-muted)] mt-6">
            已经有账号？{" "}
            <Link
              href="/login"
              className="text-[var(--accent)] hover:underline"
            >
              登录
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
