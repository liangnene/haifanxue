"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Copy,
  RotateCw,
  Loader2,
  FileText,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  loadDocs,
  saveDocs,
  newDoc,
  deriveTitle,
  type TranslateDoc,
} from "@/lib/translate-store";
import { detectLang } from "@/lib/lang";
import { streamChat, type Mode } from "@/lib/stream";
import { chunkBySize } from "@/lib/chunk";
import { ocrImage, isImageFile } from "@/lib/ocr";

type Props = {
  userKey: string;
};

export function TranslatePanel({ userKey }: Props) {
  const [docs, setDocs] = useState<TranslateDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHydrated(false);
    loadDocs(userKey).then((list) => {
      setDocs(list);
      setActiveId(list[0]?.id ?? null);
      setHydrated(true);
    });
  }, [userKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveDocs(userKey, docs);
  }, [docs, userKey, hydrated]);

  const active = useMemo(
    () => docs.find((d) => d.id === activeId) ?? null,
    [docs, activeId]
  );

  function patchActive(patch: Partial<TranslateDoc>) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === activeId ? { ...d, ...patch, updatedAt: Date.now() } : d
      )
    );
  }

  function createNew() {
    if (busy) return;
    const doc = newDoc();
    setDocs((prev) => [doc, ...prev]);
    setActiveId(doc.id);
    setError(null);
    setProgress(null);
  }

  function deleteDoc(id: string) {
    if (busy) return;
    if (!confirm("删除这份翻译？此操作不可恢复。")) return;
    setDocs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  function startTitleEdit() {
    if (!active) return;
    setTitleDraft(active.title);
    setEditingTitle(true);
  }
  function commitTitle() {
    const v = titleDraft.trim();
    if (active && v) patchActive({ title: v });
    setEditingTitle(false);
  }

  async function runTranslate(rawSource: string, meta?: TranslateDoc["sourceMeta"]) {
    if (!active) return;
    const source = rawSource.trim();
    if (!source) {
      setError("原文为空。");
      return;
    }
    if (active.edited && active.translation && !confirm("重新翻译会覆盖你的修改，确认吗？")) {
      return;
    }

    setError(null);
    patchActive({
      source,
      sourceMeta: meta,
      title: deriveTitle(source, active.title),
      translation: "",
      edited: false,
    });

    const lang = detectLang(source);
    const mode: Mode = lang === "ja" ? "ja2zh" : "zh2ja";
    const chunks = chunkBySize(source);
    setProgress({ done: 0, total: chunks.length });
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";
    let failedAt = -1;

    for (let i = 0; i < chunks.length; i++) {
      if (controller.signal.aborted) break;
      let chunkOut = "";
      let chunkErr: string | null = null;

      await streamChat(
        [{ role: "user", content: chunks[i] }],
        mode,
        {
          onChunk: (c) => {
            chunkOut += c;
            const live = accumulated + (accumulated ? "\n\n" : "") + chunkOut;
            setDocs((prev) =>
              prev.map((d) =>
                d.id === activeId ? { ...d, translation: live } : d
              )
            );
          },
          onDone: () => {},
          onError: (msg) => {
            chunkErr = msg;
          },
          signal: controller.signal,
        }
      );

      if (chunkErr) {
        failedAt = i;
        setError(`第 ${i + 1}/${chunks.length} 段翻译失败：${chunkErr}`);
        break;
      }
      accumulated = accumulated + (accumulated ? "\n\n" : "") + chunkOut;
      setProgress({ done: i + 1, total: chunks.length });
    }

    setBusy(false);
    abortRef.current = null;

    if (failedAt >= 0) {
      setProgress(null);
      patchActive({ translation: accumulated, edited: false });
      return;
    }

    // 合并排版：同时整理译文段落 + 按译文结构重排原文
    setProgress({ done: 0, total: 1 });
    setBusy(true);
    const formatController = new AbortController();
    abortRef.current = formatController;
    let formatOut = "";

    await streamChat(
      [
        {
          role: "user",
          content: `===SOURCE===\n${source}\n\n===TRANSLATION===\n${accumulated}`,
        },
      ],
      "format",
      {
        onChunk: (c) => {
          formatOut += c;
          // 流式更新：只把 ===TRANSLATION=== 部分实时显示到译文区
          const transMatch = formatOut.match(/===TRANSLATION===\n([\s\S]*?)(?:===SOURCE===|$)/);
          const liveTranslation = transMatch ? transMatch[1].trim() : "";
          if (liveTranslation) {
            setDocs((prev) =>
              prev.map((d) =>
                d.id === activeId ? { ...d, translation: liveTranslation } : d
              )
            );
          }
        },
        onDone: () => {},
        onError: () => { formatOut = ""; },
        signal: formatController.signal,
      }
    );

    setBusy(false);
    abortRef.current = null;
    setProgress(null);

    // 解析输出
    const transMatch = formatOut.match(/===TRANSLATION===\n([\s\S]*?)(?:===SOURCE===|$)/);
    const srcMatch = formatOut.match(/===SOURCE===\n([\s\S]*?)$/);
    const finalTranslation = transMatch ? transMatch[1].trim() : accumulated;
    const finalSource = srcMatch ? srcMatch[1].trim() : source;

    patchActive({
      translation: finalTranslation,
      source: finalSource || source,
      edited: false,
    });
  }

  function handleStop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  async function processFile(f: File) {
    if (!active) return;
    setError(null);

    if (isImageFile(f)) {
      setBusy(true);
      setOcrProgress(0);
      try {
        const text = await ocrImage(f);
        setOcrProgress(null);
        setBusy(false);
        if (!text) {
          setError("未识别出文字。请尝试更清晰的图片，或手动粘贴文本。");
          return;
        }
        patchActive({
          source: text,
          sourceMeta: { kind: "text", name: f.name },
          title: deriveTitle(text, active.title),
        });
      } catch (err) {
        setOcrProgress(null);
        setBusy(false);
        setError(`图片识别失败：${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/parse-file", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "解析失败");
        setBusy(false);
        return;
      }
      const text: string = json.text || "";
      setBusy(false);
      await runTranslate(text, {
        kind: json.kind === "pdf" ? "pdf" : "text",
        name: f.name,
        pages: json.pages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
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
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) void processFile(f);
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
            翻译资料
          </div>
          <button
            onClick={createNew}
            disabled={busy}
            className="hf-btn-ghost flex items-center gap-1 text-[12.5px] px-2 py-1 disabled:opacity-50"
            title="新建翻译"
          >
            <Plus size={13} />
            新建
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {docs.length === 0 && (
            <div className="text-[12.5px] text-[var(--text-subtle)] px-2 py-6 text-center">
              暂无翻译记录
              <br />
              点击右上「新建」开始
            </div>
          )}
          {docs.map((d) => {
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
                <FileText
                  size={13}
                  className="mt-0.5 shrink-0"
                  style={{ color: isActive ? "#6d5fa6" : "var(--text-subtle)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate text-[var(--text)]">
                    {d.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-subtle)] truncate">
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
                    deleteDoc(d.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteDoc(d.id);
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

      <main className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <EmptyState onCreate={createNew} />
        ) : (
          <DocEditor
            doc={active}
            busy={busy}
            progress={progress}
            error={error}
            editingTitle={editingTitle}
            titleDraft={titleDraft}
            dragOver={dragOver}
            ocrProgress={ocrProgress}
            onTitleDraftChange={setTitleDraft}
            onStartTitleEdit={startTitleEdit}
            onCommitTitle={commitTitle}
            onCancelTitle={() => setEditingTitle(false)}
            onSourceChange={(s) =>
              patchActive({ source: s, sourceMeta: { kind: "paste" } })
            }
            onTranslate={() => runTranslate(active.source)}
            onStop={handleStop}
            onUploadClick={() => fileRef.current?.click()}
            onCopy={() => {
              navigator.clipboard.writeText(active.translation || "");
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
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
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center max-w-[420px]">
        <div
          className="w-12 h-12 rounded-xl grid place-items-center mx-auto mb-5"
          style={{ background: "var(--surface-muted)", color: "var(--text-subtle)" }}
        >
          <FileText size={20} />
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight">
          翻译整章资料
        </h2>
        <p className="text-[14px] text-[var(--text-muted)] mt-2 leading-relaxed">
          上传 PDF / txt，或直接粘贴大段日语，AI 会自动分段翻译成中文。<br />
          每份翻译都会自动保存。
        </p>
        <button onClick={onCreate} className="hf-btn-primary text-[13.5px] mt-6">
          <Plus size={14} className="inline mr-1 -mt-0.5" />
          新建翻译
        </button>
      </div>
    </div>
  );
}

type EditorProps = {
  doc: TranslateDoc;
  busy: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  editingTitle: boolean;
  titleDraft: string;
  dragOver: boolean;
  ocrProgress: number | null;
  onTitleDraftChange: (v: string) => void;
  onStartTitleEdit: () => void;
  onCommitTitle: () => void;
  onCancelTitle: () => void;
  onSourceChange: (s: string) => void;
  onTranslate: () => void;
  onStop: () => void;
  onUploadClick: () => void;
  onCopy: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
};

function DocEditor({
  doc,
  busy,
  progress,
  error,
  editingTitle,
  titleDraft,
  dragOver,
  ocrProgress,
  onTitleDraftChange,
  onStartTitleEdit,
  onCommitTitle,
  onCancelTitle,
  onSourceChange,
  onTranslate,
  onStop,
  onUploadClick,
  onCopy,
  onDragOver,
  onDragLeave,
  onDrop,
}: EditorProps) {
  const [activeSrcIdx, setActiveSrcIdx] = useState<number | null>(null);
  const [activeTransIdx, setActiveTransIdx] = useState<number | null>(null);
  const sourceParaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const transParaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sourceScrollRef = useRef<HTMLDivElement | null>(null);
  const transScrollRef = useRef<HTMLDivElement | null>(null);

  const sourceEmpty = !doc.source.trim();
  const hasTranslation = !!doc.translation.trim();
  const showParagraphView = !sourceEmpty && hasTranslation;

  const sourceParagraphs = useMemo(() => {
    // 支持 AI 用 --- 分隔的分段格式，也兼容普通空行分隔
    const hasDivider = /^---$/m.test(doc.source);
    if (hasDivider) {
      return doc.source.split(/^---$/m).map((p) => p.trim()).filter(Boolean);
    }
    return doc.source.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  }, [doc.source]);
  const transParagraphs = useMemo(
    () => doc.translation.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [doc.translation]
  );

  function scrollTo(
    refs: React.RefObject<(HTMLDivElement | null)[]>,
    paneRef: React.RefObject<HTMLDivElement | null>,
    idx: number
  ) {
    const el = refs.current[idx];
    const pane = paneRef.current;
    if (!el || !pane) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    const scrollTop = pane.scrollTop;
    const paneH = pane.clientHeight;
    if (top < scrollTop + 48 || bottom > scrollTop + paneH - 48) {
      pane.scrollTo({ top: top - 64, behavior: "smooth" });
    }
  }

  function mapIdx(fromIdx: number, fromLen: number, toLen: number) {
    if (fromLen === toLen) return fromIdx;
    return Math.min(Math.round((fromIdx / (fromLen - 1)) * (toLen - 1)), toLen - 1);
  }

  function handleSourceClick(idx: number) {
    setActiveSrcIdx(idx);
    const transIdx = mapIdx(idx, sourceParagraphs.length, transParagraphs.length);
    setActiveTransIdx(transIdx);
    scrollTo(transParaRefs, transScrollRef, transIdx);
  }

  function handleTransClick(idx: number) {
    setActiveTransIdx(idx);
    const srcIdx = mapIdx(idx, transParagraphs.length, sourceParagraphs.length);
    setActiveSrcIdx(srcIdx);
    scrollTo(sourceParaRefs, sourceScrollRef, srcIdx);
  }

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
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {editingTitle ? (
            <>
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => onTitleDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitTitle();
                  if (e.key === "Escape") onCancelTitle();
                }}
                className="hf-input text-[14px] px-2 py-1 max-w-[320px]"
              />
              <button onClick={onCommitTitle} className="hf-btn-ghost p-1">
                <Check size={14} />
              </button>
              <button onClick={onCancelTitle} className="hf-btn-ghost p-1">
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <h2 className="text-[14.5px] font-medium truncate">{doc.title}</h2>
              <button
                onClick={onStartTitleEdit}
                className="hf-btn-ghost p-1 text-[var(--text-subtle)]"
                title="重命名"
              >
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>

        {progress && (
          <div className="text-[12px] text-[var(--text-muted)]">
            {progress.done}/{progress.total} 段
          </div>
        )}

        <button
          onClick={onCopy}
          disabled={!doc.translation}
          className="hf-btn-ghost flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 disabled:opacity-40"
        >
          <Copy size={13} />
          复制译文
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
            onClick={onTranslate}
            disabled={!doc.source.trim()}
            className="hf-btn-primary flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 disabled:opacity-50"
          >
            {doc.translation ? <RotateCw size={12} /> : null}
            {doc.translation ? "重新翻译" : "开始翻译"}
          </button>
        )}
      </div>

      {error && (
        <div className="shrink-0 mx-6 mt-3 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--border)]">
        {/* 原文区 */}
        <div
          className="relative flex flex-col min-h-0 bg-white/40 transition-colors"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={
            dragOver
              ? {
                  background: "rgba(241, 245, 249, 0.85)",
                  outline: "2px dashed #64748b",
                  outlineOffset: "-12px",
                }
              : undefined
          }
        >
          <div className="shrink-0 px-5 pt-4 pb-2">
            <div className="text-[12px] text-[var(--text-subtle)] uppercase tracking-wide">
              原文
              {doc.sourceMeta?.name && (
                <span className="ml-2 normal-case tracking-normal text-[11.5px]">
                  · {doc.sourceMeta.name}
                  {doc.sourceMeta.pages ? ` · ${doc.sourceMeta.pages}页` : ""}
                </span>
              )}
            </div>
          </div>

          {showParagraphView ? (
            <div
              ref={sourceScrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-5 space-y-1"
            >
              {sourceParagraphs.map((para, idx) => {
                const isActive = activeSrcIdx === idx;
                return (
                  <div
                    key={idx}
                    ref={(el) => { sourceParaRefs.current[idx] = el; }}
                    onClick={() => handleSourceClick(idx)}
                    className="rounded-lg px-3 py-2.5 cursor-pointer text-[14px] leading-relaxed transition-all select-none"
                    style={{
                      background: isActive ? "#fef9c3" : "transparent",
                      boxShadow: isActive ? "inset 0 0 0 1.5px #fde047" : "none",
                    }}
                  >
                    {para}
                  </div>
                );
              })}
            </div>
          ) : (
            <textarea
              value={doc.source}
              onChange={(e) => onSourceChange(e.target.value)}
              disabled={busy}
              placeholder={sourceEmpty ? "在此粘贴大段日语 / 中文…" : ""}
              className="flex-1 min-h-0 w-full resize-none bg-transparent outline-none px-5 pb-5 text-[14px] leading-relaxed placeholder:text-[var(--text-subtle)] disabled:opacity-60"
            />
          )}

          {sourceEmpty && !busy && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={onUploadClick}
                className="pointer-events-auto flex items-center gap-2 text-[13.5px] font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                style={{
                  background: dragOver ? "#e2e8f0" : "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0";
                }}
                onMouseLeave={(e) => {
                  if (!dragOver)
                    (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                }}
              >
                <Upload size={15} />
                {dragOver ? "松开即可上传" : "上传 PDF / 图片 / txt，或拖拽到此处"}
              </button>
              <div className="text-[11.5px] text-[var(--text-subtle)] pointer-events-none">
                图片走本地 OCR，识别后可手动校对再翻译
              </div>
              <div className="text-[11.5px] text-[var(--text-subtle)] pointer-events-auto">
                PDF 太大？先用{" "}
                <a
                  href="https://www.ilovepdf.com/zh-cn/split_pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  iLovePDF
                </a>
                {" "}拆成章节再上传
              </div>
            </div>
          )}

          {ocrProgress !== null && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-3 bg-white/55 backdrop-blur-sm">
              <Loader2 size={20} className="animate-spin" style={{ color: "#64748b" }} />
              <div className="text-[13px] text-[#475569] font-medium">
                百度 OCR 识别中…
              </div>
              <div className="text-[11.5px] text-[var(--text-subtle)]">
                通常 2-5 秒完成
              </div>
            </div>
          )}
        </div>

        {/* 译文区 */}
        <div className="flex flex-col min-h-0 bg-white/50">
          <div className="shrink-0 px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="text-[12px] text-[var(--text-subtle)] uppercase tracking-wide">
              译文
              {showParagraphView && (
                <span className="ml-2 normal-case tracking-normal text-[11.5px]">
                  · 点击段落联动原文
                </span>
              )}
            </div>
            {busy && (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                <Loader2 size={12} className="animate-spin" />
                翻译中…
              </div>
            )}
          </div>

          {showParagraphView ? (
            <div
              ref={transScrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-5 space-y-1"
            >
              {transParagraphs.map((para, idx) => {
                const isActive = activeTransIdx === idx;
                return (
                  <div
                    key={idx}
                    ref={(el) => { transParaRefs.current[idx] = el; }}
                    onClick={() => handleTransClick(idx)}
                    className="rounded-lg px-3 py-2.5 cursor-pointer text-[14px] leading-relaxed transition-all select-none"
                    style={{
                      background: isActive ? "#fef9c3" : "transparent",
                      boxShadow: isActive ? "inset 0 0 0 1.5px #fde047" : "none",
                    }}
                  >
                    {para}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
              {!busy && (
                <p className="text-[14px] text-[var(--text-subtle)] leading-relaxed">
                  翻译结果会出现在这里。
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
