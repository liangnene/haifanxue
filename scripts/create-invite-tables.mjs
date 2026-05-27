// 一次性脚本：在 Supabase 创建 invite_codes 表
// 用法：node scripts/create-invite-tables.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sql = `
create table if not exists public.invite_codes (
  code        text primary key,
  used_by     uuid references auth.users(id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists invite_codes_used_by_idx on public.invite_codes(used_by);
create index if not exists invite_codes_created_at_idx on public.invite_codes(created_at desc);

alter table public.invite_codes enable row level security;

-- 默认禁止所有 anon/authenticated 直接读写；只有 service_role 能操作
drop policy if exists "invite_codes_no_public_access" on public.invite_codes;
create policy "invite_codes_no_public_access"
  on public.invite_codes
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- profiles 表加一列：activated_at（激活时间，null 表示未激活）
alter table public.profiles add column if not exists activated_at timestamptz;
alter table public.profiles add column if not exists invite_code text;
`;

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Supabase JS 没有直接 exec SQL，需要走 RPC 或 PostgREST 不支持 DDL
// 改用 REST 的 pg-meta 端点
const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ sql }),
});

if (!res.ok) {
  console.error("RPC exec_sql 不存在，改用 REST 提交 SQL 失败：", res.status);
  console.error(await res.text());
  console.log("\n请手动到 Supabase Dashboard → SQL Editor 执行以下 SQL：\n");
  console.log(sql);
  process.exit(1);
}

console.log("✅ invite_codes 表创建成功");
console.log("✅ profiles 表已添加 activated_at, invite_code 列");
