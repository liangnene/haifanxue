export type Exam = {
  id: string;
  name: string;
  nameJa: string;
  field: string;
  keywords: string[];
  sample: string;
};

export const EXAMS: Exam[] = [
  {
    id: "takken",
    name: "宅地建物取引士",
    nameJa: "宅地建物取引士",
    field: "不动产交易",
    keywords: [
      "宅建", "宅地建物", "宅建士", "宅建業法", "宅地建物取引",
      "媒介契約", "媒介契约", "重要事項説明", "重要事项说明",
      "37条書面", "35条書面", "不動産", "不动产", "登記", "登记",
      "借地借家", "区分所有",
    ],
    sample: "宅建业法中『媒介契约』有哪几种？",
  },
  {
    id: "gyosei",
    name: "行政书士",
    nameJa: "行政書士",
    field: "法律 / 行政手续",
    keywords: [
      "行政书士", "行政書士", "行政法", "民法", "憲法", "宪法",
      "在留資格", "在留资格", "入管", "永住", "帰化", "归化",
      "ビザ", "签证", "行政手続",
    ],
    sample: "在留资格『技術・人文知識・国際業務』和『高度専門職』有什么区别？",
  },
  {
    id: "zeirishi",
    name: "税理士",
    nameJa: "税理士",
    field: "税务",
    keywords: [
      "税理士", "税理师", "税法", "法人税", "所得税", "消費税", "消费税",
      "相続税", "相続稅", "贈与税", "赠与税", "簿記論", "财务诸表",
      "国税", "源泉徴収",
    ],
    sample: "日本法人税的税率分档是怎样的？",
  },
  {
    id: "shihoshoshi",
    name: "司法书士",
    nameJa: "司法書士",
    field: "不动产登记 / 公司登记",
    keywords: [
      "司法书士", "司法書士", "不動産登記", "不动产登记", "商業登記",
      "商业登记", "供託", "民事訴訟", "民事诉讼", "登記簿",
    ],
    sample: "不动产登记中『所有権移転登記』的必要书类有哪些？",
  },
  {
    id: "sharoshi",
    name: "社会保険労務士（社労士）",
    nameJa: "社会保険労務士",
    field: "劳动法 / 社保",
    keywords: [
      "社労士", "社劳士", "社会保険労務士", "労働基準法", "労基法",
      "労働法", "劳动法", "雇用保険", "厚生年金", "健康保険",
      "労災", "社保", "就業規則",
    ],
    sample: "日本『有給休暇』的取得条件是什么？",
  },
  {
    id: "kaikeishi",
    name: "公认会计士",
    nameJa: "公認会計士",
    field: "审计 / 会计",
    keywords: [
      "公认会计士", "公認会計士", "会計士", "監査", "監査論",
      "財務会計", "管理会計", "簿記", "企業会計原則", "IFRS",
    ],
    sample: "公认会计士短答式考试有哪几个科目？",
  },
  {
    id: "shindanshi",
    name: "中小企业诊断士",
    nameJa: "中小企業診断士",
    field: "经营咨询",
    keywords: [
      "中小企业诊断士", "中小企業診断士", "診断士",
      "経営戦略", "经营战略", "運営管理", "経済学", "経営法務",
      "事例", "二次試験",
    ],
    sample: "中小企业诊断士二次考试的『事例 I』考察什么？",
  },
  {
    id: "kanteishi",
    name: "不动产鉴定士",
    nameJa: "不動産鑑定士",
    field: "不动产估值",
    keywords: [
      "不动产鉴定士", "不動産鑑定士", "鑑定評価",
      "収益還元法", "原価法", "取引事例比較法",
    ],
    sample: "不动产鉴定的『収益還元法』和『原価法』分别适用什么场景？",
  },
  {
    id: "nihongokyoshi",
    name: "日本语教师能力检定",
    nameJa: "日本語教育能力検定試験",
    field: "日语教学",
    keywords: [
      "日本语教师", "日本語教師", "日本語教育", "日语教学",
      "教育能力検定", "音声学", "文法体系",
    ],
    sample: "日语教育能力检定考试『音声学』部分常考的辅音分类有哪些？",
  },
  {
    id: "kaigo",
    name: "介护福祉士",
    nameJa: "介護福祉士",
    field: "养老护理",
    keywords: [
      "介护福祉士", "介護福祉士", "介護", "介护",
      "認知症", "认知症", "ケアプラン", "福祉",
      "介護保険",
    ],
    sample: "介护福祉士国家试验的合格基准是什么？",
  },
  {
    id: "torokuhanbai",
    name: "登录贩卖者",
    nameJa: "登録販売者",
    field: "一般用医药品销售",
    keywords: [
      "登录贩卖者", "登録販売者", "登録販売",
      "第二類医薬品", "第三類医薬品", "一般用医薬品", "薬機法",
    ],
    sample: "第二类医药品和第三类医药品在销售时有什么区别？",
  },
  {
    id: "kihonjoho",
    name: "基本情报技术者",
    nameJa: "基本情報技術者試験",
    field: "IT 基础",
    keywords: [
      "基本情报技术者", "基本情報技術者", "FE試験",
      "アルゴリズム", "情报技术", "情報処理",
    ],
    sample: "基本情报技术者考试中科目 A 和科目 B 的区别？",
  },
  {
    id: "oyojoho",
    name: "应用情报技术者",
    nameJa: "応用情報技術者試験",
    field: "IT 进阶",
    keywords: [
      "应用情报技术者", "応用情報技術者", "AP試験",
      "システム開発", "ネットワーク", "データベース", "情报処理",
    ],
    sample: "应用情报技术者午后试题选 5 道，怎么选最优策略？",
  },
  {
    id: "boki2",
    name: "日商簿记 2 级",
    nameJa: "日商簿記 2 級",
    field: "会计入门",
    keywords: [
      "簿记", "簿記", "日商簿記", "日商簿记",
      "商業簿記", "工業簿記", "仕訳", "决算整理",
    ],
    sample: "日商簿记 2 级『工業簿記』中『総合原価計算』和『個別原価計算』的区别？",
  },
  {
    id: "jlpt",
    name: "JLPT N1 / 日语能力测试",
    nameJa: "日本語能力試験 N1",
    field: "日语能力",
    keywords: [
      "JLPT", "N1", "N2", "日语能力", "日本語能力",
      "語彙", "文法", "読解", "聴解", "汉字读音",
    ],
    sample: "JLPT N1 的『読解』部分有哪几种题型？",
  },
];

const ALL_KEYWORDS = EXAMS.flatMap((e) => [
  e.name,
  e.nameJa,
  ...e.keywords,
]).map((k) => k.toLowerCase());

const GENERIC_EXAM_TERMS = [
  "考试", "考証", "考证", "資格", "资格", "試験", "考过", "备考",
  "国家試験", "国家资格", "合格率", "合格基准",
];

export type GateResult =
  | { allowed: true; matchedExamId: string | null }
  | { allowed: false; reason: "no_match" };

export function checkExamRelevance(text: string, examId: string | null): GateResult {
  const lower = text.toLowerCase();

  if (examId) {
    const exam = EXAMS.find((e) => e.id === examId);
    if (exam) {
      const hit = [exam.name, exam.nameJa, ...exam.keywords].some((k) =>
        lower.includes(k.toLowerCase())
      );
      if (hit || GENERIC_EXAM_TERMS.some((k) => lower.includes(k.toLowerCase()))) {
        return { allowed: true, matchedExamId: examId };
      }
    }
  }

  for (const exam of EXAMS) {
    const hit = [exam.name, exam.nameJa, ...exam.keywords].some((k) =>
      lower.includes(k.toLowerCase())
    );
    if (hit) return { allowed: true, matchedExamId: exam.id };
  }

  if (ALL_KEYWORDS.some((k) => lower.includes(k))) {
    return { allowed: true, matchedExamId: null };
  }

  return { allowed: false, reason: "no_match" };
}

export function findExam(id: string | null) {
  if (!id) return null;
  return EXAMS.find((e) => e.id === id) ?? null;
}
