"use client";

const ADMIN_SESSION_KEY = "haifanxue:admin-session";

const SUPER_ADMIN = {
  email: "2477557938@qq.com",
  password: "liangzhi521",
  nickname: "超级管理员",
};

export type AdminSession = {
  email: string;
  nickname: string;
  loginAt: number;
};

export function adminLogin(input: {
  email: string;
  password: string;
}): { ok: true; session: AdminSession } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    return { ok: false, error: "请填写邮箱和密码。" };
  }
  if (email !== SUPER_ADMIN.email || password !== SUPER_ADMIN.password) {
    return { ok: false, error: "邮箱或密码不正确。" };
  }

  const session: AdminSession = {
    email: SUPER_ADMIN.email,
    nickname: SUPER_ADMIN.nickname,
    loginAt: Date.now(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function adminLogout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}
