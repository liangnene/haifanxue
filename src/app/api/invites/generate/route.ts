import { NextRequest } from "next/server";
import { generateCodes } from "@/lib/invite";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { count?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "请求体无效" }, { status: 400 });
  }
  const count = Math.floor(body.count ?? 10);
  const result = await generateCodes(count);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
