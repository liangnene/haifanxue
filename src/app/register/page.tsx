"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { AuthHero } from "@/components/AuthHero";
import { AuthHeroBackground } from "@/components/AuthHeroBackground";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await register({ email, nickname, password, inviteCode });
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

      {/* 顶部 logo */}
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
          {/* 左侧 Hero */}
          <AuthHero />

          {/* 右侧黑玻璃表单 */}
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
                创建账号
              </h2>
              <p className="text-[13.5px] text-white/60 mt-1.5">
                海翻学目前仅对持有邀请码的用户开放
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
                <DarkField label="昵称">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="希望我们怎么称呼你"
                    className="auth-input"
                  />
                </DarkField>

                <DarkField label="邮箱">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                    autoComplete="email"
                  />
                </DarkField>

                <DarkField label="密码">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="auth-input"
                    autoComplete="new-password"
                  />
                </DarkField>

                <DarkField label="邀请码">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="HFX0000"
                    maxLength={7}
                    className="auth-input tracking-wider"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </DarkField>

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
                  <span>{loading ? "创建中…" : "创建账号"}</span>
                  <span
                    className="grid place-items-center w-10 h-10 rounded-full text-white transition-colors"
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
                已经有账号？{" "}
                <Link
                  href="/login"
                  className="text-white/85 hover:text-white underline-offset-4 hover:underline"
                >
                  登录
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

function DarkField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-white/65 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
