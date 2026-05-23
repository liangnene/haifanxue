import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "请求体必须是 multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "未找到上传的文件" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "文件超过 20MB 上限" }, { status: 413 });
  }

  const name = file.name || "uploaded";
  const lower = name.toLowerCase();

  try {
    if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type.startsWith("text/")) {
      const text = await file.text();
      return NextResponse.json({ text, kind: "text", name });
    }

    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const buf = Buffer.from(await file.arrayBuffer());
      const mod = await import("pdf-parse");
      const pdfParse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string; numpages: number }> }).default;
      const parsed = await pdfParse(buf);
      const text = (parsed.text || "").trim();
      if (!text) {
        return NextResponse.json(
          {
            error: "看起来是扫描版 PDF 或无文字内容，目前只支持文字版 PDF。",
            kind: "pdf-empty",
          },
          { status: 422 }
        );
      }
      return NextResponse.json({
        text,
        kind: "pdf",
        name,
        pages: parsed.numpages,
      });
    }

    return NextResponse.json(
      { error: `不支持的文件类型：${name}。当前仅支持 .pdf / .txt / .md` },
      { status: 415 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: `解析失败：${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
