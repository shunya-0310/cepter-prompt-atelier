const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../public");
const out = path.join(root, "cards-begins.html");
const sources = [
  ["無属性クリーチャー", "assets/carddata/begins-creatures-neutral.tsv"],
  ["火属性クリーチャー", "assets/carddata/begins-creatures-fire.tsv"],
  ["水属性クリーチャー", "assets/carddata/begins-creatures-water.tsv"],
  ["地属性クリーチャー", "assets/carddata/begins-creatures-earth.tsv"],
  ["風属性クリーチャー", "assets/carddata/begins-creatures-wind.tsv"],
  ["アイテム", "assets/carddata/begins-items.tsv"],
  ["スペル", "assets/carddata/begins-spells.tsv"],
];

function h(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = lines.shift().split("\t");
  return lines.filter(Boolean).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((name, index) => [name, cells[index] || ""]));
  });
}

let total = 0;
const sections = sources.map(([title, relPath]) => {
  const rows = parseTsv(fs.readFileSync(path.join(root, relPath), "utf8"));
  total += rows.length;
  const body = rows
    .map((row) => {
      const atHp = row.AT || row.HP ? `${h(row.AT)} / ${h(row.HP)}` : "-";
      return `<tr><th scope="row">${h(row["カード名"])}</th><td>${h(row["作品"])}</td><td>${h(row["種類"])}</td><td>${h(row["コスト"])}</td><td>${atHp}</td><td>${h(row["配置"])}</td><td>${h(row["使用"])}</td><td>${h(row["能力・効果"])}</td></tr>`;
    })
    .join("\n                ");

  return `        <section class="card-section" id="${encodeURIComponent(title)}">
          <h2>${h(title)}</h2>
          <p class="section-count">${rows.length} 件</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>カード名</th><th>作品</th><th>種類</th><th>コスト</th><th>AT / HP</th><th>配置制限</th><th>使用制限</th><th>能力・効果</th></tr>
              </thead>
              <tbody>
                ${body}
              </tbody>
            </table>
          </div>
        </section>`;
});

const generated = new Date().toISOString().slice(0, 10);
const toc = sources
  .map(([title]) => `<a href="#${encodeURIComponent(title)}">${h(title.replace("属性クリーチャー", "属性"))}</a>`)
  .join("\n        ");

const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>カルドセプト ビギンズ カードデータベース | Cepter Prompt Atelier</title>
    <meta name="description" content="カルドセプト ビギンズのカードデータをAIと人間が読みやすいHTML形式で掲載しています。" />
    <meta property="og:site_name" content="Cepter Prompt Atelier" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="https://cepter-atelier.com/cards-begins.html" />
    <meta property="og:title" content="カルドセプト ビギンズ カードデータベース" />
    <meta property="og:description" content="カルドセプト ビギンズのカード名、種類、コスト、AT/HP、制限、能力・効果を一覧化したAI向けHTMLページです。" />
    <meta property="og:image" content="https://cepter-atelier.com/assets/social/og-image.png" />
    <style>
      :root { color-scheme: dark; --bg: #061d17; --panel: #0b2a20; --panel-2: #102f23; --line: rgba(244, 211, 111, 0.34); --text: #f6edcf; --muted: #d6c895; --gold: #f4d36f; --accent: #81d98b; }
      * { box-sizing: border-box; }
      body { margin: 0; background: radial-gradient(circle at 20% 0%, rgba(244, 211, 111, 0.08), transparent 34%), var(--bg); color: var(--text); font-family: "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif; line-height: 1.75; }
      a { color: var(--gold); }
      .page { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 64px; }
      header { border-bottom: 1px solid var(--line); margin-bottom: 28px; padding-bottom: 22px; }
      .kicker { color: var(--gold); font-family: Consolas, "Courier New", monospace; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
      h1, h2 { margin: 0; color: var(--text); letter-spacing: 0; }
      h1 { margin-top: 8px; font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.18; }
      h2 { font-size: clamp(1.35rem, 3vw, 2rem); }
      .lead { max-width: 880px; color: var(--muted); }
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 24px 0 32px; }
      .summary div { border: 1px solid var(--line); background: rgba(11, 42, 32, 0.7); padding: 14px 16px; }
      .summary strong { display: block; color: var(--gold); font-family: Consolas, "Courier New", monospace; font-size: 0.92rem; }
      .toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 28px; }
      .toc a { border: 1px solid var(--line); padding: 7px 10px; text-decoration: none; background: rgba(6, 29, 23, 0.8); }
      .card-section { border: 1px solid var(--line); background: rgba(11, 42, 32, 0.62); margin: 22px 0; padding: 18px; }
      .section-count { margin: 4px 0 14px; color: var(--accent); font-family: Consolas, "Courier New", monospace; }
      .table-wrap { overflow-x: auto; border: 1px solid rgba(244, 211, 111, 0.22); }
      table { width: 100%; min-width: 980px; border-collapse: collapse; background: rgba(3, 18, 14, 0.7); }
      th, td { border-bottom: 1px solid rgba(244, 211, 111, 0.18); border-right: 1px solid rgba(244, 211, 111, 0.14); padding: 8px 10px; text-align: left; vertical-align: top; font-size: 0.95rem; }
      thead th { position: sticky; top: 0; background: var(--panel-2); color: var(--gold); z-index: 1; }
      tbody th { color: #ffe68f; white-space: nowrap; }
      footer { margin-top: 32px; color: var(--muted); font-size: 0.92rem; }
      @media (max-width: 720px) { .page { width: min(100% - 20px, 1180px); padding-top: 20px; } .card-section { padding: 12px; } th, td { font-size: 0.88rem; } }
    </style>
  </head>
  <body>
    <main class="page">
      <header>
        <span class="kicker">AI Readable Card Database</span>
        <h1>カルドセプト ビギンズ<br />カードデータベース</h1>
        <p class="lead">このページは、AIがカルドセプト ビギンズのブック相談を行う際に参照しやすいよう、カードデータをJavaScriptなしのHTML本文として掲載しています。</p>
      </header>

      <section class="summary" aria-label="データ概要">
        <div><strong>ゲーム</strong>カルドセプト ビギンズ</div>
        <div><strong>カード件数</strong>${total} 件</div>
        <div><strong>データ形式</strong>HTML table</div>
        <div><strong>生成日</strong>${generated}</div>
      </section>

      <nav class="toc" aria-label="カード分類">
        ${toc}
      </nav>

${sections.join("\n\n")}

      <footer>
        <p>出典・扱い: Cepter Prompt Atelier内のカードTSVから生成。公式情報と異なる場合は公式情報を優先してください。</p>
        <p><a href="./">Cepter Prompt Atelierに戻る</a></p>
      </footer>
    </main>
  </body>
</html>
`;

fs.writeFileSync(out, html, "utf8");
console.log(`Generated ${out} (${total} cards)`);
