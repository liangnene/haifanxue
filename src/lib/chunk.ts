const CHUNK_TARGET = 1200;

export function chunkBySize(text: string, target = CHUNK_TARGET): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= target) return [normalized];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";

  function flushBuf() {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  }

  for (const p of paragraphs) {
    if (p.length > target) {
      flushBuf();
      for (let i = 0; i < p.length; i += target) {
        chunks.push(p.slice(i, i + target));
      }
      continue;
    }
    if ((buf + "\n\n" + p).length > target) {
      flushBuf();
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  flushBuf();
  return chunks;
}
