"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquareText,
  Languages,
  NotebookPen,
  GraduationCap,
  LogOut,
  ChevronDown,
  KeyRound,
  X,
} from "lucide-react";
import { BrandMark } from "./BrandMark";

export type WorkspaceTab = "chat" | "translate" | "cards";

type Props = {
  active: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  nickname: string;
  onOpenOnboarding: () => void;
  onLogout: () => void;
};

const items: { key: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { key: "chat", label: "对话", icon: <MessageSquareText size={17} /> },
  { key: "translate", label: "翻译资料", icon: <Languages size={17} /> },
  { key: "cards", label: "考点卡片", icon: <NotebookPen size={17} /> },
];

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const sessionRaw = localStorage.getItem("haifanxue:session");
    if (!sessionRaw) { setError("未登录"); return; }
    const session = JSON.parse(sessionRaw);
    const email = session.email;

    // 默认账户不允许改密码
    if (email === "2477557938@qq.com") {
      setError("演示账户不支持修改密码");
      return;
    }

    const usersRaw = localStorage.getItem("haifanxue:users");
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    const user = users.find((u: { email: string }) => u.email === email);
    if (!user || user.password !== oldPwd) {
      setError("当前密码不正确");
      return;
    }
    if (newPwd.length < 6) {
      setError("新密码至少 6 位");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("两次输入的新密码不一致");
      return;
    }

    user.password = newPwd;
    localStorage.setItem("haifanxue:users", JSON.stringify(users));
    setSuccess(true);
    setTimeout(onClose, 1200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[340px] rounded-2xl border shadow-xl p-6"
        style={{ background: "rgba(255,255,255,0.98)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">修改密码</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--surface-muted)] text-[var(--text-subtle)]">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4 text-[14px] text-green-600">密码修改成功 ✓</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-[12px] text-[var(--text-muted)] mb-1 block">当前密码</label>
              <input
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                className="hf-input w-full text-[13.5px] px-3 py-2"
                placeholder="输入当前密码"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[12px] text-[var(--text-muted)] mb-1 block">新密码</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="hf-input w-full text-[13.5px] px-3 py-2"
                placeholder="至少 6 位"
              />
            </div>
            <div>
              <label className="text-[12px] text-[var(--text-muted)] mb-1 block">确认新密码</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="hf-input w-full text-[13.5px] px-3 py-2"
                placeholder="再次输入新密码"
              />
            </div>
            {error && (
              <div className="text-[12.5px] text-red-500">{error}</div>
            )}
            <button type="submit" className="hf-btn-primary text-[13.5px] mt-1">
              确认修改
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  active,
  onChange,
  nickname,
  onOpenOnboarding,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <>
      <aside
        className="hidden md:flex flex-col w-[240px] shrink-0 border-r"
        style={{
          borderColor: "var(--border)",
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(16px) saturate(120%)",
          WebkitBackdropFilter: "blur(16px) saturate(120%)",
        }}
      >
        <div className="px-5 pt-5 pb-6">
          <BrandMark size={26} />
        </div>

        <nav className="px-3 flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = item.key === active;
            return (
              <button
                key={item.key}
                onClick={() => onChange(item.key)}
                data-active={isActive}
                className="hf-nav-item group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] text-left"
              >
                <span className="hf-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button
          onClick={onOpenOnboarding}
          className="mx-3 mb-2 flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors"
        >
          <GraduationCap size={16} className="text-[var(--text-subtle)]" />
          新手引导
        </button>

        {/* 账户区 */}
        <div
          className="mx-3 mb-4 mt-1 pt-3 border-t relative"
          style={{ borderColor: "var(--border)" }}
          ref={menuRef}
        >
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-[var(--surface-muted)] transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full grid place-items-center text-[12px] font-medium text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {nickname.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-medium truncate">{nickname}</div>
              <div className="text-[11.5px] text-[var(--text-subtle)]">我的账户</div>
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text-subtle)] transition-transform shrink-0 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border overflow-hidden shadow-lg"
              style={{
                background: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(12px)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full grid place-items-center text-[13px] font-medium text-white shrink-0"
                    style={{ background: "var(--accent)" }}
                  >
                    {nickname.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium truncate">{nickname}</div>
                    <div className="text-[11.5px] text-[var(--text-subtle)]">已登录</div>
                  </div>
                </div>
              </div>

              <div className="p-1.5">
                <button
                  onClick={() => { setMenuOpen(false); setShowChangePwd(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text)] hover:bg-[var(--surface-muted)] transition-colors"
                >
                  <KeyRound size={14} className="text-[var(--text-subtle)]" />
                  修改密码
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </>
  );
}
