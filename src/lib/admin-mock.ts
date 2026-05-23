// Deterministic mock data for the admin dashboard.
// Same seed → same shape every refresh, so screenshots stay stable.

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260520;

export type TrendPoint = {
  date: string;
  dau: number;
  apiCalls: number;
  uploads: number;
};

export type FeatureKey = "chat" | "translate" | "cards";

export type FeatureUsage = {
  key: FeatureKey;
  name: string;
  calls: number;
  users: number;
  avgDurationMs: number;
  trend: number[];
};

export type ExamTypeShare = {
  name: string;
  value: number;
};

export type RouteKey = "/api/chat" | "/api/parse-file" | "/api/ocr-image";

export type RouteStat = {
  route: RouteKey;
  calls: number;
  p50: number;
  p95: number;
  errorRate: number;
  trend: number[];
};

export type ModelShare = {
  name: "DeepSeek" | "OpenAI";
  calls: number;
  tokens: number;
  costUsd: number;
};

export type ErrorLog = {
  id: string;
  time: string;
  route: RouteKey;
  type: "TIMEOUT" | "RATE_LIMIT" | "INVALID_INPUT" | "UPSTREAM_5XX" | "PARSE_FAILED";
  message: string;
};

export type DashboardSummary = {
  dauToday: number;
  dauDelta: number;
  totalUsers: number;
  totalUsersDelta: number;
  apiCallsToday: number;
  apiCallsDelta: number;
  tokensToday: number;
  tokensDelta: number;
  trend30d: TrendPoint[];
};

export type UsageSummary = {
  features: FeatureUsage[];
  examTypes: ExamTypeShare[];
  chatQuality: {
    avgTurns: number;
    avgQuestionLen: number;
    ragHitRate: number;
  };
};

export type ApiSummary = {
  routes: RouteStat[];
  models: ModelShare[];
  errors: ErrorLog[];
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(d: Date) {
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function build() {
  const rand = mulberry32(SEED);
  const today = new Date("2026-05-20T10:00:00");

  const trend30d: TrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = weekend ? 0.7 : 1;
    const growth = 1 + (29 - i) * 0.012;
    const dau = Math.round((40 + rand() * 30) * base * growth);
    const apiCalls = Math.round(dau * (8 + rand() * 6));
    const uploads = Math.round(dau * (0.4 + rand() * 0.5));
    trend30d.push({ date: formatDate(d), dau, apiCalls, uploads });
  }

  const last = trend30d[trend30d.length - 1];
  const prev = trend30d[trend30d.length - 2];
  const dauDelta = ((last.dau - prev.dau) / prev.dau) * 100;
  const apiCallsDelta = ((last.apiCalls - prev.apiCalls) / prev.apiCalls) * 100;

  const dashboard: DashboardSummary = {
    dauToday: last.dau,
    dauDelta,
    totalUsers: 1284,
    totalUsersDelta: 3.4,
    apiCallsToday: last.apiCalls,
    apiCallsDelta,
    tokensToday: Math.round(last.apiCalls * (820 + rand() * 200)),
    tokensDelta: 8.7,
    trend30d,
  };

  const featureSpark = (factor: number) =>
    Array.from({ length: 14 }, () => Math.round(40 * factor + rand() * 30 * factor));

  const features: FeatureUsage[] = [
    {
      key: "chat",
      name: "对话",
      calls: 8420,
      users: 612,
      avgDurationMs: 1840,
      trend: featureSpark(1.0),
    },
    {
      key: "translate",
      name: "翻译资料",
      calls: 3210,
      users: 428,
      avgDurationMs: 4220,
      trend: featureSpark(0.55),
    },
    {
      key: "cards",
      name: "考点卡片",
      calls: 1875,
      users: 271,
      avgDurationMs: 2680,
      trend: featureSpark(0.35),
    },
  ];

  const examTypes: ExamTypeShare[] = [
    { name: "宅建士", value: 38 },
    { name: "行政書士", value: 24 },
    { name: "税理士", value: 17 },
    { name: "社労士", value: 11 },
    { name: "其他", value: 10 },
  ];

  const usage: UsageSummary = {
    features,
    examTypes,
    chatQuality: {
      avgTurns: 4.6,
      avgQuestionLen: 38,
      ragHitRate: 0.72,
    },
  };

  const routes: RouteStat[] = [
    {
      route: "/api/chat",
      calls: 8420,
      p50: 620,
      p95: 1840,
      errorRate: 0.012,
      trend: featureSpark(1.0),
    },
    {
      route: "/api/parse-file",
      calls: 2140,
      p50: 1280,
      p95: 4820,
      errorRate: 0.034,
      trend: featureSpark(0.4),
    },
    {
      route: "/api/ocr-image",
      calls: 1070,
      p50: 980,
      p95: 3210,
      errorRate: 0.021,
      trend: featureSpark(0.25),
    },
  ];

  const models: ModelShare[] = [
    { name: "DeepSeek", calls: 6240, tokens: 5_280_000, costUsd: 12.8 },
    { name: "OpenAI", calls: 2180, tokens: 1_940_000, costUsd: 38.6 },
  ];

  const errorTypes: ErrorLog["type"][] = [
    "TIMEOUT",
    "RATE_LIMIT",
    "INVALID_INPUT",
    "UPSTREAM_5XX",
    "PARSE_FAILED",
  ];
  const errorMessages: Record<ErrorLog["type"], string> = {
    TIMEOUT: "上游模型响应超时（30s）",
    RATE_LIMIT: "上游 429，达到分钟级速率上限",
    INVALID_INPUT: "请求体缺少 messages 字段",
    UPSTREAM_5XX: "上游返回 502 Bad Gateway",
    PARSE_FAILED: "PDF 解析失败：文件加密或损坏",
  };
  const routeKeys: RouteKey[] = ["/api/chat", "/api/parse-file", "/api/ocr-image"];

  const errors: ErrorLog[] = Array.from({ length: 50 }, (_, i) => {
    const t = errorTypes[Math.floor(rand() * errorTypes.length)];
    const route = routeKeys[Math.floor(rand() * routeKeys.length)];
    const d = new Date(today);
    d.setMinutes(d.getMinutes() - Math.floor(rand() * 60 * 24 * 3));
    return {
      id: `err-${i + 1}`,
      time: formatDateTime(d),
      route,
      type: t,
      message: errorMessages[t],
    };
  }).sort((a, b) => (a.time < b.time ? 1 : -1));

  const api: ApiSummary = { routes, models, errors };

  return { dashboard, usage, api };
}

const SNAPSHOT = build();

export function getDashboardSummary(): DashboardSummary {
  return SNAPSHOT.dashboard;
}

export function getUsageSummary(): UsageSummary {
  return SNAPSHOT.usage;
}

export function getApiSummary(): ApiSummary {
  return SNAPSHOT.api;
}
