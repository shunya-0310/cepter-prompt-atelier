import { handleKnowledgeRequest } from "./knowledge-pages.js";

const DEFAULT_SUPABASE_URL = "https://pnkkvwblyietgozgkgpa.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBua2t2d2JseWlldGdvemdrZ3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTI4MTUsImV4cCI6MjA5NjU4ODgxNX0.Ms4_FI0oX-oBaZESlHLKq3sDYML01JT9B6HIbsF7OW0";

const VIEWPOINT_LABELS = {
  book: "ブック",
  play: "立ち回り",
  other: "その他",
};

const BADGE_LABELS = {
  green: "緑バッジ",
  blue: "青バッジ",
  purple: "紫バッジ",
  red: "赤バッジ",
  gold: "金バッジ",
};

function markdownResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=60" : "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

function supabaseConfig(env) {
  const url = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const anonKey = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

function supabaseHeaders(env) {
  const { anonKey } = supabaseConfig(env);
  return {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    "content-type": "application/json",
  };
}

function cleanToken(token) {
  return String(token || "").replace(/\.md$/i, "");
}

function validToken(token) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(token || "");
}

function safeText(value, maxLength = 20000) {
  return String(value || "").trim().slice(0, maxLength);
}

function requireAutomationConfig(env) {
  const missing = [];
  if (!env.CEPTER_ADMIN_KEY) missing.push("CEPTER_ADMIN_KEY");
  if (!env.GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
  if (!env.GITHUB_REPO) missing.push("GITHUB_REPO");
  if (missing.length) {
    throw new Error(`Worker variables are missing: ${missing.join(", ")}`);
  }
}

function requireAdmin(request, env, body) {
  const supplied = request.headers.get("x-cepter-admin-key") || body?.adminKey || "";
  if (!env.CEPTER_ADMIN_KEY || supplied !== env.CEPTER_ADMIN_KEY) {
    return false;
  }
  return true;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase request failed: ${response.status} ${detail}`);
  }
  return response.json();
}

async function createGithubIssue(env, { title, body }) {
  const repo = String(env.GITHUB_REPO || "").trim();
  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "content-type": "application/json",
      "user-agent": "cepter-prompt-atelier-worker",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ title, body }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`GitHub issue creation failed: ${response.status} ${data.message || ""}`.trim());
  }
  return data;
}

async function readShareContext(env, rawToken) {
  const token = cleanToken(rawToken);
  if (!validToken(token)) return null;
  const { url } = supabaseConfig(env);
  const data = await fetchJson(`${url}/rest/v1/rpc/get_share_context`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ p_token: token }),
  });
  const row = Array.isArray(data) ? data[0] : data;
  return row?.context_md || null;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function buildPublicKnowledgeMarkdown(posts, { headingLevel = 1 } = {}) {
  const h1 = "#".repeat(headingLevel);
  const h2 = "#".repeat(Math.min(headingLevel + 1, 6));
  const h3 = "#".repeat(Math.min(headingLevel + 2, 6));

  if (!posts.length) return `${h1} 公開ナレッジ\n\n- まだ公開ナレッジはありません。`;

  const body = posts
    .map((post) => {
      const idLine = post.public_no ? `- ID: ${String(post.public_no).padStart(5, "0")}` : "";
      return `${h2} ${post.title}

${idLine}
- 観点: ${VIEWPOINT_LABELS[post.viewpoint] || "ブック"}
- Like数: ${Number(post.likes_count || 0)}
- 投稿者バッジ: ${BADGE_LABELS[post.author_badge_tier] || "緑バッジ"}
- 投稿日時: ${formatDate(post.created_at)}

${h3} コメント

${post.comment}`;
    })
    .join("\n\n");

  return `${h1} 公開ナレッジ

以下は他のセプターの共有ナレッジです。相談者本人のブック状況と矛盾する場合は、相談者本人の状況を優先してください。

${body}`;
}

async function readPublicKnowledge(env, options = {}) {
  const { url } = supabaseConfig(env);
  const postsUrl = new URL(`${url}/rest/v1/public_knowledge_feed`);
  postsUrl.searchParams.set("select", "*");
  postsUrl.searchParams.set("order", "likes_count.desc,created_at.desc");
  postsUrl.searchParams.set("limit", "500");

  const posts = await fetchJson(postsUrl.href, {
    headers: supabaseHeaders(env),
  });

  return buildPublicKnowledgeMarkdown(posts || [], options);
}

async function handleDossier(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/ai\/dossier\/([^/]+)$/);
  const token = match?.[1] || "";
  const shareContext = await readShareContext(env, token);
  if (!shareContext) {
    return markdownResponse("# Not found\n\n共有コンテキストが見つかりません。", 404);
  }

  return markdownResponse(`${shareContext.trim()}\n`);
}

async function handlePublicKnowledge(env) {
  const publicKnowledge = await readPublicKnowledge(env, { headingLevel: 1 });
  return markdownResponse(publicKnowledge);
}

function issueBodyForCardUpdate(payload) {
  const compactPayload = {
    type: "card-update",
    title: safeText(payload.title, 200),
    versionLabel: safeText(payload.versionLabel, 80),
    note: safeText(payload.note, 5000),
    updates: Array.isArray(payload.updates) ? payload.updates : [],
  };

  return `# Card Update Request

このIssueはCepter Prompt Atelierの管理ページから作成されました。
Codexでは \`cepter-card-update\` Skillを使って処理してください。

\`\`\`json
${JSON.stringify(compactPayload, null, 2)}
\`\`\`
`;
}

function issueBodyForDeployRequest(payload) {
  const compactPayload = {
    type: "deploy-request",
    title: safeText(payload.title, 200),
    reason: safeText(payload.reason, 5000),
    files: safeText(payload.files, 5000),
  };

  return `# Deploy Request

このIssueはCepter Prompt Atelierの管理ページから作成されました。
Codexでは \`cepter-deploy\` Skillを使って処理してください。

\`\`\`json
${JSON.stringify(compactPayload, null, 2)}
\`\`\`
`;
}

async function handleAutomationRequest(request, env, kind) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "JSON body is required." }, 400);
  }

  if (!requireAdmin(request, env, payload)) {
    return jsonResponse({ error: "管理キーが正しくありません。" }, 401);
  }

  try {
    requireAutomationConfig(env);
    const now = new Date().toISOString().slice(0, 10);
    const titlePrefix = kind === "card" ? "[card-update]" : "[deploy]";
    const title = `${titlePrefix} ${safeText(payload.title, 120) || now}`;
    const body = kind === "card" ? issueBodyForCardUpdate(payload) : issueBodyForDeployRequest(payload);
    const issue = await createGithubIssue(env, { title, body });
    return jsonResponse({
      ok: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/sitemap.xml" || url.pathname === "/knowledge" || url.pathname.startsWith("/knowledge/")) {
      return handleKnowledgeRequest(request, supabaseConfig(env));
    }

    if (request.method === "GET" && /^\/ai\/dossier\/[^/]+$/.test(url.pathname)) {
      return handleDossier(request, env);
    }

    if (request.method === "GET" && url.pathname === "/ai/knowledge/public.md") {
      return handlePublicKnowledge(env);
    }

    if (request.method === "POST" && url.pathname === "/api/automation/card-update-request") {
      return handleAutomationRequest(request, env, "card");
    }

    if (request.method === "POST" && url.pathname === "/api/automation/deploy-request") {
      return handleAutomationRequest(request, env, "deploy");
    }

    return env.ASSETS.fetch(request);
  },
};
