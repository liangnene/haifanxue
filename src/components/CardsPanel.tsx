"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Copy,
  RotateCw,
  Loader2,
  Layers,
  Image as ImageIcon,
  Sparkles,
  X,
  Download,
} from "lucide-react";
import {
  loadDecks,
  saveDecks,
  newDeck,
  deriveDeckTitle,
  parseCardsJson,
  cardsToMarkdown,
  type CardDeck,
  type Card,
} from "@/lib/cards-store";
import { streamChat } from "@/lib/stream";
import { chunkBySize } from "@/lib/chunk";
import { isImageFile, ocrImage } from "@/lib/ocr";
import { CardSquare } from "./CardSquare";

type Props = {
  userKey: string;
};

export function CardsPanel({ userKey }: Props) {
  const [decks, setDecks] = useState<CardDeck[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [sourceInput, setSourceInput] = useState("");
  const [preview, setPreview] = useState<{ card: Card; index: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHydrated(false);
    loadDecks(userKey).then((list) => {
      setDecks(list);
      setActiveId(list[0]?.id ?? null);
      setSourceInput(list[0]?.source ?? "");
      setHydrated(true);
    });
  }, [userKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveDecks(userKey, decks);
  }, [decks, userKey, hydrated]);

  const active = useMemo(
    () => decks.find((d) => d.id === activeId) ?? null,
    [decks, activeId]
  );

  useEffect(() => {
    setSourceInput(active?.source ?? "");
  }, [activeId, active?.source]);

  function patchActive(patch: Partial<CardDeck>) {
    setDecks((prev) =>
      prev.map((d) =>
        d.id === activeId ? { ...d, ...patch, updatedAt: Date.now() } : d
      )
    );
  }

  function createNew() {
    if (busy) return;
    const deck = newDeck();
    setDecks((prev) => [deck, ...prev]);
    setActiveId(deck.id);
    setSourceInput("");
    setError(null);
    setProgress(null);
  }

  function deleteDeck(id: string) {
    if (busy) return;
    if (!confirm("删除这份卡片？此操作不可恢复。")) return;
    setDecks((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
        setSourceInput(next[0]?.source ?? "");
      }
      return next;
    });
  }

  async function runGenerate(rawSource: string, meta?: CardDeck["sourceMeta"]) {
    if (!active) return;
    const source = rawSource.trim();
    if (!source) {
      setError("内容为空。");
      return;
    }
    if (active.cards.length > 0 && !confirm("重新生成会覆盖现有卡片，确认吗？")) {
      return;
    }

    setError(null);
    patchActive({
      source,
      sourceMeta: meta,
      title: deriveDeckTitle(source, active.title),
      cards: [],
      rawOutput: "",
      parseFailed: false,
    });

    const chunks = chunkBySize(source, 1600);
    setProgress({ done: 0, total: chunks.length });
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const accumulatedCards: Card[] = [];
    const rawChunks: string[] = [];
    let lastError: string | null = null;
    let anyParseFailed = false;

    for (let i = 0; i < chunks.length; i++) {
      if (controller.signal.aborted) break;
      let chunkOut = "";
      let chunkErr: string | null = null;

      await streamChat(
        [{ role: "user", content: chunks[i] }],
        "cards",
        {
          onChunk: (c) => {
            chunkOut += c;
          },
          onDone: () => {},
          onError: (msg) => {
            chunkErr = msg;
          },
          signal: controller.signal,
        }
      );

      if (chunkErr) {
        lastError = `第 ${i + 1}/${chunks.length} 段生成失败：${chunkErr}`;
        break;
      }
      rawChunks.push(chunkOut);
      const { cards, ok } = parseCardsJson(chunkOut);
      if (ok) {
        accumulatedCards.push(...cards);
      } else {
        anyParseFailed = true;
      }
      setProgress({ done: i + 1, total: chunks.length });
      patchActive({
        cards: [...accumulatedCards],
        rawOutput: rawChunks.join("\n\n---\n\n"),
        parseFailed: anyParseFailed && accumulatedCards.length === 0,
      });
    }

    setBusy(false);
    abortRef.current = null;
    if (!lastError) setProgress(null);
    if (lastError) setError(lastError);
  }

  function handleStop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  async function processFile(f: File) {
    if (!active) return;
    setError(null);

    if (isImageFile(f)) {
      setOcrBusy(true);
      try {
        const text = await ocrImage(f);
        setOcrBusy(false);
        if (!text) {
          setError("未识别出文字。");
          return;
        }
        setSourceInput(text);
        patchActive({
          source: text,
          sourceMeta: { kind: "image-ocr", name: f.name },
          title: deriveDeckTitle(text, active.title),
        });
      } catch (err) {
        setOcrBusy(false);
        setError(`图片识别失败：${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setOcrBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/parse-file", { method: "POST", body: form });
      const json = await res.json();
      setOcrBusy(false);
      if (!res.ok) {
        setError(json?.error || "解析失败");
        return;
      }
      const text: string = json.text || "";
      setSourceInput(text);
      patchActive({
        source: text,
        sourceMeta: {
          kind: json.kind === "pdf" ? "pdf" : "text",
          name: f.name,
          pages: json.pages,
        },
        title: deriveDeckTitle(text, active.title),
      });
    } catch (err) {
      setOcrBusy(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void processFile(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (busy || ocrBusy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) void processFile(f);
  }

  function commitSource() {
    if (!active) return;
    if (sourceInput !== active.source) {
      patchActive({
        source: sourceInput,
        sourceMeta: { kind: "paste" },
        title: deriveDeckTitle(sourceInput, active.title),
      });
    }
  }

  return (
    <div className="flex-1 flex min-h-0">
      <aside
        className="w-[240px] shrink-0 border-r flex flex-col"
        style={{
          borderColor: "var(--border)",
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="px-3 pt-4 pb-2 flex items-center justify-between">
          <div className="text-[12.5px] text-[var(--text-muted)] uppercase tracking-wide">
            考点卡片
          </div>
          <button
            onClick={createNew}
            disabled={busy}
            className="hf-btn-ghost flex items-center gap-1 text-[12.5px] px-2 py-1 disabled:opacity-50"
          >
            <Plus size={13} />
            新建
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {decks.length === 0 && (
            <div className="text-[12.5px] text-[var(--text-subtle)] px-2 py-6 text-center">
              暂无卡片记录
              <br />
              点击右上「新建」开始
            </div>
          )}
          {decks.map((d) => {
            const isActive = d.id === activeId;
            return (
              <button
                key={d.id}
                onClick={() => !busy && setActiveId(d.id)}
                disabled={busy && !isActive}
                className="w-full text-left rounded-lg px-2.5 py-2 group flex items-start gap-2 transition-colors"
                style={{
                  background: isActive ? "#f0ecf7" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--surface-muted)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                }}
              >
                <Layers
                  size={13}
                  className="mt-0.5 shrink-0"
                  style={{ color: isActive ? "#6d5fa6" : "var(--text-subtle)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate text-[var(--text)]">
                    {d.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-subtle)] truncate">
                    {d.cards.length} 张 ·{" "}
                    {new Date(d.updatedAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/60 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDeck(d.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteDeck(d.id);
                    }
                  }}
                  aria-label="删除"
                >
                  <Trash2 size={12} className="text-[var(--text-subtle)]" />
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {!active ? (
          <EmptyState onCreate={createNew} />
        ) : (
          <DeckEditor
            deck={active}
            sourceInput={sourceInput}
            onSourceInputChange={setSourceInput}
            onSourceCommit={commitSource}
            busy={busy}
            ocrBusy={ocrBusy}
            progress={progress}
            error={error}
            dragOver={dragOver}
            onGenerate={() => runGenerate(sourceInput)}
            onStop={handleStop}
            onUploadClick={() => fileRef.current?.click()}
            onCopyAll={() => {
              navigator.clipboard.writeText(cardsToMarkdown(active.cards));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy && !ocrBusy) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onOpenPreview={(card, index) =>
              setPreview({ card, index, total: active.cards.length })
            }
          />
        )}
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,application/pdf,text/*,image/*"
          onChange={handleFile}
        />
      </main>

      {preview && (
        <CardPreviewModal
          card={preview.card}
          index={preview.index}
          total={preview.total}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center max-w-[460px]">
        <div
          className="w-12 h-12 rounded-xl grid place-items-center mx-auto mb-5"
          style={{ background: "var(--surface-muted)", color: "var(--text-subtle)" }}
        >
          <Layers size={20} />
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight">
          把教材提炼成可分享的考点卡
        </h2>
        <p className="text-[14px] text-[var(--text-muted)] mt-2 leading-relaxed">
          上传 PDF / 图片，或直接粘贴日语 / 中文，AI 会抽取核心考点 ——
          <br />
          每张卡可单独下载为高清图片，方便保存与分享。
        </p>
        <button onClick={onCreate} className="hf-btn-primary text-[13.5px] mt-6">
          <Plus size={14} className="inline mr-1 -mt-0.5" />
          新建卡片
        </button>
      </div>
    </div>
  );
}

type EditorProps = {
  deck: CardDeck;
  sourceInput: string;
  busy: boolean;
  ocrBusy: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  dragOver: boolean;
  onSourceInputChange: (v: string) => void;
  onSourceCommit: () => void;
  onGenerate: () => void;
  onStop: () => void;
  onUploadClick: () => void;
  onCopyAll: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onOpenPreview: (card: Card, index: number) => void;
};

function DeckEditor({
  deck,
  sourceInput,
  busy,
  ocrBusy,
  progress,
  error,
  dragOver,
  onSourceInputChange,
  onSourceCommit,
  onGenerate,
  onStop,
  onUploadClick,
  onCopyAll,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenPreview,
}: EditorProps) {
  const sourceEmpty = !sourceInput.trim();
  const hasCards = deck.cards.length > 0;
  const blockingBusy = busy || ocrBusy;

  return (
    <>
      <div
        className="shrink-0 border-b px-6 py-3 flex items-center gap-3"
        style={{
          borderColor: "var(--border)",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-[14.5px] font-medium truncate">{deck.title}</h2>
          {deck.sourceMeta?.name && (
            <div className="text-[11.5px] text-[var(--text-subtle)] truncate mt-0.5">
              来源：{deck.sourceMeta.name}
              {deck.sourceMeta.pages ? ` · ${deck.sourceMeta.pages} 页` : ""}
            </div>
          )}
        </div>

        {progress && (
          <div className="text-[12px] text-[var(--text-muted)]">
            {progress.done}/{progress.total} 段
          </div>
        )}

        <button
          onClick={onCopyAll}
          disabled={!hasCards}
          className="hf-btn-ghost flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 disabled:opacity-40"
        >
          <Copy size={13} />
          复制全部
        </button>
        {busy ? (
          <button
            onClick={onStop}
            className="hf-btn-ghost flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5"
          >
            停止
          </button>
        ) : (
          <button
            onClick={onGenerate}
            disabled={sourceEmpty || ocrBusy}
            className="hf-btn-primary flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 disabled:opacity-50"
          >
            {hasCards ? <RotateCw size={12} /> : <Sparkles size={12} />}
            {hasCards ? "重新生成" : "生成卡片"}
          </button>
        )}
      </div>

      {error && (
        <div className="shrink-0 mx-6 mt-3 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="px-6 pt-4 pb-3">
        <div
          className="relative rounded-xl border transition-colors"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            borderColor: dragOver ? "#64748b" : "var(--border)",
            background: dragOver ? "rgba(241, 245, 249, 0.85)" : "rgba(255,255,255,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <textarea
            value={sourceInput}
            onChange={(e) => onSourceInputChange(e.target.value)}
            onBlur={onSourceCommit}
            disabled={blockingBusy}
            placeholder="粘贴一段日语 / 中文教材，或拖入 PDF / 图片 / txt…"
            className="w-full resize-none bg-transparent outline-none px-4 pt-3 text-[14px] leading-relaxed placeholder:text-[var(--text-subtle)] disabled:opacity-60"
            style={{ minHeight: 140, maxHeight: 280 }}
          />
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={onUploadClick}
              disabled={blockingBusy}
              className="flex items-center gap-1.5 text-[12.5px] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
              }}
            >
              <Upload size={12} />
              上传 PDF / 图片 / txt
            </button>
            <div className="text-[11.5px]" style={{
              color: ocrBusy || sourceInput.trim() ? "var(--text-subtle)" : "#6d5fa6",
              fontWeight: ocrBusy || sourceInput.trim() ? undefined : 500,
            }}>
              {ocrBusy
                ? "正在识别…"
                : sourceInput.trim()
                  ? `${sourceInput.trim().length} 字`
                  : "⌥ 支持拖拽文件到此处"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 flex-1 min-h-0">
        {!hasCards && !busy && (
          <div className="text-center text-[13px] text-[var(--text-subtle)] py-10">
            填入内容后，点击右上「生成卡片」开始 ——
            <br />
            AI 会自动抽取 3-8 个核心考点。
          </div>
        )}

        {(hasCards || busy) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deck.cards.map((card, i) => (
              <CardThumb
                key={i}
                card={card}
                index={i}
                total={deck.cards.length}
                onPreview={() => onOpenPreview(card, i)}
              />
            ))}
            {busy && (
              <div
                className="rounded-xl border border-dashed flex items-center justify-center text-[13px] text-[var(--text-subtle)]"
                style={{
                  borderColor: "var(--border-strong)",
                  minHeight: 220,
                  background: "rgba(255,255,255,0.4)",
                }}
              >
                <Loader2 size={16} className="animate-spin mr-2" />
                正在生成更多…
              </div>
            )}
          </div>
        )}

        {deck.parseFailed && !hasCards && deck.rawOutput && (
          <div className="mt-6 rounded-lg border p-4 bg-amber-50/60 border-amber-200">
            <div className="text-[13px] font-medium text-amber-900 mb-2">
              JSON 解析失败，已显示原始输出（可手动复制）
            </div>
            <pre className="text-[12px] whitespace-pre-wrap text-amber-900/80 max-h-[260px] overflow-auto">
              {deck.rawOutput}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

function CardThumb({
  card,
  index,
  total,
  onPreview,
}: {
  card: Card;
  index: number;
  total: number;
  onPreview: () => void;
}) {
  return (
    <button
      onClick={onPreview}
      className="text-left rounded-xl border bg-white/85 hover:shadow-md transition-all overflow-hidden group"
      style={{
        borderColor: "var(--border)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="p-4 flex flex-col gap-3 min-h-[210px] relative">
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r"
          style={{ background: "#3B5BDB" }}
        />
        <div className="pl-2 flex items-center justify-between text-[10.5px] uppercase tracking-wider text-[var(--text-subtle)]">
          <span>卡片 {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[#6d5fa6]">
            <ImageIcon size={11} />
            查看 · 导出
          </span>
        </div>
        <div className="pl-2 text-[15px] font-semibold text-[var(--text)] line-clamp-2 leading-snug">
          {card.concept || "—"}
        </div>
        {card.definition && (
          <div className="pl-2 text-[12.5px] text-[var(--text-muted)] leading-relaxed line-clamp-3">
            {card.definition}
          </div>
        )}
        <div className="pl-2 mt-auto text-[11px] text-[var(--text-subtle)] space-y-1">
          {card.caution && (
            <div className="line-clamp-1">
              <span style={{ color: "#6d5fa6" }}>易错</span> · {card.caution}
            </div>
          )}
          {card.question && (
            <div className="line-clamp-1">
              <span style={{ color: "#64748b" }}>考题</span> · {card.question}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function CardPreviewModal({
  card,
  index,
  total,
  onClose,
}: {
  card: Card;
  index: number;
  total: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleDownload() {
    if (!ref.current) return;
    setDownloading(true);
    setErr(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, {
        width: 1080,
        height: 1080,
        canvasWidth: 1080,
        canvasHeight: 1080,
        pixelRatio: 1,
        backgroundColor: "#fbfaf6",
        skipAutoScale: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const safeName =
        (card.concept || `card-${index + 1}`).slice(0, 24).replace(/[^\w一-鿿]/g, "_") ||
        `card-${index + 1}`;
      a.download = `haifanxue_${safeName}.png`;
      a.click();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    if (!ref.current) return;
    setDownloading(true);
    setErr(null);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(ref.current, {
        width: 1080,
        height: 1080,
        canvasWidth: 1080,
        canvasHeight: 1080,
        pixelRatio: 1,
        backgroundColor: "#fbfaf6",
        skipAutoScale: true,
      });
      if (!blob) throw new Error("生成图片失败");
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setErr(null);
    } catch (e) {
      setErr(`复制失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDownloading(false);
    }
  }

  const previewScale = 0.5;
  const visibleSize = 1080 * previewScale;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20, 20, 20, 0.45)" }}
      onClick={onClose}
    >
      <div
        className="hf-card max-w-[680px] w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-[14px] font-medium">卡片预览 · {index + 1} / {total}</div>
          <button onClick={onClose} className="hf-btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div
            style={{
              width: visibleSize,
              height: visibleSize,
              overflow: "hidden",
              borderRadius: 12,
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            <CardSquare
              ref={ref}
              card={card}
              index={index}
              total={total}
              scale={previewScale}
            />
          </div>
        </div>

        {err && (
          <div className="text-[12.5px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mb-3">
            {err}
          </div>
        )}

        <div className="flex items-center justify-between text-[12.5px] text-[var(--text-subtle)]">
          <span>1080 × 1080 · 适合朋友圈 / 小红书</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={downloading}
              className="hf-btn-ghost flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 disabled:opacity-50"
            >
              <Copy size={12} />
              复制图片
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="hf-btn-primary flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              下载 PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
