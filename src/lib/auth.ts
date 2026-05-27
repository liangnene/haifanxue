"use client";

import { supabase } from "./supabase";

export type Session = {
  email: string;
  nickname: string;
  userId: string;
};

export async function register(input: {
  email: string;
  nickname: string;
  password: string;
  inviteCode: string;
}): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const nickname = input.nickname.trim();
  const password = input.password;
  const inviteCode = input.inviteCode.trim().toUpperCase();

  if (!email || !nickname || !password) {
    return { ok: false, error: "请填写完整的邮箱、昵称和密码。" };
  }
  if (!inviteCode) {
    return { ok: false, error: "请填写邀请码。" };
  }
  if (!/^HFX\d{4}$/.test(inviteCode)) {
    return { ok: false, error: "邀请码格式不正确（应为 HFX 加 4 位数字，例如 HFX0001）。" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "邮箱格式不正确。" };
  }
  if (password.length < 6) {
    return { ok: false, error: "密码至少 6 位。" };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.message.includes("already registered")) {
      return { ok: false, error: "该邮箱已注册，请直接登录。" };
    }
    return { ok: false, error: error.message };
  }

  const userId = data.user?.id;
  if (!userId) return { ok: false, error: "注册失败，请重试。" };

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, nickname });
  if (profileError) {
    return { ok: false, error: "保存昵称失败：" + profileError.message };
  }

  // 消费邀请码（服务端校验 + 占用 + 标记 profile.activated_at）
  const consumeRes = await fetch("/api/invites/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: inviteCode, userId }),
  });
  const consumeData = await consumeRes.json().catch(() => ({ ok: false, error: "网络错误" }));
  if (!consumeData.ok) {
    // 邀请码无效就清理刚创建的 auth 用户和 profile，避免脏数据
    await supabase.auth.signOut();
    return { ok: false, error: consumeData.error || "邀请码激活失败" };
  }

  return { ok: true, session: { email, nickname, userId } };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    return { ok: false, error: "请填写邮箱和密码。" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { ok: false, error: "邮箱或密码不正确。" };
  }

  const userId = data.user.id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .single();

  const nickname = profile?.nickname ?? email.split("@")[0];
  return { ok: true, session: { email, nickname, userId } };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  return {
    email: user.email ?? "",
    nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "",
    userId: user.id,
  };
}

export async function hasOnboarded(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", userId)
    .single();
  return data?.onboarded ?? false;
}

export async function markOnboarded(userId: string) {
  await supabase
    .from("profiles")
    .update({ onboarded: true })
    .eq("id", userId);
}
