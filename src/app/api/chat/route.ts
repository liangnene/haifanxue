import { NextRequest } from "next/server";
import { EXAMS } from "@/lib/exams";
import { vectorRetrieve, buildVectorContextBlock } from "@/lib/vector-kb";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOKENS = 2000;
const MAX_HISTORY_TURNS = 10;

type Mode = "chat" | "translate" | "cards" | "ja2zh" | "zh2ja" | "rag" | "format" | "segment";

const EXAM_LIST_TEXT = EXAMS.map((e) => `${e.name}（${e.nameJa}）`).join("、");

const SYSTEM_PROMPTS: Record<Mode, string> = {
  chat: `你是「海翻学」的 AI 学习助手，专注于以下 15 个日本国家资格考试的备考问答：
${EXAM_LIST_TEXT}

回答要求：
1. 用简洁清晰的中文回答；
2. 涉及日语专业术语时，附上日语原文，例如：善意第三者（善意の第三者）；
3. 无论用户说什么，都要想办法把话题引回考试备考方向，哪怕是牵强附会也要联系到上面某个考试的知识点上，让用户感受到学习的连接感；
4. 如果用户还没有选择考试方向，在回复末尾加一句："你目前在备考哪个考试？选定方向后我可以更精准地帮你！"；
5. 不要冗长，控制在 600 字以内。`,

  translate: `你是一名专业的日中翻译，专注于日本国家资格考试教材的翻译。
请把用户输入的日语内容翻译成自然准确的中文。要求：
1. 法律、行政等专业术语首次出现时，用括号附上日语原文，例如：善意第三者（善意の第三者）；
2. 保持原文的段落结构与编号；
3. 只输出译文，不要加任何解释或前后说明。`,

  cards: `你是日本资格考试备考助手。把用户给你的教材内容（可能是日语或中文）提取成考点卡片，严格输出 JSON 数组，不要任何额外文字、不要 markdown 代码块、不要解释。

输出要求：
- 数量：根据内容信息量自行决定，**3 到 8 张**之间；信息少就少出，避免凑数
- 每张卡片必须包含以下 4 个字段，**所有字段都用中文**：
  - "concept": 概念名称，若有对应日语术语，用 "中文 / 日语" 格式；否则只写中文
  - "definition": 中文定义，**1-2 句话**讲清楚，控制在 60 字以内
  - "caution": 易错点或注意事项，**1 句话**，控制在 50 字以内
  - "question": 一道典型考题及答案，**1 句话**，控制在 60 字以内

示例：
[{"concept":"善意第三者 / 善意の第三者","definition":"不知情且无过失的第三人。","caution":"善意不等于无过失，必须同时满足。","question":"善意第三者一定受到保护吗？答：还需无过失。"}]

只输出 JSON 数组本体，不要任何额外内容。`,

  ja2zh: `把用户输入的日语翻译成简洁自然的中文。要求：
1. 直接输出中文译文，不要任何前后说明、不要"翻译如下"之类的开头；
2. 保持原文的段落结构；
3. 若原文里有汉字术语，保留即可，不必括号标注。`,

  zh2ja: `把用户输入的中文翻译成自然地道的日语。要求：
1. 直接输出日语译文，不要任何前后说明、不要"翻訳"之类的开头；
2. 使用日本人日常会用的表达，避免生硬直译；
3. 保持原文的段落结构。`,

  format: `你是一名专业的排版编辑。用户会给你两部分内容，用 ===SOURCE=== 和 ===TRANSLATION=== 分隔：原文（日语或英语）和对应的中文译文。两者排版都可能很乱（断行、多余空格、堆积的换行等）。

请按以下步骤处理：

第一步：整理译文
- 把零散断行合并成完整自然的段落
- 段落之间保留一个空行
- 保留编号、列表、标题等结构
- 不修改任何词句含义

第二步：按整理后的译文段落数，对原文做严格同步分段（**这一步极其重要，必须执行**）
- 译文整理出 N 段，原文也必须恰好输出 N 段，不能多也不能少
- 即使原文看起来是一整块没有换行，你也必须根据译文的分段位置在原文里找到对应位置切开
- 常见切分信号词（任何一个出现都应该切开）：题号（问11、問12）、选项编号（☆1 ☆2 ☆3 ☆4、①②③④、1. 2. 3.）、章节标识（第◯条、第◯章）、自然段转折（しかし、また、なお、ただし）
- 例如：译文是 "问11..." + "☆1..." + "☆2..." + "☆3..." + "☆4..." 共 5 段，那么原文必须切成 5 段，分别对应 "問11..." "☆1..." "☆2..." "☆3..." "☆4..."
- 把 PDF/OCR 造成的句子内部断行合并成完整句子
- 不修改原文任何文字内容，只调整断行和段落

输出前自检：数一下 ===TRANSLATION=== 里有几段（空行分隔），===SOURCE=== 必须有相同段数。如果不一致，重新分段。

输出格式（严格遵守，不要加任何额外说明）：
===TRANSLATION===
整理后的译文，段落之间空一行

===SOURCE===
重排后的原文，段落之间空一行`,

  segment: `用户会给你两部分内容，用 ===SOURCE=== 和 ===TRANSLATION=== 分隔：原文（日语或中文）和对应的译文。

译文已按段落整理好，每段之间有空行。请严格按照以下规则操作：

1. 先数清译文共有多少段（每个空行分隔的块算一段），记为 N；
2. 把原文也拆分成**恰好 N 段**，每段对应译文中同序号的那段内容；
3. 段落之间用**一个空行**分隔（共 N-1 个空行）；
4. 不要修改原文任何文字，只在合适位置插入空行；
5. 只输出重新分段后的原文，不要加任何说明、序号、译文，也不要 ===SOURCE=== 之类的标记。`,

  rag: `你是「海翻学」的 AI 学习助手（学霸思考模式）。用户提问时末尾可能附带两类参考资料：
- 【参考资料】：来自用户自己上传的翻译或卡片
- 【专业教材参考】：来自日本国家资格考试原版教材（权威性更高）

回答要求：
1. **优先依据参考资料回答**，【专业教材参考】权威性高于【参考资料】；
2. 引用对应内容时在句末标注来源编号，例如：媒介契约分为三种 [参考1]；
3. 如果两类资料都没有相关内容，直接用专业知识回答，不要说"没有找到"；
4. 用中文回答，简洁清晰，控制在 600 字以内；日语术语首次出现时附原文，如：善意第三者（善意の第三者）；
5. 不要复述原文，要重新组织语言。`,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl =
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "DEEPSEEK_API_KEY 未配置" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    messages?: Array<{ role: string; content: string }>;
    mode?: Mode;
    examId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求体不是合法 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages = [], mode = "chat", examId = null } = body;

  let systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.chat;
  if (mode === "chat" && examId) {
    const exam = EXAMS.find((e) => e.id === examId);
    if (exam) {
      systemPrompt += `\n\n用户当前正在备考：**${exam.name}（${exam.nameJa}）**，请围绕该考试的范围回答。`;
    }
  }

  // rag 模式：把向量知识库检索结果注入最后一条用户消息
  let processedMessages = [...messages];
  if (mode === "rag" && messages.length > 0) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      const vectorChunks = await vectorRetrieve(lastUserMsg.content, 4);
      const vectorCtx = buildVectorContextBlock(vectorChunks);
      if (vectorCtx) {
        // 把向量库内容追加到用户消息末尾（用户消息里可能已有 BM25 片段）
        processedMessages = messages.map((m, i) => {
          const isLastUser =
            m.role === "user" &&
            i === messages.map((x) => x.role).lastIndexOf("user");
          if (!isLastUser) return m;
          const alreadyHasCtx = m.content.includes("【参考资料】");
          if (alreadyHasCtx) {
            return { ...m, content: m.content + `\n\n【专业教材参考】\n${vectorCtx}` };
          }
          return { ...m, content: `${m.content}\n\n【专业教材参考】\n${vectorCtx}` };
        });
      }
    }
  }

  const truncated = processedMessages.slice(-MAX_HISTORY_TURNS * 2);

  const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      stream: true,
      max_tokens: mode === "format" ? 8000 : MAX_TOKENS,
      messages: [{ role: "system", content: systemPrompt }, ...truncated],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: "DeepSeek 调用失败",
        status: upstream.status,
        detail: text.slice(0, 500),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
