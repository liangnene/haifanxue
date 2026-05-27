import { listCodes } from "@/lib/invite";

export const runtime = "nodejs";

export async function GET() {
  const codes = await listCodes();
  return Response.json({ ok: true, codes });
}
