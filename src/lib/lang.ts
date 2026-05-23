export type Lang = "ja" | "zh";

export function detectLang(text: string): Lang {
  let jaScore = 0;
  let zhScore = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (!code) continue;
    if (
      (code >= 0x3040 && code <= 0x309f) ||
      (code >= 0x30a0 && code <= 0x30ff)
    ) {
      jaScore += 2;
    } else if (code >= 0x4e00 && code <= 0x9fff) {
      zhScore += 1;
    }
  }
  return jaScore > zhScore ? "ja" : "zh";
}
