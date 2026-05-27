import { NextRequest } from "next/server";
import { consumeCode } from "@/lib/invite";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { code?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "请求体无效" }, { status: 400 });
  }
  const { code, userId } = body;
  if (!code || !userId) {
    return Response.json({ ok: false, error: "缺少 code 或 userId" }, { status: 400 });
  }

  const result = await consumeCode(code, userId);
  if (!result.ok) return Response.json(result, { status: 400 });

  // 同步标记 profile.activated_at + invite_code
  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      activated_at: new Date().toISOString(),
      invite_code: code.trim().toUpperCase(),
    })
    .eq("id", userId);
  if (profileErr) {
    return Response.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
