const fs = require("fs");
const path = require("path");

const publicRoot = path.resolve(__dirname, "../public");

const cardSources = [
  ["neutral", "カルドセプトビギンズ無属性クリーチャーカードデータ", "assets/carddata/begins-creatures-neutral.tsv"],
  ["fire", "カルドセプトビギンズ火属性クリーチャーカードデータ", "assets/carddata/begins-creatures-fire.tsv"],
  ["water", "カルドセプトビギンズ水属性クリーチャーカードデータ", "assets/carddata/begins-creatures-water.tsv"],
  ["earth", "カルドセプトビギンズ地属性クリーチャーカードデータ", "assets/carddata/begins-creatures-earth.tsv"],
  ["wind", "カルドセプトビギンズ風属性クリーチャーカードデータ", "assets/carddata/begins-creatures-wind.tsv"],
  ["item", "カルドセプトビギンズアイテムカードデータ", "assets/carddata/begins-items.tsv"],
  ["spell", "カルドセプトビギンズスペルカードデータ", "assets/carddata/begins-spells.tsv"],
];

const bookSources = [
  ["starterWaterAir", "assets/bookdata/starter-water-air.txt"],
  ["starterFireEarth", "assets/bookdata/starter-fire-earth.txt"],
  ["initialOwned", "assets/bookdata/initial-owned.txt"],
];

function readText(relPath) {
  return fs.readFileSync(path.join(publicRoot, relPath), "utf8").replace(/^\uFEFF/, "");
}

function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = lines.shift().split("\t");
  const rows = lines.filter(Boolean).map((line) => {
    const cells = line.split("\t");
    return headers.map((_, index) => cells[index] || "");
  });
  return { headers, rows };
}

function markdownTableFromTsv(tsv) {
  const { headers, rows } = parseTsv(tsv);
  const displayHeaders = headers.map((header) => header === "使用" ? "使用制限" : header);
  const separator = displayHeaders.map(() => "---");
  const body = rows.map((row) => `|${row.join("|")}|`);
  return [
    `|${displayHeaders.join("|")}|`,
    `|${separator.join("|")}|`,
    ...body,
  ].join("\n");
}

const cardData = {};
const markdownSections = [];

for (const [key, title, relPath] of cardSources) {
  const tsv = readText(relPath).trimEnd();
  cardData[key] = tsv;
  markdownSections.push(`## ${title}\n\n${markdownTableFromTsv(tsv)}`);
}

const bookData = {};
for (const [key, relPath] of bookSources) {
  bookData[key] = readText(relPath).trimEnd();
}

const embeddedOut = path.join(publicRoot, "assets/embedded/app-data.js");
const embeddedPayload = {
  cardData,
  bookData,
};
fs.writeFileSync(
  embeddedOut,
  `window.CEPTER_EMBEDDED_DATA = ${JSON.stringify(embeddedPayload)};\n`,
  "utf8",
);

const markdownOut = path.join(publicRoot, "ai-cards-begins.md");
const markdown = `# カルドセプト ビギンズ AI向けカードデータ

このページは、AIがカルドセプト ビギンズのブック相談で参照するためのカードデータです。

## 出典・扱い

- 元データはCuldcept Clubのビギンズカードページおよび公開済みの画面情報から整理しています。
- 列「使用」は「使用制限」として扱います。
- 公式仕様と異なる場合は公式情報を優先してください。

${markdownSections.join("\n\n")}
`;

fs.writeFileSync(markdownOut, markdown, "utf8");

console.log(`Generated ${embeddedOut}`);
console.log(`Generated ${markdownOut}`);
