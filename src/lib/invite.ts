import { supabaseAdmin } from "./supabase-admin";

export type InviteCode = {
  code: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
};

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCodeFormat(code: string): boolean {
  return /^HFX\d{4}$/.test(code);
}

export async function generateCodes(count: number): Promise<{
  ok: true;
  created: string[];
  skipped: string[];
} | { ok: false; error: string }> {
  if (count < 1 || count > 200) {
    return { ok: false, error: "一次生成 1-200 个之间。" };
  }

  const { data: existing, error: listErr } = await supabaseAdmin
    .from("invite_codes")
    .select("code");
  if (listErr) return { ok: false, error: listErr.message };

  const taken = new Set((existing ?? []).map((r) => r.code));
  if (taken.size + count > 10000) {
    return { ok: false, error: "邀请码池已接近上限（HFX0000-HFX9999），请联系开发扩容。" };
  }

  const created: string[] = [];
  const skipped: string[] = [];
  let safety = 0;
  while (created.length < count && safety < count * 20) {
    safety++;
    const num = Math.floor(Math.random() * 10000);
    const code = `HFX${num.toString().padStart(4, "0")}`;
    if (taken.has(code) || created.includes(code)) {
      skipped.push(code);
      continue;
    }
    created.push(code);
  }

  const { error: insertErr } = await supabaseAdmin
    .from("invite_codes")
    .insert(created.map((code) => ({ code })));
  if (insertErr) return { ok: false, error: insertErr.message };

  return { ok: true, created, skipped };
}

export async function consumeCode(code: string, userId: string): Promise<{
  ok: true;
} | { ok: false; error: string }> {
  const normalized = normalizeCode(code);
  if (!isValidCodeFormat(normalized)) {
    return { ok: false, error: "邀请码格式不正确（应为 HFX 加 4 位数字）。" };
  }

  const { data: row, error: selErr } = await supabaseAdmin
    .from("invite_codes")
    .select("code, used_by")
    .eq("code", normalized)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };
  if (!row) return { ok: false, error: "邀请码不存在。" };
  if (row.used_by) return { ok: false, error: "该邀请码已被使用。" };

  // 原子性占用：用 update where used_by is null 防并发
  const { data: claimed, error: updErr } = await supabaseAdmin
    .from("invite_codes")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("code", normalized)
    .is("used_by", null)
    .select("code")
    .maybeSingle();
  if (updErr) return { ok: false, error: updErr.message };
  if (!claimed) return { ok: false, error: "该邀请码刚刚被使用，请换一个。" };

  return { ok: true };
}

export async function listCodes(): Promise<InviteCode[]> {
  const { data, error } = await supabaseAdmin
    .from("invite_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return [];
  return data ?? [];
}
