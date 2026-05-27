"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { AuthHero } from "@/components/AuthHero";
import { AuthHeroBackground } from "@/components/AuthHeroBackground";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/");
  }

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden text-white"
      style={{ background: "#000" }}
    >
      <AuthHeroBackground />

      <div className="relative z-20 px-6 sm:px-10 pt-6">
        <div className="inline-flex items-center gap-2 text-white select-none">
          <BrandMark size={28} showWordmark={false} />
          <span
            className="text-[18px] font-semibold tracking-tight"
            style={{ fontFamily: "'Instrument Sans', sans-serif" }}
          >
            海翻学
          </span>
        </div>
      </div>

      <div className="relative z-10 min-h-[calc(100vh-80px)] flex items-center px-6 sm:px-10 lg:px-16 py-12">
        <div className="w-full max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-center">
          <AuthHero />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full max-w-[420px] mx-auto lg:mx-0 lg:justify-self-end"
          >
            <div
              className="rounded-2xl p-7 sm:p-8"
              style={{
                background: "rgba(15, 15, 20, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(20px) saturate(120%)",
                WebkitBackdropFilter: "blur(20px) saturate(120%)",
                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
              }}
            >
              <h2
                className="text-[22px] font-semibold tracking-tight text-white"
                style={{ fontFamily: "'Instrument Sans', sans-serif" }}
              >
                欢迎回来
              </h2>
              <p className="text-[13.5px] text-white/60 mt-1.5">
                登录海翻学，继续你的日语笔记之旅
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-white/65 mb-1.5">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-white/65 mb-1.5">
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="auth-input"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex items-center justify-between gap-3 w-full pl-6 pr-2 py-2 rounded-full bg-white text-[#0a0400] font-medium text-[15px] mt-5 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
                  style={{ fontFamily: "'Instrument Sans', sans-serif" }}
                >
                  <span>{loading ? "登录中…" : "登录"}</span>
                  <span
                    className="grid place-items-center w-10 h-10 rounded-full text-white"
                    style={{ background: "#3054ff" }}
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </span>
                </button>
              </form>

              <div className="text-center text-[13px] text-white/55 mt-5">
                还没有账号？{" "}
                <Link
                  href="/register"
                  className="text-white/85 hover:text-white underline-offset-4 hover:underline"
                >
                  立即注册
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        .auth-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          color: #fff;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .auth-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .auth-input:focus {
          border-color: rgba(180, 192, 255, 0.55);
          background: rgba(255, 255, 255, 0.06);
        }
      `}</style>
    </main>
  );
}
