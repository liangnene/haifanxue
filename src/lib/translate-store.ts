"use client";

import { supabase } from "./supabase";

export type TranslateDoc = {
  id: string;
  title: string;
  source: string;
  translation: string;
  edited: boolean;
  createdAt: number;
  updatedAt: number;
  sourceMeta?: {
    kind: "text" | "pdf" | "paste";
    name?: string;
    pages?: number;
  };
};

export async function loadDocs(userId: string): Promise<TranslateDoc[]> {
  const { data, error } = await supabase
    .from("translate_docs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    source: row.source,
    translation: row.translation,
    edited: row.edited,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    sourceMeta: row.source_meta ?? undefined,
  }));
}

export async function saveDocs(userId: string, docs: TranslateDoc[]) {
  if (docs.length === 0) return;

  const rows = docs.map((d) => ({
    id: d.id,
    user_id: userId,
    title: d.title,
    source: d.source,
    translation: d.translation,
    edited: d.edited,
    source_meta: d.sourceMeta ?? null,
    updated_at: new Date(d.updatedAt).toISOString(),
    created_at: new Date(d.createdAt).toISOString(),
  }));

  await supabase.from("translate_docs").upsert(rows, { onConflict: "id" });
}

export async function deleteDoc(docId: string) {
  await supabase.from("translate_docs").delete().eq("id", docId);
}

export function newDoc(): TranslateDoc {
  const now = Date.now();
  return {
    id: `t_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: "未命名翻译",
    source: "",
    translation: "",
    edited: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveTitle(source: string, fallback = "未命名翻译"): string {
  const head = source.trim().split("\n")[0].trim();
  if (!head) return fallback;
  return head.length > 24 ? head.slice(0, 24) + "…" : head;
}
