// 服务端专用：向量知识库检索（Supabase pgvector + Jina embeddings-v3）

export type VectorChunk = {
  id: number;
  book_title: string;
  book_id: string;
  page_number: number | null;
  chunk_index: number;
  content: string;
  similarity: number;
};

async function embedQuery(query: string): Promise<number[] | null> {
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v3",
        input: [query],
        task: "retrieval.query",
        dimensions: 1024,
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export async function vectorRetrieve(
  query: string,
  topK = 4,
  minSimilarity = 0.3
): Promise<VectorChunk[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return [];

  const embedding = await embedQuery(query);
  if (!embedding) return [];

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_kb_chunks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_count: topK,
        min_similarity: minSimilarity,
      }),
    });

    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function buildVectorContextBlock(chunks: VectorChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map(
      (c, i) =>
        `【参考 ${i + 1}】来源：${c.book_title}${c.page_number ? ` 第${c.page_number}页` : ""}\n${c.content}`
    )
    .join("\n\n");
}
