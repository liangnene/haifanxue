"use client";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Mode = "chat" | "translate" | "cards" | "ja2zh" | "zh2ja" | "rag" | "format" | "segment";

export type StreamHandlers = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
};

export async function streamChat(
  messages: ChatMessage[],
  mode: Mode,
  { onChunk, onDone, onError, signal }: StreamHandlers,
  examId: string | null = null
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, mode, examId }),
      signal,
    });
  } catch (e) {
    onError(e instanceof Error ? e.message : "网络异常");
    return;
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error || j?.detail || JSON.stringify(j);
    } catch {
      detail = await res.text().catch(() => "");
    }
    onError(`请求失败 (${res.status}): ${detail.slice(0, 200)}`);
    return;
  }

  if (!res.body) {
    onError("响应体为空");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let nlIndex: number;
      while ((nlIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nlIndex).trim();
        buffer = buffer.slice(nlIndex + 1);

        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            onChunk(delta);
          }
        } catch {
          /* 跳过无法解析的行 */
        }
      }
    }
    onDone();
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      onDone();
      return;
    }
    onError(e instanceof Error ? e.message : "流读取异常");
  }
}
