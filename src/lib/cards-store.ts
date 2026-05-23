"use client";

import { supabase } from "./supabase";

export type Card = {
  concept: string;
  definition: string;
  caution: string;
  question: string;
};

export type CardDeck = {
  id: string;
  title: string;
  source: string;
  cards: Card[];
  rawOutput?: string;
  parseFailed?: boolean;
  createdAt: number;
  updatedAt: number;
  sourceMeta?: {
    kind: "text" | "pdf" | "paste" | "image-ocr";
    name?: string;
    pages?: number;
  };
};

export async function loadDecks(userId: string): Promise<CardDeck[]> {
  const { data, error } = await supabase
    .from("card_decks")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    source: row.source,
    cards: row.cards ?? [],
    rawOutput: row.raw_output ?? undefined,
    parseFailed: row.parse_failed ?? false,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    sourceMeta: row.source_meta ?? undefined,
  }));
}

export async function saveDecks(userId: string, decks: CardDeck[]) {
  if (decks.length === 0) return;

  const rows = decks.map((d) => ({
    id: d.id,
    user_id: userId,
    title: d.title,
    source: d.source,
    cards: d.cards,
    raw_output: d.rawOutput ?? null,
    parse_failed: d.parseFailed ?? false,
    source_meta: d.sourceMeta ?? null,
    updated_at: new Date(d.updatedAt).toISOString(),
    created_at: new Date(d.createdAt).toISOString(),
  }));

  await supabase.from("card_decks").upsert(rows, { onConflict: "id" });
}

export async function deleteDeck(deckId: string) {
  await supabase.from("card_decks").delete().eq("id", deckId);
}

export function newDeck(): CardDeck {
  const now = Date.now();
  return {
    id: `c_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: "未命名卡片",
    source: "",
    cards: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveDeckTitle(source: string, fallback = "未命名卡片"): string {
  const head = source.trim().split("\n")[0].trim();
  if (!head) return fallback;
  return head.length > 22 ? head.slice(0, 22) + "…" : head;
}

export function parseCardsJson(text: string): { cards: Card[]; ok: boolean } {
  if (!text || !text.trim()) return { cards: [], ok: false };
  const candidates: string[] = [];

  const codeFence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFence) candidates.push(codeFence[1]);

  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    candidates.push(text.slice(firstBracket, lastBracket + 1));
  }

  candidates.push(text);

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) {
        const cleaned: Card[] = parsed
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            concept: String(x.concept ?? "").trim(),
            definition: String(x.definition ?? "").trim(),
            caution: String(x.caution ?? "").trim(),
            question: String(x.question ?? "").trim(),
          }))
          .filter((c) => c.concept || c.definition);
        if (cleaned.length > 0) return { cards: cleaned, ok: true };
      }
    } catch {
      /* try next candidate */
    }
  }
  return { cards: [], ok: false };
}

export function cardsToMarkdown(cards: Card[]): string {
  return cards
    .map((c, i) => {
      const lines = [`## ${i + 1}. ${c.concept}`, ""];
      if (c.definition) lines.push(`**定义**：${c.definition}`, "");
      if (c.caution) lines.push(`**易错点**：${c.caution}`, "");
      if (c.question) lines.push(`**可能考题**：${c.question}`, "");
      return lines.join("\n");
    })
    .join("\n---\n\n");
}
