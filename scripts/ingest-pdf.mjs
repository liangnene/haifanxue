/**
 * PDF 向量化入库脚本（OCR 版）
 * 用法：node scripts/ingest-pdf.mjs <pdf路径> <书名>
 * 依赖：poppler（brew install poppler）、百度 OCR API
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JINA_API_KEY = process.env.JINA_API_KEY;
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY;
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JINA_API_KEY) {
  console.error("缺少环境变量：SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / JINA_API_KEY");
  process.exit(1);
}
if (!BAIDU_OCR_API_KEY || !BAIDU_OCR_SECRET_KEY) {
  console.error("缺少百度 OCR 环境变量：BAIDU_OCR_API_KEY / BAIDU_OCR_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 80;
const BATCH_SIZE = 8;
const EMBED_DELAY_MS = 300;
const OCR_DELAY_MS = 200; // 百度 OCR 限流间隔

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkText(text) {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 30) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

let baiduToken = null;
async function getBaiduToken() {
  if (baiduToken) return baiduToken;
  const res = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_OCR_API_KEY}&client_secret=${BAIDU_OCR_SECRET_KEY}`,
    { method: "POST" }
  );
  const json = await res.json();
  baiduToken = json.access_token;
  return baiduToken;
}

async function ocrImage(imagePath) {
  const token = await getBaiduToken();
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString("base64");

  const body = new URLSearchParams();
  body.append("image", base64);
  body.append("language_type", "JAP"); // 日文识别

  const res = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );
  const json = await res.json();
  if (json.error_code) throw new Error(`百度OCR错误: ${json.error_msg}`);
  return (json.words_result || []).map((w) => w.words).join("\n");
}

async function embedBatch(texts) {
  const res = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: "jina-embeddings-v3",
      input: texts,
      task: "retrieval.passage",
      dimensions: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jina API 失败 (${res.status}): ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

async function main() {
  const pdfPath = process.argv[2];
  const bookTitle = process.argv[3];
  const startPage = parseInt(process.argv[4] || "1");

  if (!pdfPath || !bookTitle) {
    console.error("用法：node scripts/ingest-pdf.mjs <pdf路径> <书名> [起始页]");
    process.exit(1);
  }

  const resolvedPath = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`文件不存在：${resolvedPath}`);
    process.exit(1);
  }

  const bookId = bookTitle.replace(/[^\w　-鿿]/g, "_").slice(0, 40);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "haifanxue-ocr-"));

  try {
    // 获取 PDF 总页数
    const infoOut = execSync(`pdfinfo "${resolvedPath}" 2>/dev/null || echo "Pages: 0"`, { encoding: "utf8" });
    const pagesMatch = infoOut.match(/Pages:\s+(\d+)/);
    const totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
    console.log(`\n📖 书名：${bookTitle}，共 ${totalPages} 页`);
    console.log(`   从第 ${startPage} 页开始 OCR 识别...\n`);

    // 检查已入库数量（断点续传）
    const { count: existingCount } = await supabase
      .from("kb_chunks")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId);

    if (existingCount > 0 && startPage === 1) {
      console.log(`⚠️  已有 ${existingCount} 条旧数据，先清除...`);
      await supabase.from("kb_chunks").delete().eq("book_id", bookId);
      console.log("✓ 旧数据清除完成\n");
    }

    // 按页处理：每页转图片 → OCR → 累积文字 → 分块入库
    const PAGE_BATCH = 10; // 每 10 页做一次入库
    let pageTexts = [];
    let globalChunkIndex = existingCount || 0;
    let totalInserted = 0;

    for (let page = startPage; page <= totalPages; page++) {
      process.stdout.write(`  第 ${page}/${totalPages} 页：转图片...`);

      // PDF 页转图片
      const imgPrefix = path.join(tmpDir, `page`);
      execSync(
        `pdftoppm -r 80 -f ${page} -l ${page} -png "${resolvedPath}" "${imgPrefix}"`,
        { stdio: "pipe" }
      );

      // 找生成的图片文件
      const imgFiles = fs.readdirSync(tmpDir)
        .filter((f) => f.startsWith("page") && f.endsWith(".png"))
        .map((f) => path.join(tmpDir, f));

      if (imgFiles.length === 0) {
        process.stdout.write(` ✗ 无图片\n`);
        continue;
      }

      const imgPath = imgFiles[0];
      process.stdout.write(` OCR...`);

      let pageText = "";
      try {
        pageText = await ocrImage(imgPath);
        await sleep(OCR_DELAY_MS);
      } catch (err) {
        process.stdout.write(` ✗ OCR失败: ${err.message}\n`);
      } finally {
        fs.unlinkSync(imgPath);
      }

      if (pageText.trim().length > 10) {
        pageTexts.push({ page, text: pageText });
        process.stdout.write(` ✓ ${pageText.length}字\n`);
      } else {
        process.stdout.write(` - 空页跳过\n`);
      }

      // 每 PAGE_BATCH 页或最后一页时入库
      if (pageTexts.length >= PAGE_BATCH || page === totalPages) {
        if (pageTexts.length === 0) continue;

        const combinedText = pageTexts.map((p) => p.text).join("\n\n");
        const chunks = chunkText(combinedText);

        if (chunks.length === 0) {
          pageTexts = [];
          continue;
        }

        console.log(`\n  → 正在向量化 ${chunks.length} 个分块并入库...`);

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE);
          try {
            const embeddings = await embedBatch(batch);
            const rows = batch.map((content, j) => ({
              book_title: bookTitle,
              book_id: bookId,
              page_number: pageTexts[0]?.page ?? null,
              chunk_index: globalChunkIndex++,
              content,
              embedding: embeddings[j],
            }));
            const { error } = await supabase.from("kb_chunks").insert(rows);
            if (error) throw new Error(error.message);
            totalInserted += batch.length;
            process.stdout.write(`  ✓ 已入库 ${totalInserted} 块\r`);
          } catch (err) {
            console.log(`\n  ✗ 入库失败: ${err.message}`);
          }
          if (i + BATCH_SIZE < chunks.length) await sleep(EMBED_DELAY_MS);
        }
        console.log();
        pageTexts = [];
      }
    }

    console.log(`\n✅ 全部完成！共入库 ${totalInserted} 块`);
    console.log(`   书名：${bookTitle}（book_id: ${bookId}）`);
  } finally {
    // 清理临时目录
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  }
}

main().catch((err) => {
  console.error("脚本执行出错：", err);
  process.exit(1);
});
