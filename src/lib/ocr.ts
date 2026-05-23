"use client";

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);
}

export async function ocrImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/ocr-image", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `OCR 失败 (HTTP ${res.status})`);
  }
  return (json.text || "") as string;
}
