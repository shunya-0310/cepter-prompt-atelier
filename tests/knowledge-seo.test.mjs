import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = {
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "public-test-key",
  ASSETS: { fetch: async () => new Response("original app assets") },
};
const posts = Array.from({ length: 23 }, (_, i) => ({
  public_no: 28 - i, title: `攻略メモ ${28 - i}`, comment: `カードの組み合わせについて。\n2行目 ${i}`,
  viewpoint: "book", likes_count: 2, created_at: "2026-09-29T02:27:00Z", updated_at: "2026-09-30T02:27:00Z",
}));

function feed(rows = posts, visitor) {
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.pathname, "/rest/v1/public_knowledge_feed", "SEO must never read private tables or share tokens");
    assert.equal(options.headers.authorization, "Bearer public-test-key");
    visitor?.(url);
    const filter = url.searchParams.get("public_no");
    const selected = filter.startsWith("eq.") ? rows.filter(p => p.public_no === Number(filter.slice(3))) : rows;
    const offset = Number(url.searchParams.get("offset"));
    const limit = Number(url.searchParams.get("limit"));
    return Response.json(selected.slice(offset, offset + limit));
  };
}
const get = (path, method = "GET") => worker.fetch(new Request(`https://cepter-atelier.com${path}`, { method }), env);

test("list contains full HTML text, individual links and real pagination without JavaScript", async () => {
  feed();
  const r = await get("/knowledge/");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-robots-tag"), null);
  const html = await r.text();
  assert.match(html, /カードの組み合わせについて。\n2行目 0/);
  assert.equal((html.match(/<article /g) || []).length, 20);
  assert.match(html, /href="\/knowledge\/00028\/"/);
  assert.match(html, /rel="next" href="\/knowledge\/\?page=2"/);
  assert.match(html, /rel="canonical" href="https:\/\/cepter-atelier.com\/knowledge\/"/);
  assert.doesNotMatch(html, /<script(?! type="application\/ld\+json")/);
  const page2 = await (await get("/knowledge/?page=2")).text();
  assert.equal((page2.match(/<article /g) || []).length, 3);
  assert.match(page2, /rel="canonical" href="https:\/\/cepter-atelier.com\/knowledge\/\?page=2"/);
  assert.doesNotMatch(page2, /rel="next"/);
});

test("individual page has its own title, canonical, metadata and application deep link", async () => {
  feed();
  const html = await (await get("/knowledge/00026/")).text();
  assert.match(html, /<h1>攻略メモ 26<\/h1>/);
  assert.match(html, /name="description"/);
  assert.match(html, /rel="canonical" href="https:\/\/cepter-atelier.com\/knowledge\/00026\/"/);
  assert.match(html, /href="\/\?knowledge=00026"/);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema["@graph"][1].itemListElement.at(-1).item, "https://cepter-atelier.com/knowledge/00026/");
});

test("unpublished, private, deleted and malformed IDs never resolve through SEO routes", async () => {
  feed();
  for (const path of ["/knowledge/00001/", "/knowledge/PVT:ABC/", "/knowledge/00000/", "/knowledge/99999/", "/knowledge/private/", "/knowledge/?page=999", "/knowledge/?page=-1"]) {
    const r = await get(path);
    assert.equal(r.status, 404, path);
    assert.equal(r.headers.get("x-robots-tag"), "noindex");
  }
  feed(posts.filter(p => p.public_no !== 26));
  assert.equal((await get("/knowledge/00026/")).status, 404, "making private is checked again immediately");
});

test("sitemap contains only public posts, page URLs and actual update dates", async () => {
  feed();
  const r = await get("/sitemap.xml");
  assert.match(r.headers.get("content-type"), /application\/xml/);
  const xml = await r.text();
  assert.match(xml, /https:\/\/cepter-atelier.com\/knowledge\/00026\//);
  assert.match(xml, /https:\/\/cepter-atelier.com\/knowledge\/\?page=2/);
  assert.match(xml, /<lastmod>2026-09-30T02:27:00.000Z<\/lastmod>/);
  assert.doesNotMatch(xml, /PVT|\/ai\/|\/share|knowledge.html/);
  assert.equal((xml.match(/<url>/g) || []).length, 29);
});

test("sitemap fetches subsequent batches instead of truncating at database's page limit", async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => ({ ...posts[0], public_no: i + 1 }));
  const offsets = [];
  feed(rows, url => offsets.push(url.searchParams.get("offset")));
  const xml = await (await get("/sitemap.xml")).text();
  assert.deepEqual(offsets, ["0", "1000"]);
  assert.match(xml, /\/knowledge\/01001\//);
});

test("post content cannot inject HTML, metadata or JSON-LD scripts", async () => {
  feed([{ ...posts[0], title: '"/><script>alert(1)</script>', comment: '</script><img src=x onerror=alert(1)>' }]);
  const html = await (await get("/knowledge/00028/")).text();
  assert.doesNotMatch(html, /<img src=x|<script>alert/);
  assert.match(html, /&lt;img src=x/);
  JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
});

test("upstream outage returns noindex 503 instead of missing content with success", async () => {
  globalThis.fetch = async () => new Response("upstream error", { status: 503 });
  for (const path of ["/knowledge/", "/knowledge/00026/", "/sitemap.xml"]) {
    const r = await get(path);
    assert.equal(r.status, 503);
    assert.equal(r.headers.get("x-robots-tag"), "noindex");
    assert.doesNotMatch(await r.text(), /upstream error/);
  }
});

test("GET aliases redirect, HEAD has no body and POST is refused", async () => {
  feed();
  for (const [path, location] of [["/knowledge", "/knowledge/"], ["/knowledge/26", "/knowledge/00026/"]]) {
    const r = await get(path);
    assert.equal(r.status, 308);
    assert.equal(r.headers.get("location"), location);
  }
  for (const path of ["/knowledge/00026/", "/knowledge/99999/", "/sitemap.xml"]) {
    const r = await get(path, "HEAD");
    assert.equal(await r.text(), "");
  }
  assert.equal((await get("/knowledge/", "POST")).status, 405);
});

test("original app assets and explicit AI share-token routes retain their behavior", async () => {
  assert.equal(await (await get("/")).text(), "original app assets");
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, "/rest/v1/rpc/get_share_context");
    assert.deepEqual(JSON.parse(options.body), { p_token: "abcdefghijklmnopqr123456" });
    return Response.json([{ context_md: "# Explicitly shared private knowledge" }]);
  };
  const r = await get("/ai/dossier/abcdefghijklmnopqr123456.md");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-robots-tag"), "noindex");
  assert.match(await r.text(), /Explicitly shared private knowledge/);
});
