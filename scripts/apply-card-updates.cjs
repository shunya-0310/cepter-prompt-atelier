const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const publicRoot = path.join(root, "public");
const cardRoot = path.join(publicRoot, "assets/carddata");

const sourceFiles = {
  neutral: "begins-creatures-neutral.tsv",
  fire: "begins-creatures-fire.tsv",
  water: "begins-creatures-water.tsv",
  earth: "begins-creatures-earth.tsv",
  wind: "begins-creatures-wind.tsv",
  item: "begins-items.tsv",
  spell: "begins-spells.tsv",
};

const creatureElementToSource = {
  "無": "neutral",
  "火": "fire",
  "水": "water",
  "地": "earth",
  "風": "wind",
};

function usage() {
  console.log(`Usage:
  node scripts/apply-card-updates.cjs --request <json-or-issue-md> [--dry-run]

Request JSON:
{
  "type": "card-update",
  "versionLabel": "20260622-card-update",
  "updates": [
    {
      "operation": "upsert",
      "category": "creature",
      "name": "グーバクイーン",
      "element": "地",
      "rarity": "",
      "cost": "G30+地地",
      "at": "10",
      "hp": "40",
      "placement": "-",
      "usage": "-",
      "effect": "領地能力：..."
    }
  ]
}`);
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--request") args.request = argv[++i];
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--help" || token === "-h") args.help = true;
  }
  return args;
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : text;
  return JSON.parse(source);
}

function readRequest(file) {
  const text = fs.readFileSync(path.resolve(file), "utf8").replace(/^\uFEFF/, "");
  const payload = extractJson(text);
  if (!payload || payload.type !== "card-update") {
    throw new Error("Request type must be card-update.");
  }
  if (!Array.isArray(payload.updates) || !payload.updates.length) {
    throw new Error("Request must contain updates.");
  }
  return payload;
}

function readTsv(file) {
  const fullPath = path.join(cardRoot, file);
  const text = fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "").trimEnd();
  const lines = text.split(/\r?\n/);
  const headers = lines.shift().split("\t");
  const rows = lines.filter(Boolean).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
  return { fullPath, headers, rows };
}

function writeTsv(data) {
  const lines = [
    data.headers.join("\t"),
    ...data.rows.map((row) => data.headers.map((header) => row[header] || "").join("\t")),
  ];
  fs.writeFileSync(data.fullPath, `${lines.join("\n")}\n`, "utf8");
}

function cleanValue(value, fallback = "-") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/ST/g, "AT").replace(/カード/g, "□");
}

function normalizeCategory(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["creature", "クリーチャー"].includes(text)) return "creature";
  if (["item", "アイテム"].includes(text)) return "item";
  if (["spell", "スペル"].includes(text)) return "spell";
  return text;
}

function sourceForUpdate(update) {
  const category = normalizeCategory(update.category);
  if (category === "item") return "item";
  if (category === "spell") return "spell";
  if (category !== "creature") {
    throw new Error(`Unknown category for ${update.name}: ${update.category}`);
  }
  const source = creatureElementToSource[String(update.element || "").trim()];
  if (!source) throw new Error(`Unknown creature element for ${update.name}: ${update.element}`);
  return source;
}

function kindForUpdate(update, existingRow) {
  const category = normalizeCategory(update.category);
  const explicitKind = String(update.kind || "").trim();
  const rarity = String(update.rarity || "").trim();
  if (explicitKind) return `${explicitKind}${rarity}`;
  if (category === "creature") return `${String(update.element || existingRow?.["種類"]?.[0] || "").trim()}${rarity}`;
  return `${existingRow?.["種類"] || ""}` || rarity;
}

function rowFromUpdate(update, existingRow) {
  const category = normalizeCategory(update.category);
  return {
    "カード名": cleanValue(update.name, existingRow?.["カード名"] || ""),
    "作品": cleanValue(update.game, existingRow?.["作品"] || "ビギンズ"),
    "種類": kindForUpdate(update, existingRow),
    "コスト": cleanValue(update.cost, existingRow?.["コスト"] || "?"),
    "AT": cleanValue(update.at ?? update.AT, existingRow?.["AT"] || (category === "creature" ? "-" : "-")),
    "HP": cleanValue(update.hp ?? update.HP, existingRow?.["HP"] || "-"),
    "配置": cleanValue(update.placement, existingRow?.["配置"] || "-"),
    "使用": cleanValue(update.usage, existingRow?.["使用"] || "-"),
    "能力・効果": cleanValue(update.effect, existingRow?.["能力・効果"] || "-"),
  };
}

function applyUpdates(payload, { dryRun = false } = {}) {
  const sources = new Map();
  const changed = [];

  function getSource(source) {
    if (!sources.has(source)) sources.set(source, readTsv(sourceFiles[source]));
    return sources.get(source);
  }

  for (const update of payload.updates) {
    const name = cleanValue(update.name, "");
    if (!name) throw new Error("Every update needs a card name.");

    const source = sourceForUpdate(update);
    const data = getSource(source);
    data.rows.forEach((row) => {
      for (const key of Object.keys(row)) row[key] = cleanValue(row[key], "");
    });

    const index = data.rows.findIndex((row) => row["カード名"] === name);
    const operation = String(update.operation || "upsert").trim();
    if (operation === "update" && index < 0) {
      throw new Error(`Cannot update missing card: ${name}`);
    }
    if (operation === "create" && index >= 0) {
      throw new Error(`Cannot create existing card: ${name}`);
    }

    const nextRow = rowFromUpdate(update, index >= 0 ? data.rows[index] : null);
    if (index >= 0) {
      data.rows[index] = nextRow;
      changed.push({ action: "updated", source, name });
    } else {
      data.rows.push(nextRow);
      changed.push({ action: "created", source, name });
    }
  }

  if (!dryRun) {
    for (const data of sources.values()) writeTsv(data);
    bumpCardDataVersion(payload.versionLabel);
    run("node scripts/generate-card-assets.cjs");
    run("node scripts/generate-cards-html.cjs");
  }

  return changed;
}

function bumpCardDataVersion(label) {
  const now = new Date();
  const date =
    label ||
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-card-update`;
  const appPath = path.join(publicRoot, "app.js");
  const indexPath = path.join(publicRoot, "index.html");
  let app = fs.readFileSync(appPath, "utf8");
  app = app.replace(/(assets\/carddata\/[^"?]+\.tsv)\?v=[^"]+/g, `$1?v=${date}`);
  fs.writeFileSync(appPath, app, "utf8");

  let index = fs.readFileSync(indexPath, "utf8");
  index = index.replace(/\.\/app\.js\?v=[^"]+/, `./app.js?v=${date}`);
  fs.writeFileSync(indexPath, index, "utf8");
}

function run(command) {
  childProcess.execSync(command, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32" ? "powershell.exe" : true,
  });
}

function validateCardData() {
  const files = Object.values(sourceFiles);
  const names = [];
  const bad = [];
  let total = 0;
  for (const file of files) {
    const data = readTsv(file);
    for (let index = 0; index < data.rows.length; index += 1) {
      const row = data.rows[index];
      const cells = data.headers.map((header) => row[header] || "");
      if (cells.length !== data.headers.length || !row["カード名"]) {
        bad.push(`${file}:${index + 2}`);
      }
      names.push(row["カード名"]);
      total += 1;
    }
  }
  const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
  if (bad.length || duplicates.length) {
    throw new Error(`Card data validation failed: bad=${bad.join(", ")} duplicates=${duplicates.join(", ")}`);
  }
  return { files: files.length, total };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.request) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  const payload = readRequest(args.request);
  const changed = applyUpdates(payload, { dryRun: args.dryRun });
  const validation = validateCardData();
  console.log(JSON.stringify({ changed, validation, dryRun: args.dryRun }, null, 2));
}

if (require.main === module) {
  main();
}
