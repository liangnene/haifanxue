"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BarChart3, Activity, LogOut, Ticket } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { adminLogout, type AdminSession } from "@/lib/admin-auth";

const ADMIN_SESSION_KEY = "haifanxue:admin-session";

let cachedRaw: string | null = null;
let cachedSession: AdminSession | null = null;

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_SESSION_KEY);
}

function getSessionSnapshot(): AdminSession | null {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  try {
    cachedSession = raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

function subscribeAdminSession(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === ADMIN_SESSION_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getServerSnapshot(): AdminSession | null {
  return null;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "总览", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/usage", label: "功能使用分析", icon: <BarChart3 size={16} /> },
  { href: "/admin/api", label: "API 调用监控", icon: <Activity size={16} /> },
  { href: "/admin/invites", label: "邀请码", icon: <Ticket size={16} /> },
];

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSyncExternalStore(
    subscribeAdminSession,
    getSessionSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (!getSessionSnapshot()) {
      router.replace("/admin/login");
    }
  }, [router]);

  function handleLogout() {
    adminLogout();
    cachedRaw = null;
    cachedSession = null;
    router.replace("/admin/login");
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-[13px] text-[var(--text-muted)]">载入中…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex">
      <aside
        className="w-[220px] shrink-0 border-r flex flex-col"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <BrandMark size={26} showWordmark />
          </div>
          <div className="mt-2 text-[11px] tracking-wider text-[var(--text-subtle)]">
            ADMIN CONSOLE
          </div>
        </div>

        <nav className="flex-1 px-3 pl-6">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="hf-nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] mb-1"
                data-active={active}
              >
                <span className="hf-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className="border-t px-4 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-[12px] text-[var(--text-muted)] truncate">
            {session.nickname}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)] truncate mb-3">
            {session.email}
          </div>
          <button
            onClick={handleLogout}
            className="hf-btn-ghost flex items-center gap-2 w-full text-[13px]"
          >
            <LogOut size={14} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <section className="flex-1 min-w-0 px-8 py-8 overflow-x-hidden">
        <header className="mb-7">
          <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-[13.5px] text-[var(--text-muted)] mt-1">
              {subtitle}
            </p>
          )}
        </header>
        {children}
      </section>
    </main>
  );
}
