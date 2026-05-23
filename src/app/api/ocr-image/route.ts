import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

type TokenCache = { token: string; expiresAt: number };
const globalForToken = globalThis as unknown as {
  __haifanxueBaiduToken?: TokenCache;
};

async function getAccessToken(): Promise<string> {
  const ak = process.env.BAIDU_OCR_API_KEY;
  const sk = process.env.BAIDU_OCR_SECRET_KEY;
  if (!ak || !sk) {
    throw new Error("BAIDU_OCR_API_KEY / BAIDU_OCR_SECRET_KEY 未配置");
  }

  const cached = globalForToken.__haifanxueBaiduToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(
    ak
  )}&client_secret=${encodeURIComponent(sk)}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`获取百度 access_token 失败 (HTTP ${res.status})`);
  }
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!json.access_token) {
    throw new Error(
      `获取百度 access_token 失败：${json.error_description || json.error || "未知错误"}`
    );
  }
  const expiresIn = json.expires_in ?? 30 * 24 * 3600;
  globalForToken.__haifanxueBaiduToken = {
    token: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return json.access_token;
}

type BaiduWord = { words: string };
type BaiduOcrResponse = {
  words_result?: BaiduWord[];
  words_result_num?: number;
  error_code?: number;
  error_msg?: string;
};

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "请求体必须是 multipart/form-data" },
      { status: 400 }
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "未找到上传的图片" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "图片超过 4MB 上限（百度 OCR 限制）" },
      { status: 413 }
    );
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  const body = new URLSearchParams();
  body.set("image", base64);
  body.set("language_type", "JAP");
  body.set("detect_direction", "true");

  const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`;

  const ocrRes = await fetch(ocrUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!ocrRes.ok) {
    return NextResponse.json(
      { error: `百度 OCR 调用失败 (HTTP ${ocrRes.status})` },
      { status: 502 }
    );
  }

  const data = (await ocrRes.json()) as BaiduOcrResponse;
  if (data.error_code) {
    return NextResponse.json(
      {
        error: `百度 OCR 错误：${data.error_msg || data.error_code}`,
        code: data.error_code,
      },
      { status: 502 }
    );
  }

  const text = (data.words_result || []).map((w) => w.words).join("\n").trim();
  if (!text) {
    return NextResponse.json(
      { error: "图片中未识别出文字。请尝试更清晰的图片。" },
      { status: 422 }
    );
  }

  return NextResponse.json({
    text,
    lines: data.words_result_num ?? 0,
    name: file.name,
    kind: "image-ocr",
  });
}
