"use client";

import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  ArrowUp,
  BookOpen,
  NotebookPen,
  Lightbulb,
  Square,
} from "lucide-react";
import { streamChat, type ChatMessage } from "@/lib/stream";
import { checkExamRelevance } from "@/lib/exams";
import {
  collectChunks,
  retrieve,
  buildContextBlock,
  type Retrieved,
} from "@/lib/kb";
import { ExamSelector } from "./ExamSelector";
import { RestrictionGuide } from "./RestrictionGuide";
import { TranslateAffordance } from "./TranslateAffordance";
import { BrandMark } from "./BrandMark";
import { GraduationCap, BookOpen as BookOpenIcon, X as XIcon } from "lucide-react";

type Props = {
  nickname: string;
  userKey: string;
};

const suggestions = [
  {
    icon: <BookOpen size={14} />,
    label: "宅建士：媒介契约有哪几种",
    prompt:
      "请用中文解释宅建士考试中媒介契約的三种类型（一般媒介契約、専任媒介契約、専属専任媒介契約），并说明各自的区别和常考考点。",
  },
  {
    icon: <NotebookPen size={14} />,
    label: "行政书士：行政不服申立是什么",
    prompt:
      "请用中文解释行政书士考试中「行政不服申立て」的概念，包括种类、提出期限和常考考点。",
  },
  {
    icon: <Lightbulb size={14} />,
    label: "日商簿记：借贷记账法怎么用",
    prompt:
      "请用中文解释日商簿记考试中借贷记账法（借方・貸方）的基本规则，并举一个典型分录例子。",
  },
];

function historyKey(userKey: string) {
  return `haifanxue:chat:${userKey}`;
}

function examKey(userKey: string) {
  return `haifanxue:exam:${userKey}`;
}

function translationsKey(userKey: string) {
  return `haifanxue:translations:${userKey}`;
}

export function ChatPanel({ nickname, userKey }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [ragOn, setRagOn] = useState(false);
  const [showKbEmpty, setShowKbEmpty] = useState(false);
  const [citationsByMsg, setCitationsByMsg] = useState<Record<string, Retrieved[]>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHydrated(false);
    try {
      const raw = localStorage.getItem(historyKey(userKey));
      setMessages(raw ? JSON.parse(raw) : []);
      const ex = localStorage.getItem(examKey(userKey));
      setExamId(ex || null);
      const trans = localStorage.getItem(translationsKey(userKey));
      setTranslations(trans ? JSON.parse(trans) : {});
    } catch {
      setMessages([]);
      setExamId(null);
      setTranslations({});
    }
    setHydrated(true);
  }, [userKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        translationsKey(userKey),
        JSON.stringify(translations)
      );
    } catch {
      /* ignore */
    }
  }, [translations, userKey, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(historyKey(userKey), JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, userKey, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (examId) localStorage.setItem(examKey(userKey), examId);
      else localStorage.removeItem(examKey(userKey));
    } catch {
      /* ignore */
    }
  }, [examId, userKey, hydrated]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming, translations]);

  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }

  function handleStop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);

    setShowGuide(false);

    let retrieved: Retrieved[] = [];
    let mode: "chat" | "rag" = "chat";
    let userContentForApi = text;

    if (ragOn) {
      const chunks = await collectChunks(userKey);
      if (chunks.length === 0) {
        setShowKbEmpty(true);
        return;
      }
      retrieved = retrieve(text, chunks, 3);
      mode = "rag";
      const ctx = buildContextBlock(retrieved);
      userContentForApi = ctx
        ? `${text}\n\n【参考资料】\n${ctx}`
        : `${text}\n\n（说明：在你已上传的资料里没找到相关片段。）`;
    }
    setShowKbEmpty(false);

    setInput("");
    requestAnimationFrame(() => autoResize());

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ];
    setMessages(next);
    setStreaming(true);

    const apiMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userContentForApi },
    ];

    const assistantIndex = next.length - 1;
    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat(
      apiMessages,
      mode,
      {
        onChunk: (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return copy;
          });
        },
        onDone: () => {
          setStreaming(false);
          abortRef.current = null;
          if (mode === "rag" && retrieved.length > 0) {
            setMessages((prev) => {
              const finalContent = prev[assistantIndex]?.content || "";
              if (finalContent.trim()) {
                setCitationsByMsg((m) => ({
                  ...m,
                  [finalContent]: retrieved,
                }));
              }
              return prev;
            });
          }
        },
        onError: (msg) => {
          setError(msg);
          setStreaming(false);
          abortRef.current = null;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant" && last.content === "") {
              copy.pop();
            }
            return copy;
          });
        },
        signal: controller.signal,
      },
      examId
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  function applySuggestion(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autoResize();
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const isText =
      f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name);
    if (!isText) {
      setError("当前版本只支持 .txt 文件，PDF / 图片即将支持。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      setInput((prev) => (prev ? prev + "\n\n" + content : content));
      requestAnimationFrame(() => {
        taRef.current?.focus();
        autoResize();
      });
    };
    reader.readAsText(f);
  }

  function clearHistory() {
    setMessages([]);
    setError(null);
    setTranslations({});
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      {!isEmpty && (
        <div
          className="shrink-0 border-b px-6 py-2.5 flex items-center justify-between"
          style={{
            borderColor: "var(--border)",
            background: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div className="text-[13px] text-[var(--text-muted)]">
            对话 · 共 {messages.filter((m) => m.role === "user").length} 轮
          </div>
          <button
            onClick={clearHistory}
            className="hf-btn-ghost text-[12.5px] px-2.5 py-1"
          >
            清空对话
          </button>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarGutter: "stable" }}
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-[720px] text-center">
              <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-tight">
                大部头教材，不必硬啃。
              </h1>
              <p className="text-[15px] text-[var(--text-muted)] mt-3">
                {nickname}，上传日语教材，得到中文笔记。
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-[760px] mx-auto px-6 py-8 space-y-6">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const isStreaming =
                streaming && isLast && m.role === "assistant";
              const canTranslate =
                m.role === "assistant" && !isStreaming && !!m.content.trim();
              const citations =
                m.role === "assistant" && !isStreaming
                  ? citationsByMsg[m.content]
                  : undefined;
              return (
                <MessageBubble
                  key={i}
                  role={m.role}
                  content={m.content}
                  streaming={isStreaming}
                  nickname={nickname}
                  translationCached={
                    canTranslate ? translations[m.content] : undefined
                  }
                  onTranslated={
                    canTranslate
                      ? (translation) =>
                          setTranslations((prev) => ({
                            ...prev,
                            [m.content]: translation,
                          }))
                      : undefined
                  }
                  citations={citations}
                />
              );
            })}
          </div>
        )}
      </div>

      <div
        className="shrink-0 px-6 pb-6 pt-2 overflow-y-auto"
        style={{ maxHeight: "60vh" }}
      >
        <div className="max-w-[760px] mx-auto">
          {error && (
            <div className="mb-3 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {showGuide && (
            <RestrictionGuide
              onPick={(sample, exId) => {
                setExamId(exId);
                setInput(sample);
                setShowGuide(false);
                requestAnimationFrame(() => {
                  taRef.current?.focus();
                  autoResize();
                });
              }}
              onDismiss={() => setShowGuide(false)}
            />
          )}
          {showKbEmpty && (
            <div
              className="rounded-xl border p-4 mb-3 flex items-start gap-3"
              style={{
                background: "rgba(255,255,255,0.88)",
                borderColor: "#e5dff3",
                backdropFilter: "blur(14px) saturate(120%)",
                WebkitBackdropFilter: "blur(14px) saturate(120%)",
              }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center"
                style={{ background: "#f0ecf7", color: "#6d5fa6" }}
              >
                <GraduationCap size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-[var(--text)]">
                  你还没有上传任何资料
                </h3>
                <p className="text-[12.5px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  「学霸思考」会基于你在「翻译资料」或「考点卡片」里上传的内容回答。
                  请先去那两个 tab 上传一份资料，再回来开启学霸思考。
                </p>
                <button
                  onClick={() => {
                    setRagOn(false);
                    setShowKbEmpty(false);
                  }}
                  className="text-[12px] text-[var(--text-subtle)] hover:text-[var(--text-muted)] mt-2"
                >
                  好的，先关闭学霸思考
                </button>
              </div>
              <button
                onClick={() => setShowKbEmpty(false)}
                className="hf-btn-ghost p-1"
                aria-label="关闭"
              >
                <XIcon size={14} />
              </button>
            </div>
          )}
          <div
            className="hf-input px-4 pt-3.5 pb-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            style={{
              background: "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(14px) saturate(120%)",
              WebkitBackdropFilter: "blur(14px) saturate(120%)",
            }}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="粘贴一段日语，或者直接问一个专业问题…"
              rows={2}
              disabled={streaming}
              className="w-full resize-none bg-transparent outline-none text-[15px] leading-relaxed placeholder:text-[var(--text-subtle)] disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={streaming}
                  className="hf-btn-ghost flex items-center gap-1.5 text-[13px] px-2.5 py-1.5 disabled:opacity-50"
                >
                  <Paperclip size={14} />
                  上传文件
                </button>
                <ExamSelector value={examId} onChange={setExamId} />
                <button
                  type="button"
                  onClick={() => {
                    setRagOn((v) => !v);
                    setShowKbEmpty(false);
                  }}
                  disabled={streaming}
                  className="flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50"
                  style={{
                    background: ragOn ? "#f0ecf7" : "rgba(255,255,255,0.7)",
                    borderColor: ragOn ? "#d6cdec" : "var(--border)",
                    color: ragOn ? "#6d5fa6" : "var(--text-muted)",
                  }}
                  title={
                    ragOn
                      ? "学霸思考已开启：AI 会先翻你的资料再回答"
                      : "开启后，AI 会先检索你上传的资料"
                  }
                >
                  <GraduationCap size={13} />
                  <span className="font-medium">学霸思考</span>
                  {ragOn && (
                    <span
                      className="ml-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: "#6d5fa6" }}
                    />
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".txt,.md,text/*"
                onChange={handleFile}
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="grid place-items-center w-9 h-9 rounded-lg text-white"
                  style={{ background: "#6d5fa6" }}
                  aria-label="停止生成"
                  title="停止生成"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim()}
                  className="grid place-items-center w-9 h-9 rounded-lg text-white disabled:bg-[var(--border-strong)] disabled:cursor-not-allowed"
                  style={{
                    background: input.trim() ? "var(--accent)" : undefined,
                  }}
                  aria-label="发送"
                >
                  <ArrowUp size={16} />
                </button>
              )}
            </div>
          </div>

          {isEmpty && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  className="hf-chip"
                  onClick={() => applySuggestion(s.prompt)}
                >
                  <span className="text-[#6d5fa6]">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ nickname }: { nickname: string }) {
  const initial = (nickname?.trim()?.[0] || "U").toUpperCase();
  return (
    <div
      className="shrink-0 w-8 h-8 rounded-full grid place-items-center text-white text-[13px] font-medium select-none"
      style={{ background: "var(--accent)" }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="shrink-0 w-8 h-8 rounded-full grid place-items-center select-none"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: "1px solid var(--border)",
      }}
      aria-hidden
    >
      <BrandMark size={20} showWordmark={false} />
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
  nickname,
  translationCached,
  onTranslated,
  citations,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  nickname: string;
  translationCached?: string;
  onTranslated?: (translation: string) => void;
  citations?: Retrieved[];
}) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? <UserAvatar nickname={nickname} /> : <AssistantAvatar />}
      <div
        className={`flex flex-col min-w-0 flex-1 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`max-w-[88%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words`}
          style={{
            background: isUser ? "var(--accent)" : "rgba(255, 255, 255, 0.85)",
            color: isUser ? "#fff" : "var(--text)",
            border: isUser ? "none" : "1px solid var(--border)",
            backdropFilter: isUser ? "none" : "blur(8px)",
            WebkitBackdropFilter: isUser ? "none" : "blur(8px)",
          }}
        >
          {content || (streaming ? "" : " ")}
          {streaming && (
            <span
              className="inline-block w-[7px] h-[14px] align-[-2px] ml-0.5 animate-pulse"
              style={{ background: "var(--text-muted)" }}
            />
          )}
        </div>
        {!isUser && !streaming && citations && citations.length > 0 && (
          <div className="max-w-[88%] w-full mt-2">
            <CitationStrip citations={citations} />
          </div>
        )}
        {!isUser && !streaming && onTranslated && (
          <div className="max-w-[88%] w-full">
            <TranslateAffordance
              source={content}
              cached={translationCached}
              onTranslated={onTranslated}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CitationStrip({ citations }: { citations: Retrieved[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-subtle)]">
        <BookOpenIcon size={11} />
        引用 {citations.length} 段来自你上传的资料
      </div>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => {
          const isOpen = openIdx === i;
          return (
            <button
              key={c.chunk.id}
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="text-[11.5px] px-2 py-1 rounded-md border transition-colors text-left"
              style={{
                background: isOpen ? "#f0ecf7" : "rgba(255,255,255,0.7)",
                borderColor: isOpen ? "#d6cdec" : "var(--border)",
                color: isOpen ? "#6d5fa6" : "var(--text-muted)",
              }}
              title={c.chunk.text.slice(0, 80)}
            >
              <span style={{ color: "#6d5fa6", fontWeight: 500 }}>
                [{i + 1}]
              </span>{" "}
              {c.chunk.source} · {c.chunk.sourceTitle} · 第 {c.chunk.segmentIndex + 1} 段
            </button>
          );
        })}
      </div>
      {openIdx !== null && citations[openIdx] && (
        <div
          className="rounded-md px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap"
          style={{
            background: "rgba(240, 236, 247, 0.55)",
            borderLeft: "2px solid #c4b5fd",
            color: "var(--text)",
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          {citations[openIdx].chunk.text}
        </div>
      )}
    </div>
  );
}
