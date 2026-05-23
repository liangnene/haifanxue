"use client";

import { loadDocs } from "./translate-store";
import { loadDecks } from "./cards-store";

export type Chunk = {
  id: string;
  source: string;
  sourceType: "translate" | "cards";
  sourceTitle: string;
  sourceId: string;
  segmentIndex: number;
  text: string;
};

const CHUNK_TARGET = 280;

function splitParagraphs(text: string): string[] {
  if (!text) return [];
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|\n(?=[「『（【])/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if (p.length > CHUNK_TARGET) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      for (let i = 0; i < p.length; i += CHUNK_TARGET) {
        chunks.push(p.slice(i, i + CHUNK_TARGET));
      }
      continue;
    }
    if ((buf + "\n\n" + p).length > CHUNK_TARGET) {
      if (buf) chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export async function collectChunks(userKey: string): Promise<Chunk[]> {
  const out: Chunk[] = [];

  for (const doc of await loadDocs(userKey)) {
    const text = [doc.source, doc.translation].filter(Boolean).join("\n\n");
    const pieces = splitParagraphs(text);
    pieces.forEach((p, i) => {
      out.push({
        id: `${doc.id}-${i}`,
        source: "翻译资料",
        sourceType: "translate",
        sourceTitle: doc.title || "未命名翻译",
        sourceId: doc.id,
        segmentIndex: i,
        text: p,
      });
    });
  }

  for (const deck of await loadDecks(userKey)) {
    const cardText = deck.cards
      .map(
        (c) =>
          `【${c.concept}】\n${c.definition}\n易错点：${c.caution}\n考题：${c.question}`
      )
      .join("\n\n");
    const text = [deck.source, cardText].filter(Boolean).join("\n\n");
    const pieces = splitParagraphs(text);
    pieces.forEach((p, i) => {
      out.push({
        id: `${deck.id}-${i}`,
        source: "考点卡片",
        sourceType: "cards",
        sourceTitle: deck.title || "未命名卡片",
        sourceId: deck.id,
        segmentIndex: i,
        text: p,
      });
    });
  }

  return out;
}

function isCjk(ch: string): boolean {
  const code = ch.codePointAt(0) || 0;
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0x3400 && code <= 0x4dbf)
  );
}

const STOPWORDS = new Set([
  "的", "了", "是", "在", "和", "与", "或", "为", "等", "中",
  "上", "下", "什么", "怎么", "如何", "有", "可以", "请", "我", "你",
  "他", "她", "它", "这", "那", "一", "也", "都", "之", "之类",
  "什么", "哪里", "哪个", "时候", "及", "并", "对", "由", "用", "啊",
  "啦", "吗", "呢", "吧", "的", "地", "得",
  "the", "a", "an", "of", "is", "are", "and", "or", "to", "in",
  "for", "on", "at", "by", "with", "as", "be", "this", "that",
]);

function tokenize(text: string): string[] {
  if (!text) return [];
  const tokens: string[] = [];
  let asciiBuf = "";
  const flushAscii = () => {
    if (asciiBuf) {
      const t = asciiBuf.toLowerCase();
      if (t.length >= 2 && !STOPWORDS.has(t)) tokens.push(t);
      asciiBuf = "";
    }
  };
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/[A-Za-z0-9]/.test(ch)) {
      asciiBuf += ch;
      continue;
    }
    flushAscii();
    if (isCjk(ch)) {
      tokens.push(ch);
      if (i + 1 < chars.length && isCjk(chars[i + 1])) {
        const bigram = ch + chars[i + 1];
        if (!STOPWORDS.has(bigram)) tokens.push(bigram);
      }
    }
  }
  flushAscii();
  return tokens.filter((t) => !STOPWORDS.has(t));
}

type IndexedChunk = {
  chunk: Chunk;
  tf: Map<string, number>;
  len: number;
};

function buildIndex(chunks: Chunk[]) {
  const indexed: IndexedChunk[] = chunks.map((c) => {
    const tokens = tokenize(c.text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { chunk: c, tf, len: tokens.length };
  });
  const df = new Map<string, number>();
  for (const ic of indexed) {
    for (const term of ic.tf.keys()) df.set(term, (df.get(term) || 0) + 1);
  }
  const avgLen =
    indexed.length > 0
      ? indexed.reduce((s, ic) => s + ic.len, 0) / indexed.length
      : 0;
  return { indexed, df, avgLen, n: indexed.length };
}

export type Retrieved = {
  chunk: Chunk;
  score: number;
};

export function retrieve(
  query: string,
  chunks: Chunk[],
  topK = 3
): Retrieved[] {
  if (chunks.length === 0) return [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const { indexed, df, avgLen, n } = buildIndex(chunks);
  const k1 = 1.5;
  const b = 0.75;

  const scored: Retrieved[] = indexed.map((ic) => {
    let score = 0;
    for (const term of queryTokens) {
      const tfCount = ic.tf.get(term);
      if (!tfCount) continue;
      const dfCount = df.get(term) || 1;
      const idf = Math.log(1 + (n - dfCount + 0.5) / (dfCount + 0.5));
      const denom = tfCount + k1 * (1 - b + (b * ic.len) / (avgLen || 1));
      score += idf * ((tfCount * (k1 + 1)) / denom);
    }
    return { chunk: ic.chunk, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function buildContextBlock(retrieved: Retrieved[]): string {
  if (retrieved.length === 0) return "";
  return retrieved
    .map(
      (r, i) =>
        `【片段 ${i + 1}】来源：${r.chunk.source} · ${r.chunk.sourceTitle} · 第 ${r.chunk.segmentIndex + 1} 段\n${r.chunk.text}`
    )
    .join("\n\n");
}
