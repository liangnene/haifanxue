# 海翻学

> 大部头教材，不必硬啃。

面向海外华人 / 赴日工作华人的 AI 翻译与学习笔记工具 —— 把日语教材（宅建士、行政书士、税理士等考试用书）拆解为中文翻译、考点卡片和可追问的对话。

这是一个面试演示用的 MVP，**未接入真实模型，未上线**。

---

## 启动

```bash
cd "vibe coding/haifanxue"
npm install        # 首次需要
npm run dev
```

浏览器访问 `http://localhost:3000`。

未登录会自动跳转 `/login`，可在 `/register` 注册一个本地账号（账号信息存在浏览器 localStorage）。

## 当前已完成

- 注册 / 登录 / 退出（前端 localStorage 假鉴权）
- 首页工作台：左侧功能栏 + 中央对话区
  - 对话：大输入框 + 文件上传按钮 + 示例提问
  - 翻译资料（占位）
  - 考点卡片（占位）
- 模型切换 UI（DeepSeek / OpenAI，仅 UI，未接入）
- 新手引导：首次登录自动弹三步介绍，侧边栏可手动重开
- 视觉：日式工具风，米白底 + 靛蓝 #3B5BDB 强调色，仅中文界面

## 下一步

- 接入 DeepSeek / OpenAI API（带流式输出）
- 翻译资料：PDF / 图片 / txt 解析与分段处理
- 考点卡片：概念 / 定义 / 易错点 / 可能考题 四段式结构化输出
- 对话历史持久化

## 技术栈

- Next.js 16（App Router）
- React 19 / TypeScript
- Tailwind CSS v4
- lucide-react 图标
