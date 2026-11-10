// Public reading routes deliberately use only the public feed, never share_contexts.
const ORIGIN = "https://cepter-atelier.com";
const PAGE_SIZE = 20;
const FIELDS = "public_no,title,viewpoint,comment,created_at,updated_at,likes_count,author_badge_tier";
const LABELS = { book: "ブック", play: "立ち回り", other: "その他" };

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function postPath(post) {
  return `/knowledge/${String(post.public_no).padStart(5, "0")}/`;
}

function dateIso(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
}

function pagePath(page) {
  return page === 1 ? "/knowledge/" : `/knowledge/?page=${page}`;
}

async function publicPosts(config, { number, offset = 0, limit = PAGE_SIZE + 1, metadata = false } = {}) {
  const url = new URL(`${config.url}/rest/v1/public_knowledge_feed`);
  url.searchParams.set("select", metadata ? "public_no,updated_at,created_at" : FIELDS);
  url.searchParams.set("public_no", number ? `eq.${number}` : "gt.0");
  url.searchParams.set("order", "created_at.desc,public_no.desc");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, {
    headers: { apikey: config.anonKey, authorization: `Bearer ${config.anonKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Public feed returned ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid public feed response");
  return rows.filter((post) => Number.isSafeInteger(Number(post.public_no)) && Number(post.public_no) > 0);
}

function response(body, { status = 200, xml = false } = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": xml ? "application/xml; charset=utf-8" : "text/html; charset=utf-8",
      // Re-check visibility on every request, including after deletion or making a post private.
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(status !== 200 ? { "x-robots-tag": "noindex" } : {}),
    },
  });
}

function document({ title, description, path, heading, content, schema = {}, status = 200 }) {
  const canonical = `${ORIGIN}${path}`;
  const breadcrumbs = [{ "@type": "ListItem", position: 1, name: "トップページ", item: `${ORIGIN}/` },
    { "@type": "ListItem", position: 2, name: "公開ナレッジ", item: `${ORIGIN}/knowledge/` }];
  if (path.startsWith("/knowledge/") && path !== "/knowledge/" && !path.includes("?")) {
    breadcrumbs.push({ "@type": "ListItem", position: 3, name: heading, item: canonical });
  }
  return response(`<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} | Cepter Prompt Atelier</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${escape(canonical)}">
<meta property="og:site_name" content="Cepter Prompt Atelier"><meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP"><meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}">
<meta property="og:image" content="${ORIGIN}/assets/social/og-image.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${ORIGIN}/assets/social/og-image.png">
<link rel="stylesheet" href="/styles.css?v=20261110-knowledge-seo">
<link rel="stylesheet" href="/knowledge.css?v=20261110-1">
${status === 200 ? `<script type="application/ld+json">${jsonLd({ "@context": "https://schema.org", "@graph": [
  { "@type": "WebPage", name: title, description, url: canonical, inLanguage: "ja", ...schema },
  { "@type": "BreadcrumbList", itemListElement: breadcrumbs },
] })}</script>` : ""}
</head><body class="knowledge-reading"><div class="page-shell">
<header class="knowledge-reading-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span><span><strong>Cepter Prompt Atelier</strong><small>自分のAIに渡すセプター作戦室</small></span></a>
<nav aria-label="サイト内ナビゲーション"><a href="/knowledge/">公開ナレッジ</a><a href="/cards-begins.html">カードデータ</a><a href="/?screen=knowledge">アプリで閲覧・投稿</a></nav></header>
<main class="panel knowledge-reading-main"><nav class="knowledge-breadcrumbs" aria-label="パンくずリスト"><a href="/">トップページ</a> / <a href="/knowledge/">公開ナレッジ</a>${path !== "/knowledge/" ? ` / <span>${escape(heading)}</span>` : ""}</nav>
<p class="eyebrow">CEPTER'S KNOWLEDGE BANK</p><h1>${escape(heading)}</h1>
${content}</main>
<footer class="knowledge-reading-footer"><p>カルドセプト ビギンズの非公式ファンサイトです。投稿はユーザーによる攻略メモです。</p><a href="/privacy.html">プライバシーポリシー</a> / <a href="/terms.html">利用規約</a></footer>
</div></body></html>`, { status });
}

function postBody(post, detail = false) {
  const path = postPath(post);
  const date = dateIso(post.created_at);
  const modified = dateIso(post.updated_at);
  const id = String(post.public_no).padStart(5, "0");
  return `<article class="knowledge-card" id="knowledge-${id}">
<div class="knowledge-meta-line"><span class="knowledge-viewpoint">${escape(LABELS[post.viewpoint] || "その他")}</span><span class="knowledge-public-id">ID:${id}</span><span>👍 ${Number(post.likes_count) || 0}</span></div>
${detail ? "" : `<h2><a href="${path}">${escape(post.title)}</a></h2>`}
${date ? `<p class="knowledge-date">投稿日: <time datetime="${date}">${escape(new Date(date).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }))}</time>${modified && modified !== date ? ` / 更新日: <time datetime="${modified}">${escape(new Date(modified).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }))}</time>` : ""}</p>` : ""}
<div class="knowledge-reading-comment">${escape(post.comment)}</div>
<p class="knowledge-reading-actions"><a href="/?knowledge=${id}">アプリでこの投稿を見る・反映する</a>${detail ? ` <a href="/knowledge/">ナレッジ一覧に戻る</a>` : ` <a href="${path}">個別ページ</a>`}</p>
</article>`;
}

function errorPage(status) {
  const missing = status === 404;
  const heading = missing ? "公開ナレッジが見つかりません" : "ナレッジを読み込めませんでした";
  return document({ title: heading, description: heading, path: "/knowledge/", heading, status,
    content: `<p>${missing ? "このURLで閲覧できる公開投稿はありません。" : "時間をおいて、もう一度お試しください。"}</p><p><a href="/knowledge/">公開ナレッジ一覧へ</a></p>` });
}

async function sitemap(config) {
  const posts = [];
  for (let offset = 0; ; offset += 1000) {
    const batch = await publicPosts(config, { offset, limit: 1000, metadata: true });
    posts.push(...batch);
    if (posts.length > 45000) throw new Error("Sitemap needs splitting");
    if (batch.length < 1000) break;
  }
  const entries = ["/", "/cards-begins.html", "/privacy.html", "/terms.html", "/knowledge/"]
    .map((path) => `<url><loc>${ORIGIN}${path}</loc></url>`);
  for (let page = 2; page <= Math.ceil(posts.length / PAGE_SIZE); page++) {
    entries.push(`<url><loc>${escape(`${ORIGIN}${pagePath(page)}`)}</loc></url>`);
  }
  for (const post of posts) {
    const modified = dateIso(post.updated_at || post.created_at);
    entries.push(`<url><loc>${ORIGIN}${postPath(post)}</loc>${modified ? `<lastmod>${modified}</lastmod>` : ""}</url>`);
  }
  return response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`, { xml: true });
}

async function renderKnowledgeRequest(request, config) {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
  }
  let result;
  try {
    if (url.pathname === "/sitemap.xml") {
      result = await sitemap(config);
    } else if (url.pathname === "/knowledge") {
      result = new Response(null, { status: 308, headers: { location: `/knowledge/${url.search}`, "cache-control": "no-store" } });
    } else if (url.pathname === "/knowledge/") {
      const rawPage = url.searchParams.get("page") || "1";
      const page = Number(rawPage);
      if (!/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page) || page > 2500) return errorPage(404);
      const rows = await publicPosts(config, { offset: (page - 1) * PAGE_SIZE });
      if (page > 1 && !rows.length) return errorPage(404);
      const posts = rows.slice(0, PAGE_SIZE);
      const heading = `カルドセプト ビギンズの攻略ナレッジ${page > 1 ? `（${page}ページ目）` : ""}`;
      result = document({ title: heading, heading, path: pagePath(page),
        description: "カルドセプト ビギンズのブック構築、カードの組み合わせ、立ち回りを共有する公開ナレッジ。投稿本文を一覧で読み、AI相談用プロンプトに活用できます。",
        schema: { "@type": "CollectionPage" },
        content: `<p>ブック構築やカードの使い方、立ち回りについての公開投稿を、本文付きで読めます。</p><p><a href="/?screen=knowledge">検索・Like・投稿・プロンプトへの反映はアプリで</a></p>
<div class="knowledge-list">${posts.map((post) => postBody(post)).join("\n") || "<p>まだ公開ナレッジはありません。</p>"}</div>
<nav class="knowledge-pagination" aria-label="ページ切り替え">${page > 1 ? `<a rel="prev" href="${pagePath(page - 1)}">前のページ</a>` : ""}<span>${page}ページ目</span>${rows.length > PAGE_SIZE ? `<a rel="next" href="${pagePath(page + 1)}">次のページ</a>` : ""}</nav>` });
    } else {
      const match = url.pathname.match(/^\/knowledge\/([0-9]{1,10})\/?$/);
      if (!match || Number(match[1]) < 1) return errorPage(404);
      const posts = await publicPosts(config, { number: Number(match[1]), limit: 1 });
      const post = posts[0];
      if (!post) return errorPage(404);
      const path = postPath(post);
      if (url.pathname !== path) {
        result = new Response(null, { status: 308, headers: { location: path, "cache-control": "no-store" } });
      } else {
        const description = `${post.title}。${String(post.comment || "").replace(/\s+/g, " ").slice(0, 120)}`;
        result = document({ title: `${post.title} | カルドセプト ビギンズ攻略`, heading: post.title, description, path,
          schema: { datePublished: dateIso(post.created_at), dateModified: dateIso(post.updated_at || post.created_at) },
          content: postBody(post, true) });
      }
    }
  } catch (error) {
    console.error("Public knowledge unavailable", { message: error.message });
    result = errorPage(503);
  }
  return result;
}

export async function handleKnowledgeRequest(request, config) {
  const result = await renderKnowledgeRequest(request, config);
  return request.method === "HEAD" ? new Response(null, { status: result.status, headers: result.headers }) : result;
}
