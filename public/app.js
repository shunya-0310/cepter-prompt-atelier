const CARD_DATA_FILES = [
  {
    tab: "neutral",
    label: "無属性",
    icon: "◇",
    category: "クリーチャー",
    element: "無",
    dataKey: "neutral",
    url: "./assets/carddata/begins-creatures-neutral.tsv?v=20260623-card-update",
  },
  {
    tab: "fire",
    label: "火属性",
    icon: "🔥",
    category: "クリーチャー",
    element: "火",
    dataKey: "fire",
    url: "./assets/carddata/begins-creatures-fire.tsv?v=20260623-card-update",
  },
  {
    tab: "water",
    label: "水属性",
    icon: "💧",
    category: "クリーチャー",
    element: "水",
    dataKey: "water",
    url: "./assets/carddata/begins-creatures-water.tsv?v=20260623-card-update",
  },
  {
    tab: "earth",
    label: "地属性",
    icon: "♣",
    category: "クリーチャー",
    element: "地",
    dataKey: "earth",
    url: "./assets/carddata/begins-creatures-earth.tsv?v=20260623-card-update",
  },
  {
    tab: "wind",
    label: "風属性",
    icon: "🪽",
    category: "クリーチャー",
    element: "風",
    dataKey: "wind",
    url: "./assets/carddata/begins-creatures-wind.tsv?v=20260623-card-update",
  },
  {
    tab: "item",
    label: "アイテム",
    icon: "🛡",
    category: "アイテム",
    element: "道具",
    dataKey: "item",
    url: "./assets/carddata/begins-items.tsv?v=20260623-card-update",
  },
  {
    tab: "spell",
    label: "スペル",
    icon: "✨",
    category: "スペル",
    element: "術",
    dataKey: "spell",
    url: "./assets/carddata/begins-spells.tsv?v=20260623-card-update",
  },
];

const AI_REFERENCES = [
  {
    label: "基本ルール・公式情報",
    url: "./ai-rules-begins.md",
    absolutePath: "/ai-rules-begins.md",
  },
  {
    label: "ビギンズカードデータ",
    url: "./cards-begins.html",
    absolutePath: "/cards-begins.html",
  },
  {
    label: "初心者向けブック構築の評価軸",
    url: "./ai-strategy-begins.md",
    absolutePath: "/ai-strategy-begins.md",
  },
];

const BOOK_DATA_FILES = [
  {
    id: "starter-water-air",
    url: "./assets/bookdata/starter-water-air.txt",
  },
  {
    id: "starter-fire-earth",
    url: "./assets/bookdata/starter-fire-earth.txt",
  },
];
const INITIAL_OWNED_URL = "./assets/bookdata/initial-owned.txt";
const STORAGE_KEY = "cepter-prompt-atelier-state-v3";
const GUEST_KEY_STORAGE_KEY = "cepter-prompt-atelier-guest-key-v1";
const INITIAL_DATA_VERSION = "20260620-initial-book-repair1";
const BOOK_SIZE = 40;
const DEFAULT_BOOK_ID = "starter-water-air";
const DEFAULT_BOOK_NAME = "ブック水風";
const PROFILE_HEADINGS = ["#このブックのストラテジー、狙っている勝ち筋", "#このブックのコアとなるカード", "#参考にしたい情報（テキスト or URL）"];
const KNOWLEDGE_ID_HEADING = "#反映したいナレッジID";
const VIEWPOINT_LABELS = {
  book: "ブック",
  play: "立回り",
  other: "その他",
};
const CARD_NAME_ALIASES = {
  ミノタウルス: "ミノタウロス",
};

const ICON_BASE = "./assets/icons/";
const ELEMENT_ICONS = {
  無: "creature-neutral.png",
  火: "creature-fire.png",
  水: "creature-water.png",
  地: "creature-earth.png",
  風: "creature-air.png",
  複: "creature-multi.png",
};
const ELEMENT_RESTRICTION_ICONS = {
  火: "land-fire-x.png",
  水: "land-water-x.png",
  地: "land-earth-x.png",
  風: "land-air-x.png",
};
const USAGE_RESTRICTION_ICONS = {
  武: "item-weapon-x.png",
  防: "item-armor-x.png",
  道: "item-tool-x.png",
  巻: "item-scroll-x.png",
};
const CARD_ICONS = {
  "□": "card.png",
  呪: "enchantment.png",
};
const RARITY_ICONS = {
  N: "rarity-n.png",
  S: "rarity-s.png",
  R: "rarity-r.png",
  E: "rarity-e.png",
};
const CATEGORY_ICONS = {
  neutral: "creature-neutral.png",
  fire: "creature-fire.png",
  water: "creature-water.png",
  earth: "creature-earth.png",
  wind: "creature-air.png",
  item: "item.png",
  spell: "spell.png",
};

const state = {
  cards: [],
  activeTab: "neutral",
  filter: "all",
  query: "",
  shareUrl: "",
  privateKnowledgeUrl: "",
  books: [],
  currentBookId: DEFAULT_BOOK_ID,
  ownedByCardId: {},
  defaultBooks: [],
  defaultOwnedByCardId: {},
  isRegistered: false,
  knowledgeFilter: "all",
  knowledgeQuery: "",
  knowledgePosts: [],
  likedKnowledgeIds: [],
  currentAuthorLikes: 0,
  userName: "",
  supabaseUser: null,
  remoteReady: false,
  promptGenerated: false,
  promptEdited: false,
};

let pendingCardChanges = false;

const supabaseConfig = window.CEPTER_SUPABASE || {};
const supabaseUrl = String(supabaseConfig.url || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseAnonKey = String(supabaseConfig.anonKey || "");
const supabaseClient =
  window.supabase && supabaseUrl && supabaseAnonKey ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;
const embeddedData = { cardData: {}, bookData: {} };
const embeddedIconData = {};

document.addEventListener(
  "error",
  (event) => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.closest("button, .book-breakdown, .category-tabs, .site-menu")) {
      target.replaceWith(document.createTextNode(target.alt || ""));
    }
  },
  true,
);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconImg(file, alt, className = "inline-icon") {
  const src = embeddedIconData[file] || `${ICON_BASE}${file}`;
  return `<img class="${className}" src="${src}" alt="${escapeHtml(alt)}" title="${escapeHtml(alt)}" onerror="this.replaceWith(document.createTextNode(this.alt || ''))" />`;
}

function hydrateStaticIcons() {
  document.querySelectorAll('img[src^="./assets/icons/"]').forEach((image) => {
    const file = image.getAttribute("src").split("/").pop();
    if (embeddedIconData[file]) image.src = embeddedIconData[file];
  });
}

function renderElementIcon(element) {
  const file = ELEMENT_ICONS[element] || CATEGORY_ICONS.neutral;
  return iconImg(file, element);
}

function renderRarityIcon(rarity) {
  const file = RARITY_ICONS[rarity];
  return file ? iconImg(file, rarity, "inline-icon rarity-icon-img") : escapeHtml(rarity || "-");
}

function renderCost(value) {
  return escapeHtml(value).replace(/[無火水地風複□]/g, (token) => {
    if (token === "□") return iconImg(CARD_ICONS["□"], "カード条件");
    return renderElementIcon(token);
  });
}

function renderPlacementRestriction(value) {
  if (!value || value === "-") return "-";
  return Array.from(value)
    .map((token) => {
      const file = ELEMENT_RESTRICTION_ICONS[token];
      return file ? iconImg(file, `${token}配置制限`) : escapeHtml(token);
    })
    .join("");
}

function renderUsageRestriction(value) {
  if (!value || value === "-") return "-";
  return Array.from(value)
    .map((token) => {
      const file = USAGE_RESTRICTION_ICONS[token];
      return file ? iconImg(file, `${token}使用制限`) : escapeHtml(token);
    })
    .join("");
}

function renderEffect(value) {
  let html = escapeHtml(value || "-");
  html = html.replace(/[(（]([無火水地風複])([)）])/g, (_, token) => `(${renderElementIcon(token)})`);
  html = html.replace(/[｛{]([無火水地風複])[｝}]/g, (_, token) => renderElementIcon(token));
  html = html.replace(/([無火水地風複])属性/g, (_, token) => `${renderElementIcon(token)}属性`);
  html = html.replace(/[(（]呪([)）])/g, `(${iconImg(CARD_ICONS["呪"], "呪")})`);
  html = html.replace(/[｛{]呪[｝}]/g, iconImg(CARD_ICONS["呪"], "呪"));
  html = html.replace(/呪スペル/g, `${iconImg(CARD_ICONS["呪"], "呪")}スペル`);
  html = html.replace(/□/g, iconImg(CARD_ICONS["□"], "カード条件"));
  return html;
}

const els = {
  displayName: document.querySelector("#displayName"),
  cardGrid: document.querySelector("#cardGrid"),
  cardSearch: document.querySelector("#cardSearch"),
  savedBookSelect: document.querySelector("#savedBookSelect"),
  deleteBook: document.querySelector("#deleteBook"),
  bookRegistration: document.querySelector("#bookRegistration"),
  bookName: document.querySelector("#bookName"),
  newBook: document.querySelector("#newBook"),
  saveBook: document.querySelector("#saveBook"),
  cancelBookRegistration: document.querySelector("#cancelBookRegistration"),
  bookStatus: document.querySelector("#bookStatus"),
  bookCountStatus: document.querySelector("#bookCountStatus"),
  bookCount: document.querySelector("#bookCount"),
  bookMeter: document.querySelector("#bookMeter"),
  stickyBookCountStatus: document.querySelector("#stickyBookCountStatus"),
  stickyBookCount: document.querySelector("#stickyBookCount"),
  stickyBookMeter: document.querySelector("#stickyBookMeter"),
  bookBreakdown: document.querySelector("#bookBreakdown"),
  skillText: document.querySelector("#skillText"),
  knowledgeReferenceIds: document.querySelector("#knowledgeReferenceIds"),
  strategyCopySource: document.querySelector("#strategyCopySource"),
  copyStrategyFromBook: document.querySelector("#copyStrategyFromBook"),
  questionText: document.querySelector("#questionText"),
  promptPreview: document.querySelector("#promptPreview"),
  copyPrompt: document.querySelector("#copyPrompt"),
  makeShareUrl: document.querySelector("#makeShareUrl"),
  shareUrl: document.querySelector("#shareUrl"),
  copyStatus: document.querySelector("#copyStatus"),
  applyBookChanges: document.querySelector("#applyBookChanges"),
  brandHome: document.querySelector("#brandHome"),
  headerLogin: document.querySelector("#headerLogin"),
  headerUserName: document.querySelector("#headerUserName"),
  headerLogout: document.querySelector("#headerLogout"),
  menuToggle: document.querySelector("#menuToggle"),
  siteMenu: document.querySelector("#siteMenu"),
  startRegistration: document.querySelector("#startRegistration"),
  startGuest: document.querySelector("#startGuest"),
  startLogin: document.querySelector("#startLogin"),
  loginForm: document.querySelector("#loginForm"),
  loginName: document.querySelector("#loginName"),
  loginPassword: document.querySelector("#loginPassword"),
  loginToRegistration: document.querySelector("#loginToRegistration"),
  forgotPassword: document.querySelector("#forgotPassword"),
  passwordResetNotice: document.querySelector("#passwordResetNotice"),
  authStatus: document.querySelector("#authStatus"),
  registrationForm: document.querySelector("#registrationForm"),
  registerUserName: document.querySelector("#registerUserName"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPassword: document.querySelector("#registerPassword"),
  registerStatus: document.querySelector("#registerStatus"),
  backToLanding: document.querySelector("#backToLanding"),
  registeredMode: document.querySelector("#registeredMode"),
  knowledgeForm: document.querySelector("#knowledgeForm"),
  knowledgeModeHint: document.querySelector("#knowledgeModeHint"),
  knowledgeTitle: document.querySelector("#knowledgeTitle"),
  knowledgeViewpoint: document.querySelector("#knowledgeViewpoint"),
  knowledgeCard1: document.querySelector("#knowledgeCard1"),
  knowledgeCard2: document.querySelector("#knowledgeCard2"),
  knowledgeCard3: document.querySelector("#knowledgeCard3"),
  knowledgeCardOptions: document.querySelector("#knowledgeCardOptions"),
  knowledgeComment: document.querySelector("#knowledgeComment"),
  knowledgeVisibility: document.querySelector("#knowledgeVisibility"),
  knowledgeStatus: document.querySelector("#knowledgeStatus"),
  knowledgeSearch: document.querySelector("#knowledgeSearch"),
  knowledgeList: document.querySelector("#knowledgeList"),
  knowledgeComposeToggle: document.querySelector("#knowledgeComposeToggle"),
  knowledgeComposeClose: document.querySelector("#knowledgeComposeClose"),
  currentBadgeSummary: document.querySelector("#currentBadgeSummary"),
  currentBookLabels: [...document.querySelectorAll("[data-current-book-name]")],
};

const mobileTabs = [...document.querySelectorAll("[data-mobile-tab]")];
const mobilePanes = [...document.querySelectorAll("[data-mobile-pane]")];
const mobilePaneMedia = window.matchMedia("(max-width: 760px)");
let mobilePaneResizeTimer = 0;
let remoteSyncTimer = 0;
let remoteSyncInFlight = false;

function absoluteUrl(path) {
  return new URL(path, location.href).href;
}

function parseKind(rawKind) {
  const value = rawKind || "";
  const rarityMatch = value.match(/[NSRE]$/);
  const rarity = rarityMatch ? rarityMatch[0] : "-";
  const element = value.slice(0, 1) || "無";
  return { element, rarity };
}

function displayElementForCard(card) {
  if (card.category === "アイテム") return "アイテム";
  if (card.category === "スペル") return "スペル";
  return card.element;
}

function parseTsv(tsv, source) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/);
  const headers = headerLine.split("\t");
  return lines
    .map((line, index) => {
      const values = line.split("\t");
      const row = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
      const { element, rarity } = parseKind(row["種類"]);
      const resolvedElement = source.category === "クリーチャー" ? element : source.element;
      return {
        id: stableCardId(source.tab, row["作品"], row["カード名"]),
        tab: source.tab,
        icon: source.icon,
        name: row["カード名"],
        game: row["作品"],
        category: source.category,
        element: resolvedElement,
        rarity,
        kind: row["種類"] || `${resolvedElement}${rarity}`,
        cost: row["コスト"],
        st: row["AT"] || row["ST"] || "-",
        hp: row["HP"] || "-",
        placementRestriction: row["配置"] || "-",
        usageRestriction: row["使用"] || "-",
        effect: row["能力・効果"],
        owned: source.tab === "neutral" && index < 8 ? 2 : 0,
        book: source.tab === "neutral" && index < 6 ? 1 : 0,
      };
    })
    .filter((card) => card.name);
}

function stableCardId(tab, game, name) {
  return `${tab}-${game}-${name}`.replace(/\s+/g, "-");
}

function resolveStoredCardId(cardId) {
  const value = String(cardId || "").trim();
  if (!value) return "";
  const cardsById = new Map(state.cards.map((card) => [card.id, card]));
  if (cardsById.has(value)) return value;

  const withoutLegacyIndex = value.replace(/-\d+$/, "");
  if (cardsById.has(withoutLegacyIndex)) return withoutLegacyIndex;

  const matched = state.cards.find((card) => value.startsWith(`${card.id}-`));
  return matched ? matched.id : "";
}

function normalizeCardCountMap(counts) {
  const normalized = {};
  if (!counts || typeof counts !== "object") return normalized;
  for (const [rawId, rawCount] of Object.entries(counts)) {
    const cardId = resolveStoredCardId(rawId);
    const count = Number(rawCount || 0);
    if (!cardId || count <= 0) continue;
    normalized[cardId] = Number(normalized[cardId] || 0) + count;
  }
  return normalized;
}

function normalizeBookCards(book) {
  return {
    ...book,
    cards: normalizeCardCountMap(book?.cards || {}),
  };
}

function cardCountTotal(counts) {
  return Object.values(counts || {}).reduce((sum, count) => sum + Number(count || 0), 0);
}

function cardCountByCategory(counts, categories) {
  const wanted = new Set(categories);
  return Object.entries(counts || {}).reduce((sum, [cardId, count]) => {
    const card = state.cards.find((item) => item.id === cardId);
    return card && wanted.has(card.category) ? sum + Number(count || 0) : sum;
  }, 0);
}

function defaultBookForStoredBook(book) {
  return state.defaultBooks.find((defaultBook) => defaultBook.id === book?.id || defaultBook.name === book?.name);
}

function isCorruptedInitialCardMap(counts, defaultCounts) {
  const normalized = normalizeCardCountMap(counts || {});
  const defaultTotal = cardCountTotal(defaultCounts);
  const currentTotal = cardCountTotal(normalized);
  if (!defaultTotal) return false;
  if (currentTotal === 0) return true;
  if (currentTotal >= defaultTotal) return false;
  const itemSpellCopies = cardCountByCategory(normalized, ["アイテム", "スペル"]);
  const defaultItemSpellCopies = cardCountByCategory(defaultCounts, ["アイテム", "スペル"]);
  return defaultItemSpellCopies > 0 && itemSpellCopies === 0;
}

function repairInitialBookIfCorrupted(book) {
  const normalizedBook = normalizeBookCards(book);
  const defaultBook = defaultBookForStoredBook(normalizedBook);
  if (!defaultBook || !isCorruptedInitialCardMap(normalizedBook.cards, defaultBook.cards)) {
    return normalizedBook;
  }
  return {
    ...normalizedBook,
    name: normalizedBook.name || defaultBook.name,
    cards: { ...defaultBook.cards },
  };
}

function shouldRepairInitialOwnedCards(counts) {
  return isCorruptedInitialCardMap(counts, state.defaultOwnedByCardId);
}

async function loadCards() {
  try {
    const groups = await Promise.all(
      CARD_DATA_FILES.map(async (source) => {
        const embedded = embeddedData.cardData?.[source.dataKey];
        if (embedded) return parseTsv(embedded, source);
        const response = await fetch(source.url);
        if (!response.ok) throw new Error(`カードデータを取得できませんでした: ${response.url}`);
        return parseTsv(await response.text(), source);
      }),
    );
    state.cards = groups.flat();
  } catch (error) {
    console.warn(error);
    state.cards = [
      {
        id: "sample-archbishop",
        tab: "neutral",
        icon: "◇",
        name: "アーチビショップ",
        game: "ビギンズ",
        category: "クリーチャー",
        element: "無",
        rarity: "N",
        cost: "G50",
        st: "30",
        hp: "30",
        placementRestriction: "-",
        usageRestriction: "-",
        effect: "アイテム破壊と盗みの効果を受けない；不屈；領地能力[対象クリーチャーに付いた(呪)効果を消す(G30)]",
        owned: 2,
        book: 2,
      },
    ];
    els.copyStatus.textContent = "カードTSVを読み込めませんでした。localhostで開くと実データを読み込めます。";
  }
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseCardCountText(text) {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] || "";
  const entries = lines.slice(2).map((line) => {
    const [name, count] = line.split(/\t/);
    return {
      name: String(name || "").trim(),
      count: Math.max(0, Number(count || 0)),
    };
  });
  return { title, entries: entries.filter((entry) => entry.name && entry.count > 0) };
}

function bookNameFromTitle(title) {
  const quoted = String(title || "").match(/[「『](.+?)[」』]/);
  return quoted ? quoted[1] : String(title || DEFAULT_BOOK_NAME).replace(/^ビギンズ初期ブック/, "").trim();
}

function cardMapFromEntries(entries) {
  const cardsByName = new Map(state.cards.map((card) => [card.name, card]));
  const counts = {};
  const missing = [];
  for (const entry of entries) {
    const resolvedName = CARD_NAME_ALIASES[entry.name] || entry.name;
    const card = cardsByName.get(resolvedName);
    if (!card) {
      missing.push(entry.name);
      continue;
    }
    counts[card.id] = Number(counts[card.id] || 0) + entry.count;
  }
  return { counts, missing };
}

async function loadInitialBookData() {
  try {
    const books = await Promise.all(
      BOOK_DATA_FILES.map(async (source) => {
        const embeddedBookKey = source.id === "starter-water-air" ? "starterWaterAir" : "starterFireEarth";
        const text = embeddedData.bookData?.[embeddedBookKey] || "";
        let sourceText = text;
        if (!sourceText) {
          const response = await fetch(source.url);
          if (!response.ok) throw new Error(`ブックデータを取得できませんでした: ${source.url}`);
          sourceText = await response.text();
        }
        const parsed = parseCardCountText(sourceText);
        const { counts, missing } = cardMapFromEntries(parsed.entries);
        return {
          id: source.id,
          name: bookNameFromTitle(parsed.title),
          cards: counts,
          missing,
        };
      }),
    );

    let ownedText = embeddedData.bookData?.initialOwned || "";
    if (!ownedText) {
      const ownedResponse = await fetch(INITIAL_OWNED_URL);
      if (!ownedResponse.ok) throw new Error(`初期所持カードを取得できませんでした: ${INITIAL_OWNED_URL}`);
      ownedText = await ownedResponse.text();
    }
    const owned = parseCardCountText(ownedText);
    const { counts: ownedCounts, missing: ownedMissing } = cardMapFromEntries(owned.entries);

    state.defaultBooks = books;
    state.defaultOwnedByCardId = ownedCounts;
    const missing = [...books.flatMap((book) => book.missing || []), ...ownedMissing];
    if (missing.length) {
      els.bookStatus.textContent = `未登録カードがあります: ${[...new Set(missing)].join("、")}`;
    }
  } catch (error) {
    console.warn(error);
    state.defaultBooks = [createInitialBookFromCards()];
    state.defaultOwnedByCardId = Object.fromEntries(
      state.cards
        .filter((card) => Number(card.owned || 0) > 0)
        .map((card) => [card.id, Number(card.owned || 0)]),
    );
    els.bookStatus.textContent = "初期ブックデータを読み込めませんでした。サンプル値で表示しています。";
  }
}

function ensureProfileHeadings(text) {
  const source = String(text || els.skillText.value || "").trim();
  const migrated = source
    .replaceAll("#参考にしたいURL", "#参考にしたい情報（テキスト or URL）")
    .replaceAll("#自分の基本ストラテジー", "#このブックのストラテジー、狙っている勝ち筋")
    .replaceAll("#効果的な組み合わせ", "#このブックのコアとなるカード");
  const sections = {};
  let currentHeading = "";
  for (const line of migrated.split(/\r?\n/)) {
    if (line.startsWith("#")) {
      currentHeading = line.trim();
      sections[currentHeading] = sections[currentHeading] || [];
      continue;
    }
    if (currentHeading) sections[currentHeading].push(line);
  }
  return PROFILE_HEADINGS.map((heading) => {
    const body =
      (sections[heading] || ["- "])
        .filter((line) => !isRemovedDefaultStrategyLine(line))
        .join("\n")
        .trim() || "- ";
    return `${heading}\n${body}`;
  }).join("\n\n");
}

function isRemovedDefaultStrategyLine(line) {
  const normalized = String(line || "")
    .replace(/^\s*[-*]\s*/, "")
    .trim();
  return normalized === "所持カードが少ない場合は代替案も欲しい" || normalized === "まずはビギンズから始める前提で説明してほしい";
}

function profileSections(text) {
  const sections = {};
  let currentHeading = "";
  String(text || "")
    .replaceAll("#参考にしたいURL", "#参考にしたい情報（テキスト or URL）")
    .replaceAll("#自分の基本ストラテジー", "#このブックのストラテジー、狙っている勝ち筋")
    .replaceAll("#効果的な組み合わせ", "#このブックのコアとなるカード")
    .split(/\r?\n/)
    .forEach((line) => {
      if (line.startsWith("#")) {
        currentHeading = line.trim();
        sections[currentHeading] = sections[currentHeading] || [];
        return;
      }
      if (currentHeading) sections[currentHeading].push(line);
    });
  return sections;
}

function profileSectionBody(text, heading) {
  return (profileSections(text)[heading] || [])
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => line !== "-")
    .join(", ");
}

function setProfileSectionBody(text, heading, body) {
  const sections = profileSections(ensureProfileHeadings(text));
  const entries = String(body || "")
    .split(/[,\n、，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  sections[heading] = entries.length ? entries.map((item) => `- ${item}`) : ["- "];
  return PROFILE_HEADINGS.map((profileHeading) => {
    const lines = sections[profileHeading] || ["- "];
    const content = lines.join("\n").trim() || "- ";
    return `${profileHeading}\n${content}`;
  }).join("\n\n");
}

function syncKnowledgeReferenceInputFromStrategy() {
  if (!els.knowledgeReferenceIds) return;
  const legacyIds = profileSectionBody(els.skillText.value, KNOWLEDGE_ID_HEADING);
  if (legacyIds && !els.knowledgeReferenceIds.value.trim()) {
    els.knowledgeReferenceIds.value = legacyIds;
  }
}

function writeKnowledgeReferenceInputToStrategy() {
  if (!els.knowledgeReferenceIds) return;
  const activeBook = getActiveBook();
  if (activeBook) {
    activeBook.skillText = ensureProfileHeadings(els.skillText.value);
    activeBook.knowledgeReferenceIds = normalizeKnowledgeReferenceText(els.knowledgeReferenceIds.value);
  }
}

function normalizeKnowledgeReferenceText(value) {
  return String(value || "")
    .split(/[,\n、，]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function extractKnowledgeReferenceMetadata(content) {
  const source = String(content || "");
  const commentMatch = source.match(/<!--\s*cepter-knowledge-reference-ids:\s*([\s\S]*?)\s*-->/i);
  if (commentMatch) return normalizeKnowledgeReferenceText(commentMatch[1]);
  return normalizeKnowledgeReferenceText(profileSectionBody(source, KNOWLEDGE_ID_HEADING));
}

function stripKnowledgeReferenceMetadata(content) {
  return String(content || "").replace(/<!--\s*cepter-knowledge-reference-ids:[\s\S]*?-->/gi, "").trim();
}

function serializeStrategyProfileContent(skillText, knowledgeReferenceIds = "") {
  const content = ensureProfileHeadings(stripKnowledgeReferenceMetadata(skillText || emptySkillText()));
  const normalizedIds = normalizeKnowledgeReferenceText(knowledgeReferenceIds);
  if (!normalizedIds) return content;
  return `${content}\n\n<!-- cepter-knowledge-reference-ids: ${normalizedIds} -->`;
}

function emptySkillText() {
  return PROFILE_HEADINGS.map((heading) => `${heading}\n- `).join("\n\n");
}

function setPromptPreviewText(text, { force = false } = {}) {
  if (!state.promptGenerated) {
    els.promptPreview.hidden = true;
    els.promptPreview.value = "";
    return;
  }
  els.promptPreview.hidden = false;
  if (force || !state.promptEdited) {
    els.promptPreview.value = text;
  }
}

function defaultBookByName(name) {
  return state.defaultBooks.find((book) => book.name === name);
}

function createInitialBookFromCards() {
  const cards = Object.fromEntries(
    state.cards
      .filter((card) => Number(card.book || 0) > 0)
      .map((card) => [card.id, Number(card.book || 0)]),
  );
  return {
    id: DEFAULT_BOOK_ID,
    name: DEFAULT_BOOK_NAME,
    cards,
    skillText: ensureProfileHeadings(els.skillText.value),
    knowledgeReferenceIds: state.isRegistered ? normalizeKnowledgeReferenceText(els.knowledgeReferenceIds?.value) : "",
  };
}

function getActiveBook() {
  return state.books.find((book) => book.id === state.currentBookId) || state.books[0];
}

function captureOwnedFromCards() {
  state.ownedByCardId = Object.fromEntries(
    state.cards
      .filter((card) => Number(card.owned || 0) > 0)
      .map((card) => [card.id, Number(card.owned || 0)]),
  );
}

function applyOwnedToCards() {
  state.ownedByCardId = normalizeCardCountMap(state.ownedByCardId);
  state.cards.forEach((card) => {
    card.owned = Math.min(4, Number(state.ownedByCardId[card.id] || 0));
  });
}

function captureActiveBookFromCards() {
  const activeBook = getActiveBook();
  if (!activeBook) return;
  activeBook.skillText = ensureProfileHeadings(els.skillText.value);
  activeBook.knowledgeReferenceIds = state.isRegistered ? normalizeKnowledgeReferenceText(els.knowledgeReferenceIds?.value) : "";
  activeBook.cards = Object.fromEntries(
    state.cards
      .filter((card) => Number(card.book || 0) > 0)
      .map((card) => [card.id, Number(card.book || 0)]),
  );
}

function applyActiveBookToCards() {
  const activeBook = getActiveBook();
  if (!activeBook) return;
  state.currentBookId = activeBook.id;
  activeBook.cards = normalizeCardCountMap(activeBook.cards || {});
  state.cards.forEach((card) => {
    card.book = Number(activeBook.cards?.[card.id] || 0);
  });
  const rawSkillText = stripKnowledgeReferenceMetadata(activeBook.skillText || els.skillText.value);
  els.skillText.value = ensureProfileHeadings(rawSkillText);
  const legacyIds = extractKnowledgeReferenceMetadata(activeBook.skillText);
  activeBook.knowledgeReferenceIds = state.isRegistered ? normalizeKnowledgeReferenceText(activeBook.knowledgeReferenceIds || legacyIds) : "";
  els.knowledgeReferenceIds.value = state.isRegistered ? activeBook.knowledgeReferenceIds || "" : "";
  renderCurrentBookLabels();
  renderKnowledgePosts();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function seedRemoteUserData() {
  if (!supabaseClient || !state.supabaseUser?.id) return;
  const ownedRows = Object.entries(state.defaultOwnedByCardId || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([cardId, count]) => ({
      user_id: state.supabaseUser.id,
      card_id: cardId,
      owned_count: Math.min(4, Math.max(0, Number(count || 0))),
    }));
  if (ownedRows.length) {
    const { error } = await supabaseClient.from("owned_cards").upsert(ownedRows);
    if (error) throw error;
  }

  for (const defaultBook of state.defaultBooks) {
    const { data: createdBook, error: bookError } = await supabaseClient
      .from("books")
      .insert({
        user_id: state.supabaseUser.id,
        name: defaultBook.name || DEFAULT_BOOK_NAME,
        is_default: true,
      })
      .select("id")
      .single();
    if (bookError) throw bookError;

    const bookCardRows = Object.entries(defaultBook.cards || {})
      .filter(([, count]) => Number(count) > 0)
      .map(([cardId, count]) => ({
        book_id: createdBook.id,
        card_id: cardId,
        card_count: Math.min(4, Math.max(0, Number(count || 0))),
      }));
    if (bookCardRows.length) {
      const { error } = await supabaseClient.from("book_cards").insert(bookCardRows);
      if (error) throw error;
    }

    const { error: strategyError } = await supabaseClient.from("strategy_profiles").insert({
      book_id: createdBook.id,
      user_id: state.supabaseUser.id,
      content: serializeStrategyProfileContent(defaultBook.skillText || els.skillText.value, defaultBook.knowledgeReferenceIds),
    });
    if (strategyError) throw strategyError;
  }
}

async function insertRemoteDefaultBook(defaultBook) {
  const { data: createdBook, error: bookError } = await supabaseClient
    .from("books")
    .insert({
      user_id: state.supabaseUser.id,
      name: defaultBook.name || DEFAULT_BOOK_NAME,
      is_default: true,
    })
    .select("id")
    .single();
  if (bookError) throw bookError;

  await insertRemoteBookCards(createdBook.id, defaultBook.cards);

  const { error: strategyError } = await supabaseClient.from("strategy_profiles").insert({
    book_id: createdBook.id,
    user_id: state.supabaseUser.id,
    content: serializeStrategyProfileContent(defaultBook.skillText || emptySkillText(), defaultBook.knowledgeReferenceIds),
  });
  if (strategyError) throw strategyError;
}

async function insertRemoteBookCards(bookId, cards) {
  const bookCardRows = Object.entries(cards || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([cardId, count]) => ({
      book_id: bookId,
      card_id: cardId,
      card_count: Math.min(4, Math.max(0, Number(count || 0))),
    }));
  if (!bookCardRows.length) return;
  const { error } = await supabaseClient.from("book_cards").insert(bookCardRows);
  if (error) throw error;
}

async function ensureRemoteDefaultBooks(remoteBooks) {
  const missingDefaultBooks = state.defaultBooks.filter(
    (defaultBook) => !remoteBooks.some((book) => book.name === defaultBook.name),
  );
  if (!missingDefaultBooks.length) return false;
  for (const defaultBook of missingDefaultBooks) {
    await insertRemoteDefaultBook(defaultBook);
  }
  return true;
}

async function repairEmptyRemoteDefaultBooks(remoteBooks, cardsByBookId) {
  let repaired = false;
  for (const remoteBook of remoteBooks) {
    const defaultBook = defaultBookByName(remoteBook.name);
    const currentCards = cardsByBookId.get(remoteBook.id) || {};
    if (!defaultBook || !isCorruptedInitialCardMap(currentCards, defaultBook.cards)) continue;
    await supabaseClient.from("book_cards").delete().eq("book_id", remoteBook.id);
    await insertRemoteBookCards(remoteBook.id, defaultBook.cards);
    cardsByBookId.set(remoteBook.id, { ...defaultBook.cards });
    repaired = true;
  }
  return repaired;
}

async function repairEmptyRemoteOwnedCards(remoteOwned) {
  const currentOwned = normalizeCardCountMap(
    Object.fromEntries(
      (remoteOwned || [])
        .filter((row) => Number(row.owned_count || 0) > 0)
        .map((row) => [row.card_id, Number(row.owned_count || 0)]),
    ),
  );
  if (!shouldRepairInitialOwnedCards(currentOwned)) return false;
  const ownedRows = Object.entries(state.defaultOwnedByCardId || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([cardId, count]) => ({
      user_id: state.supabaseUser.id,
      card_id: cardId,
      owned_count: Math.min(4, Math.max(0, Number(count || 0))),
    }));
  if (!ownedRows.length) return false;
  await supabaseClient.from("owned_cards").delete().eq("user_id", state.supabaseUser.id);
  const { error } = await supabaseClient.from("owned_cards").insert(ownedRows);
  if (error) throw error;
  return true;
}

async function loadRemoteUserData() {
  if (!supabaseClient || !state.supabaseUser?.id) return;
  state.remoteReady = false;
  const { data: remoteBooks, error: booksError } = await supabaseClient
    .from("books")
    .select("id,name,is_default,created_at")
    .order("created_at", { ascending: true });
  if (booksError) {
    console.warn("remote books fetch failed", booksError);
    els.bookStatus.textContent = `ブックの読み込みに失敗しました: ${booksError.message}`;
    return;
  }

  if (!remoteBooks?.length) {
    await seedRemoteUserData();
    return loadRemoteUserData();
  }

  if (await ensureRemoteDefaultBooks(remoteBooks)) {
    return loadRemoteUserData();
  }

  const bookIds = remoteBooks.map((book) => book.id);
  const [{ data: remoteOwned, error: ownedError }, { data: remoteBookCards, error: cardsError }, { data: remoteStrategies, error: strategiesError }] =
    await Promise.all([
      supabaseClient.from("owned_cards").select("card_id,owned_count"),
      supabaseClient.from("book_cards").select("book_id,card_id,card_count").in("book_id", bookIds),
      supabaseClient.from("strategy_profiles").select("book_id,content").in("book_id", bookIds),
    ]);

  const firstError = ownedError || cardsError || strategiesError;
  if (firstError) {
    console.warn("remote user data fetch failed", firstError);
    els.bookStatus.textContent = `保存データの読み込みに失敗しました: ${firstError.message}`;
    return;
  }

  const cardsByBookId = new Map(bookIds.map((id) => [id, {}]));
  (remoteBookCards || []).forEach((row) => {
    const cardId = resolveStoredCardId(row.card_id);
    if (!cardId) return;
    const bookCards = cardsByBookId.get(row.book_id);
    bookCards[cardId] = Number(bookCards[cardId] || 0) + Number(row.card_count || 0);
  });
  const repairedDefaultBooks = await repairEmptyRemoteDefaultBooks(remoteBooks, cardsByBookId);
  const repairedOwnedCards = await repairEmptyRemoteOwnedCards(remoteOwned);
  const strategyByBookId = new Map((remoteStrategies || []).map((row) => [row.book_id, row.content || ""]));
  const locallySaved = safeParseJson(localStorage.getItem(STORAGE_KEY));
  const localKnowledgeByBookId = new Map(
    (Array.isArray(locallySaved?.books) ? locallySaved.books : []).map((book) => [
      book.id,
      normalizeKnowledgeReferenceText(book.knowledgeReferenceIds || extractKnowledgeReferenceMetadata(book.skillText)),
    ]),
  );
  let usedLocalKnowledgeFallback = false;

  state.books = remoteBooks.map((book) => {
    const remoteKnowledgeIds = extractKnowledgeReferenceMetadata(strategyByBookId.get(book.id) || "");
    const localKnowledgeIds = normalizeKnowledgeReferenceText(
      localKnowledgeByBookId.get(book.id) || (book.id === locallySaved?.currentBookId ? locallySaved?.knowledgeReferenceIds : ""),
    );
    if (!remoteKnowledgeIds && localKnowledgeIds) usedLocalKnowledgeFallback = true;
    return {
      id: book.id,
      name: book.name || DEFAULT_BOOK_NAME,
      isDefault: Boolean(book.is_default),
      cards: normalizeCardCountMap(cardsByBookId.get(book.id) || {}),
      skillText: ensureProfileHeadings(stripKnowledgeReferenceMetadata(strategyByBookId.get(book.id) || emptySkillText())),
      knowledgeReferenceIds: normalizeKnowledgeReferenceText(remoteKnowledgeIds || localKnowledgeIds),
    };
  });
  state.currentBookId = state.books.some((book) => book.id === state.currentBookId) ? state.currentBookId : state.books[0].id;
  state.ownedByCardId = normalizeCardCountMap(
    Object.fromEntries(
      (repairedOwnedCards ? Object.entries(state.defaultOwnedByCardId || {}).map(([card_id, owned_count]) => ({ card_id, owned_count })) : remoteOwned || [])
        .filter((row) => Number(row.owned_count) > 0)
        .map((row) => [row.card_id, Number(row.owned_count || 0)]),
    ),
  );
  applyOwnedToCards();
  applyActiveBookToCards();
  renderBookSelect();
  renderCards();
  updateSummary();
  state.remoteReady = true;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      skillText: els.skillText.value,
      knowledgeReferenceIds: state.isRegistered ? normalizeKnowledgeReferenceText(els.knowledgeReferenceIds?.value) : "",
      questionText: els.questionText.value,
      currentBookId: state.currentBookId,
      ownedByCardId: state.ownedByCardId,
      books: state.books,
      initialDataVersion: INITIAL_DATA_VERSION,
      isRegistered: state.isRegistered,
      userName: state.userName,
      knowledgePosts: state.knowledgePosts,
      likedKnowledgeIds: state.likedKnowledgeIds,
    }),
  );
  els.bookStatus.textContent = repairedDefaultBooks || repairedOwnedCards
    ? "初期ブック・所持カードを初期データから復元しました。"
    : "Supabaseからブックを読み込みました。";
  setPendingCardChanges(false);
  if (usedLocalKnowledgeFallback) queueRemoteSync();
}

async function saveRemoteUserData() {
  if (!supabaseClient || !state.supabaseUser?.id || !state.remoteReady || remoteSyncInFlight) return;
  remoteSyncInFlight = true;
  try {
    captureActiveBookFromCards();
    captureOwnedFromCards();
    const ownedRows = Object.entries(state.ownedByCardId || {})
      .filter(([, count]) => Number(count) > 0)
      .map(([cardId, count]) => ({
        user_id: state.supabaseUser.id,
        card_id: cardId,
        owned_count: Math.min(4, Math.max(0, Number(count || 0))),
      }));
    await supabaseClient.from("owned_cards").delete().eq("user_id", state.supabaseUser.id);
    if (ownedRows.length) {
      const { error } = await supabaseClient.from("owned_cards").insert(ownedRows);
      if (error) throw error;
    }

    const validBooks = state.books.filter((book) => isUuid(book.id));
    if (!validBooks.length) return;
    const { error: bookError } = await supabaseClient.from("books").upsert(
      validBooks.map((book) => ({
        id: book.id,
        user_id: state.supabaseUser.id,
        name: book.name || DEFAULT_BOOK_NAME,
        is_default: Boolean(book.isDefault),
      })),
    );
    if (bookError) throw bookError;

    const bookIds = validBooks.map((book) => book.id);
    await supabaseClient.from("book_cards").delete().in("book_id", bookIds);
    const bookCardRows = validBooks.flatMap((book) =>
      Object.entries(book.cards || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([cardId, count]) => ({
          book_id: book.id,
          card_id: cardId,
          card_count: Math.min(4, Math.max(0, Number(count || 0))),
        })),
    );
    if (bookCardRows.length) {
      const { error } = await supabaseClient.from("book_cards").insert(bookCardRows);
      if (error) throw error;
    }

    const { error: strategyError } = await supabaseClient.from("strategy_profiles").upsert(
      validBooks.map((book) => ({
        book_id: book.id,
        user_id: state.supabaseUser.id,
        content: serializeStrategyProfileContent(book.skillText || emptySkillText(), book.knowledgeReferenceIds),
      })),
    );
    if (strategyError) throw strategyError;
  } catch (error) {
    console.warn("remote sync failed", error);
    els.bookStatus.textContent = `Supabase保存に失敗しました: ${error.message}`;
  } finally {
    remoteSyncInFlight = false;
  }
}

function queueRemoteSync() {
  if (!supabaseClient || !state.supabaseUser?.id || !state.remoteReady) return;
  window.clearTimeout(remoteSyncTimer);
  remoteSyncTimer = window.setTimeout(() => {
    saveRemoteUserData();
  }, 700);
}

function renderStrategyCopySelect() {
  const options = state.books
    .filter((book) => book.id !== state.currentBookId)
    .map((book) => `<option value="${escapeHtml(book.id)}">${escapeHtml(book.name || DEFAULT_BOOK_NAME)}</option>`)
    .join("");
  els.strategyCopySource.innerHTML = options || '<option value="">コピー元なし</option>';
  els.strategyCopySource.disabled = !options || !state.isRegistered;
  els.copyStrategyFromBook.disabled = !options || !state.isRegistered;
}

function setPendingCardChanges(pending) {
  pendingCardChanges = Boolean(pending);
  if (!els.applyBookChanges) return;
  els.applyBookChanges.hidden = !pendingCardChanges;
  els.applyBookChanges.classList.toggle("is-pending", pendingCardChanges);
}

function persistAppState(options = {}) {
  captureActiveBookFromCards();
  captureOwnedFromCards();
  const payload = {
    skillText: els.skillText.value,
    knowledgeReferenceIds: state.isRegistered ? normalizeKnowledgeReferenceText(els.knowledgeReferenceIds?.value) : "",
    questionText: els.questionText.value,
    currentBookId: state.currentBookId,
    ownedByCardId: state.ownedByCardId,
    books: state.books,
    initialDataVersion: INITIAL_DATA_VERSION,
    isRegistered: state.isRegistered,
    userName: state.userName,
    knowledgePosts: state.knowledgePosts,
    likedKnowledgeIds: state.likedKnowledgeIds,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if (options.sync !== false && !pendingCardChanges) queueRemoteSync();
}

function initializeStoredState() {
  const saved = safeParseJson(localStorage.getItem(STORAGE_KEY));
  const savedSkillText = typeof saved?.skillText === "string" ? ensureProfileHeadings(saved.skillText) : ensureProfileHeadings(els.skillText.value);
  state.isRegistered = Boolean(saved?.isRegistered);
  const refreshGuestInitialData = Boolean(saved) && !state.isRegistered && saved.initialDataVersion !== INITIAL_DATA_VERSION;
  let repairedInitialData = false;

  state.books = Array.isArray(saved?.books) && saved.books.length
    ? saved.books.map((book) => {
        const before = normalizeBookCards(book);
        const after = repairInitialBookIfCorrupted(book);
        if (cardCountTotal(before.cards) !== cardCountTotal(after.cards)) repairedInitialData = true;
        return after;
      })
    : state.defaultBooks.map(normalizeBookCards);
  for (const defaultBook of state.defaultBooks) {
    if (!state.books.some((book) => book.id === defaultBook.id)) {
      state.books.push(normalizeBookCards(defaultBook));
      repairedInitialData = true;
    }
  }
  state.books = state.books.map((book) => ({
    ...book,
    skillText: ensureProfileHeadings(stripKnowledgeReferenceMetadata(book.skillText || savedSkillText)),
    knowledgeReferenceIds: state.isRegistered
      ? normalizeKnowledgeReferenceText(
          book.knowledgeReferenceIds || extractKnowledgeReferenceMetadata(book.skillText) || (book.id === saved?.currentBookId ? saved?.knowledgeReferenceIds : ""),
        )
      : "",
  }));
  state.currentBookId = state.books.some((book) => book.id === saved?.currentBookId)
    ? saved.currentBookId
    : DEFAULT_BOOK_ID;
  if (!state.books.some((book) => book.id === state.currentBookId)) {
    state.currentBookId = state.books[0].id;
  }
  state.ownedByCardId = normalizeCardCountMap(
    saved?.ownedByCardId && typeof saved.ownedByCardId === "object" ? saved.ownedByCardId : state.defaultOwnedByCardId,
  );
  if (refreshGuestInitialData || shouldRepairInitialOwnedCards(state.ownedByCardId)) {
    state.ownedByCardId = normalizeCardCountMap(state.defaultOwnedByCardId);
    repairedInitialData = true;
  }
  state.userName = typeof saved?.userName === "string" ? saved.userName : "";
  state.knowledgePosts =
    Array.isArray(saved?.knowledgePosts) && saved.knowledgePosts.length
      ? saved.knowledgePosts.map(normalizeKnowledgePost)
      : defaultKnowledgePosts();
  state.likedKnowledgeIds = Array.isArray(saved?.likedKnowledgeIds) ? saved.likedKnowledgeIds.map(String) : [];

  if (typeof saved?.questionText === "string") els.questionText.value = saved.questionText;
  els.registeredMode.checked = state.isRegistered;

  applyOwnedToCards();
  applyActiveBookToCards();
  renderStrategyCopySelect();
  renderKnowledgeCardOptions();
  updateKnowledgeMode();
  renderKnowledgePosts();
  renderBookSelect();
  if (repairedInitialData) persistAppState({ sync: false });
}

function renderBookSelect() {
  els.savedBookSelect.innerHTML = state.books
    .map((book) => `<option value="${escapeHtml(book.id)}">${escapeHtml(book.name || DEFAULT_BOOK_NAME)}</option>`)
    .join("");
  els.savedBookSelect.value = state.currentBookId;
  els.deleteBook.disabled = state.books.length <= 1;
  renderStrategyCopySelect();
  renderCurrentBookLabels();
}

function renderCurrentBookLabels() {
  const activeBook = getActiveBook();
  const name = activeBook?.name || DEFAULT_BOOK_NAME;
  els.currentBookLabels.forEach((label) => {
    label.textContent = name;
  });
}

function openBookRegistration() {
  const nextIndex = state.books.length + 1;
  els.bookName.value = `新しいブック ${nextIndex}`;
  els.bookRegistration.hidden = false;
  els.bookName.focus();
}

function closeBookRegistration() {
  els.bookRegistration.hidden = true;
}

function showScreen(screenName, options = {}) {
  ["landing", "login", "register", "related", "contact", "knowledge", "app"].forEach((name) => {
    document.body.classList.toggle(`screen-${name}`, screenName === name);
  });
  document.querySelectorAll("[data-screen]").forEach((screen) => {
    screen.hidden = screen.dataset.screen !== screenName;
  });
  if (screenName === "app") {
    setMobilePane("book", { scroll: false });
  }
  if (options.scroll !== false) {
    window.scrollTo({ top: 0, behavior: options.smooth ? "smooth" : "auto" });
  }
  closeSiteMenu();
}

function closeSiteMenu() {
  els.siteMenu.hidden = true;
  els.menuToggle.setAttribute("aria-expanded", "false");
}

function toggleSiteMenu() {
  const willOpen = els.siteMenu.hidden;
  els.siteMenu.hidden = !willOpen;
  els.menuToggle.setAttribute("aria-expanded", String(willOpen));
}

function scrollToSection(selector) {
  const target = document.querySelector(selector);
  if (!target) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const headerOffset = 82;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function renderAuthState() {
  document.body.classList.toggle("is-registered", state.isRegistered);
  if (state.isRegistered) {
    els.headerLogin.hidden = true;
    els.headerUserName.hidden = false;
    els.headerLogout.hidden = false;
    els.headerUserName.textContent = state.userName || "登録ユーザー";
  } else {
    els.headerLogin.hidden = false;
    els.headerUserName.hidden = true;
    els.headerLogout.hidden = true;
    els.headerUserName.textContent = "";
  }
  renderStrategyCopySelect();
}

function setAuthMessage(message, target = "login") {
  const element = target === "register" ? els.registerStatus : els.authStatus;
  if (element) element.textContent = message || "";
}

function authDisplayName(user, fallback = "") {
  return (
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    fallback ||
    user?.email?.split("@")[0] ||
    "登録ユーザー"
  );
}

async function upsertProfileForUser(user, displayName) {
  if (!supabaseClient || !user?.id) return;
  const name = displayName || authDisplayName(user);
  const { error } = await supabaseClient.from("profiles").upsert({
    id: user.id,
    display_name: name,
  });
  if (error) {
    console.warn("profile upsert failed", error);
  }
}

async function profileNameForUser(user) {
  if (!supabaseClient || !user?.id) return authDisplayName(user);
  const { data, error } = await supabaseClient.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  if (error) {
    console.warn("profile fetch failed", error);
    return authDisplayName(user);
  }
  return data?.display_name || authDisplayName(user);
}

async function applySupabaseSession(session) {
  if (!session?.user) {
    state.supabaseUser = null;
    state.remoteReady = false;
    state.isRegistered = false;
    state.userName = "";
    state.books.forEach((book) => {
      book.knowledgeReferenceIds = "";
    });
    if (els.knowledgeReferenceIds) els.knowledgeReferenceIds.value = "";
    if (els.registeredMode) els.registeredMode.checked = false;
    updateKnowledgeMode();
    renderAuthState();
    renderKnowledgePosts();
    persistAppState();
    return;
  }
  state.supabaseUser = session.user;
  state.isRegistered = true;
  await upsertProfileForUser(session.user, authDisplayName(session.user));
  state.userName = await profileNameForUser(session.user);
  if (els.registeredMode) els.registeredMode.checked = true;
  updateKnowledgeMode();
  renderAuthState();
  renderKnowledgePosts();
  await loadRemoteUserData();
  await loadRemoteKnowledgePosts();
  persistAppState();
}

async function initializeSupabaseAuth() {
  if (!supabaseClient) return false;
  const search = new URLSearchParams(location.search);
  const authCode = search.get("code");
  if (authCode) {
    const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(authCode);
    if (exchangeError) console.warn("supabase auth code exchange failed", exchangeError);
  }
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.warn("supabase session fetch failed", error);
    return false;
  }
  await applySupabaseSession(data.session);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    applySupabaseSession(session);
  });
  return Boolean(data.session?.user);
}

function isSupabaseAuthCallback() {
  const search = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  return Boolean(
    search.has("code") ||
      search.has("token_hash") ||
      search.get("type") ||
      hash.has("access_token") ||
      hash.has("refresh_token") ||
      hash.get("type"),
  );
}

function enterApp({ registered, userName = "" }) {
  state.isRegistered = Boolean(registered);
  state.userName = state.isRegistered ? userName.trim() || state.userName || "登録ユーザー" : "";
  if (els.registeredMode) els.registeredMode.checked = state.isRegistered;
  updateKnowledgeMode();
  renderAuthState();
  renderKnowledgePosts();
  persistAppState();
  showScreen("app");
}

function scrollCardsBelowStickyTabs() {
  const header = document.querySelector(".site-header");
  const tabs = document.querySelector(".category-tabs");
  const offset = (header?.offsetHeight || 0) + (tabs?.offsetHeight || 0) + 14;
  const top = els.cardGrid.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function defaultKnowledgePosts() {
  return [
    {
      id: "sample-knowledge-1",
      publicNo: 1,
      title: "初期ブックは40枚を守って勝ち筋を見やすくする",
      viewpoint: "book",
      relatedCards: [],
      comment:
        "慣れないうちは入れたいカードを増やすより、40枚の中で何を引きたいかをはっきりさせる。クリーチャー、アイテム、スペルの役割が重なりすぎないように見るとAIに聞きやすい。",
      visibility: "public",
      likes: 8,
      authorScore: 24,
      createdAt: "2026-06-08T00:00:00.000Z",
    },
    {
      id: "sample-knowledge-2",
      publicNo: 2,
      title: "土地を取ったあとに守る手段まで考える",
      viewpoint: "play",
      relatedCards: ["アーチビショップ"],
      comment:
        "高い土地を作る前に、そこを守るカードや相手の妨害を外す手段があるかを見る。奪われると負け筋になる土地は、作るタイミングを少し遅らせてもよい。",
      visibility: "public",
      likes: 5,
      authorScore: 9,
      createdAt: "2026-06-08T00:10:00.000Z",
    },
  ];
}

function normalizeKnowledgePost(post) {
  return {
    id: String(post.id || `knowledge-${Date.now().toString(36)}`),
    publicNo: Number(post.publicNo || post.public_no || 0),
    title: String(post.title || "").trim(),
    viewpoint: ["book", "play", "other"].includes(post.viewpoint) ? post.viewpoint : "book",
    relatedCards: Array.isArray(post.relatedCards)
      ? post.relatedCards.map((card) => String(card || "").trim()).filter(Boolean).slice(0, 3)
      : [],
    comment: String(post.comment || "").trim(),
    visibility: post.visibility === "private" ? "private" : "public",
    likes: Math.max(0, Number(post.likes || 0)),
    authorScore: Math.max(0, Number(post.authorScore || post.likes || 0)),
    badgeTier: post.badgeTier ? String(post.badgeTier) : "",
    ownerId: post.ownerId ? String(post.ownerId) : "",
    createdAt: post.createdAt || new Date().toISOString(),
  };
}

function guestKey() {
  let key = localStorage.getItem(GUEST_KEY_STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY_STORAGE_KEY, key);
  }
  return key;
}

function scoreForBadgeTier(tier) {
  if (tier === "gold") return 100;
  if (tier === "red") return 50;
  if (tier === "purple") return 20;
  if (tier === "blue") return 5;
  return 0;
}

function badgeForKnowledgeAuthor(value) {
  if (typeof value === "string") {
    if (value === "gold") return { label: "金バッジ", className: "badge-gold", threshold: 100 };
    if (value === "red") return { label: "赤バッジ", className: "badge-red", threshold: 50 };
    if (value === "purple") return { label: "紫バッジ", className: "badge-purple", threshold: 20 };
    if (value === "blue") return { label: "薄青バッジ", className: "badge-blue", threshold: 5 };
    return { label: "緑バッジ", className: "badge-green", threshold: 0 };
  }
  const score = Number(value || 0);
  if (score >= 100) return { label: "金バッジ", className: "badge-gold", threshold: 100 };
  if (score >= 50) return { label: "赤バッジ", className: "badge-red", threshold: 50 };
  if (score >= 20) return { label: "紫バッジ", className: "badge-purple", threshold: 20 };
  if (score >= 5) return { label: "薄青バッジ", className: "badge-blue", threshold: 5 };
  return { label: "緑バッジ", className: "badge-green", threshold: 0 };
}

function formatKnowledgeId(post) {
  const value = Number(post.publicNo || 0);
  if (value > 0) return `ID:${String(value).padStart(5, "0")}`;
  return "ID:-----";
}

function privateKnowledgeShortId(post) {
  return String(post?.id || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
}

function knowledgeReferenceKey(post) {
  const value = Number(post?.publicNo || 0);
  if (value > 0) return `ID:${String(value).padStart(5, "0")}`;
  const shortId = privateKnowledgeShortId(post);
  return shortId ? `PVT:${shortId}` : "";
}

function normalizeKnowledgeReferenceToken(token) {
  const raw = String(token || "").trim();
  if (!raw || raw === "-") return "";
  const privateMatch = raw.match(/(?:PVT|PRIVATE|秘蔵)[:：]?\s*([A-Za-z0-9-]{4,})/i);
  if (privateMatch) {
    const shortId = privateMatch[1].replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
    return shortId ? `PVT:${shortId}` : "";
  }
  const idMatch = raw.match(/(?:ID[:：]?\s*)?0*(\d{1,5})$/i);
  if (idMatch) return `ID:${String(Number(idMatch[1])).padStart(5, "0")}`;
  const maybePrivate = raw.replace(/[^A-Za-z0-9]/g, "");
  if (/^[A-Za-z0-9]{6,}$/.test(maybePrivate)) return `PVT:${maybePrivate.slice(0, 8).toUpperCase()}`;
  return "";
}

function extractReferencedKnowledgeKeys(...texts) {
  const keys = [];
  const addKey = (key) => {
    if (key && !keys.includes(key)) keys.push(key);
  };
  texts
    .map((text) => String(text || ""))
    .join("\n")
    .split(/[\s,、，]+/)
    .forEach((token) => addKey(normalizeKnowledgeReferenceToken(token)));
  return keys;
}

function currentKnowledgeReferenceKeys() {
  return extractReferencedKnowledgeKeys(
    els.knowledgeReferenceIds?.value,
    profileSectionBody(els.skillText.value, KNOWLEDGE_ID_HEADING),
  );
}

function findKnowledgePostByReferenceKey(key) {
  return state.knowledgePosts.find((post) => knowledgeReferenceKey(post) === key);
}

function resolveReferencedKnowledgePosts() {
  const keys = currentKnowledgeReferenceKeys();
  const posts = [];
  const missingKeys = [];
  keys.forEach((key) => {
    const post = findKnowledgePostByReferenceKey(key);
    if (post) posts.push(post);
    else missingKeys.push(key);
  });
  return { keys, posts, missingKeys };
}

function isKnowledgeReferenceSelected(post) {
  const key = knowledgeReferenceKey(post);
  return Boolean(key && currentKnowledgeReferenceKeys().includes(key));
}

function setKnowledgeReferenceKeys(keys) {
  if (!els.knowledgeReferenceIds) return;
  els.knowledgeReferenceIds.value = keys
    .map((key) => findKnowledgePostByReferenceKey(key))
    .map((post, index) => (post ? formatKnowledgeId(post) : keys[index]))
    .join(", ");
  writeKnowledgeReferenceInputToStrategy();
}

function toggleKnowledgeReference(post) {
  const key = knowledgeReferenceKey(post);
  if (!key) return;
  const keys = currentKnowledgeReferenceKeys();
  const nextKeys = keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key];
  setKnowledgeReferenceKeys(nextKeys);
  persistAppState();
  renderKnowledgePosts();
  updateSummary();
}

function updateCurrentBadgeSummary() {
  if (!els.currentBadgeSummary) return;
  if (!state.isRegistered) {
    els.currentBadgeSummary.textContent = "ログインすると現在のバッジを確認できます。";
    return;
  }
  const badge = badgeForKnowledgeAuthor(state.currentAuthorLikes);
  els.currentBadgeSummary.innerHTML = `<span class="author-badge ${badge.className}" aria-hidden="true"></span> 現在: ${badge.label} / 獲得Like累計 ${Number(state.currentAuthorLikes || 0)}`;
}

async function loadRemoteKnowledgePosts() {
  if (!supabaseClient) return;
  const [{ data: publicFeed, error: publicError }, { data: publicMeta, error: publicMetaError }] = await Promise.all([
    supabaseClient.from("public_knowledge_feed").select("*").order("created_at", { ascending: false }),
    state.supabaseUser?.id ? supabaseClient.from("knowledge_posts").select("id,author_id").eq("visibility", "public") : Promise.resolve({ data: [], error: null }),
  ]);
  const privateResult = state.supabaseUser?.id
    ? await supabaseClient
        .from("knowledge_posts")
        .select("*")
        .eq("visibility", "private")
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  const firstError = publicError || publicMetaError || privateResult.error;
  if (firstError) {
    console.warn("remote knowledge fetch failed", firstError);
    els.knowledgeStatus.textContent = `ナレッジの読み込みに失敗しました: ${firstError.message}`;
    return;
  }

  const ownerByPostId = new Map((publicMeta || []).map((post) => [post.id, post.author_id]));
  const posts = [
    ...(publicFeed || []).map((post) =>
      normalizeKnowledgePost({
        id: post.id,
        publicNo: post.public_no,
        title: post.title,
        viewpoint: post.viewpoint,
        comment: post.comment,
        visibility: "public",
        likes: post.likes_count,
        authorScore: Number(post.author_likes_count ?? scoreForBadgeTier(post.author_badge_tier)),
        badgeTier: post.author_badge_tier,
        ownerId: ownerByPostId.get(post.id) === state.supabaseUser?.id ? "current-user" : "",
        createdAt: post.created_at,
      }),
    ),
    ...(privateResult.data || []).map((post) =>
      normalizeKnowledgePost({
        id: post.id,
        publicNo: post.public_no,
        title: post.title,
        viewpoint: post.viewpoint,
        comment: post.comment,
        visibility: "private",
        likes: 0,
        authorScore: 0,
        ownerId: "current-user",
        createdAt: post.created_at,
      }),
    ),
  ];
  state.currentAuthorLikes = posts
    .filter((post) => post.visibility === "public" && post.ownerId === "current-user")
    .reduce((sum, post) => sum + Number(post.likes || 0), 0);
  updateCurrentBadgeSummary();

  const ids = posts.map((post) => post.id);
  if (ids.length) {
    const { data: relatedRows, error: relatedError } = await supabaseClient
      .from("knowledge_related_cards")
      .select("post_id,card_id,position")
      .in("post_id", ids);
    if (relatedError) {
      console.warn("remote related cards fetch failed", relatedError);
    } else {
      const relatedByPostId = new Map();
      (relatedRows || [])
        .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
        .forEach((row) => {
          if (!relatedByPostId.has(row.post_id)) relatedByPostId.set(row.post_id, []);
          relatedByPostId.get(row.post_id).push(row.card_id);
        });
      posts.forEach((post) => {
        post.relatedCards = relatedByPostId.get(post.id) || [];
      });
    }
  }

  state.knowledgePosts = posts.length ? posts : defaultKnowledgePosts();
  renderKnowledgePosts();
  persistAppState();
}

function renderKnowledgeCardOptions() {
  if (!els.knowledgeCardOptions) return;
  els.knowledgeCardOptions.innerHTML = state.cards
    .map((card) => card.name)
    .filter((name, index, names) => name && names.indexOf(name) === index)
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function updateKnowledgeMode() {
  if (els.registeredMode) els.registeredMode.checked = state.isRegistered;
  const panel = document.querySelector(".knowledge-panel");
  panel?.classList.toggle("knowledge-registered", state.isRegistered);
  if (!state.isRegistered) panel?.classList.remove("compose-open");
  const disabled = !state.isRegistered;
  [els.knowledgeTitle, els.knowledgeViewpoint, els.knowledgeCard1, els.knowledgeCard2, els.knowledgeCard3, els.knowledgeComment, els.knowledgeVisibility].forEach(
    (input) => {
      input.disabled = disabled;
    },
  );
  els.knowledgeModeHint.textContent = disabled
    ? "未登録ユーザーは閲覧とLikeのみできます。"
    : "ログイン済みのユーザーは公開ナレッジ投稿と秘蔵ナレッジ保存ができます。";
  updateCurrentBadgeSummary();
}

function visibleKnowledgePosts() {
  return state.knowledgePosts
    .filter((post) => {
      if (state.knowledgeFilter === "private") return state.isRegistered && post.visibility === "private";
      return post.visibility === "public";
    })
    .filter((post) => state.knowledgeFilter === "all" || state.knowledgeFilter === "private" || post.viewpoint === state.knowledgeFilter)
    .filter((post) => {
      const query = state.knowledgeQuery.trim();
      if (!query) return true;
      const haystack = `${post.title} ${post.comment} ${post.relatedCards.join(" ")} ${VIEWPOINT_LABELS[post.viewpoint]}`;
      return haystack.includes(query);
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function renderKnowledgePosts() {
  const posts = visibleKnowledgePosts();
  const emptyLabel = state.knowledgeFilter === "private" ? "まだ秘蔵ナレッジがありません。" : "まだ表示できる公開ナレッジがありません。";
  els.knowledgeList.innerHTML =
    posts
      .map((post) => {
        const liked = state.likedKnowledgeIds.includes(post.id);
        const relatedCards = post.relatedCards.length
          ? post.relatedCards.map((name) => `<span>${escapeHtml(name)}</span>`).join("")
          : "<span>関連カードなし</span>";
        const badge = badgeForKnowledgeAuthor(post.badgeTier || post.authorScore);
        const canDelete = state.isRegistered && post.ownerId === "current-user";
        const referenceSelected = isKnowledgeReferenceSelected(post);
        const referenceButton = `<button class="reference-knowledge-button ${referenceSelected ? "selected" : ""}" data-reference-knowledge="${escapeHtml(post.id)}" type="button">${referenceSelected ? "反映中" : "反映"}</button>`;
        const likeButton =
          post.visibility === "public"
            ? `<button class="like-button ${liked ? "liked" : ""}" data-like-knowledge="${escapeHtml(post.id)}" type="button" aria-label="${escapeHtml(post.title)}をLike">
                  👍 ${Number(post.likes || 0)}
                </button>`
            : "";
        return `
          <article class="knowledge-card">
            <div class="knowledge-card-head">
              <div class="knowledge-meta-line">
                <span class="knowledge-viewpoint">${escapeHtml(VIEWPOINT_LABELS[post.viewpoint] || "ブック")}</span>
                <span class="knowledge-public-id">${escapeHtml(formatKnowledgeId(post))}</span>
                <span class="author-badge ${badge.className}" title="${escapeHtml(badge.label)}" aria-label="${escapeHtml(badge.label)}"></span>
                ${post.visibility === "private" ? '<span class="private-badge">秘蔵ナレッジ</span>' : ""}
              </div>
              <div class="knowledge-card-actions">
                ${referenceButton}
                ${likeButton}
                ${canDelete ? `<button class="delete-knowledge-button" data-delete-knowledge="${escapeHtml(post.id)}" type="button">削除</button>` : ""}
              </div>
            </div>
            <h3>${escapeHtml(post.title)}</h3>
            <time class="knowledge-date" datetime="${escapeHtml(post.createdAt)}">${escapeHtml(formatKnowledgeDate(post.createdAt))}</time>
            <p>${escapeHtml(post.comment)}</p>
            <div class="knowledge-related">${relatedCards}</div>
          </article>
        `;
      })
      .join("") || `<p class="empty-state">${emptyLabel}</p>`;
}

function setKnowledgeFilter(filter) {
  state.knowledgeFilter = filter;
  document.querySelectorAll("[data-knowledge-filter]").forEach((item) => {
    item.classList.toggle("active", item.dataset.knowledgeFilter === filter);
  });
  renderKnowledgePosts();
}

function formatKnowledgeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildKnowledgeMarkdown({ visibility = "public" } = {}) {
  const posts = state.knowledgePosts
    .filter((post) => post.visibility === visibility)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!posts.length) return "- まだナレッジはありません。";
  return posts
    .map((post) => {
      const badge = badgeForKnowledgeAuthor(post.badgeTier || post.authorScore);
      return `## ${post.title}

- ID: ${formatKnowledgeId(post)}
- 観点: ${VIEWPOINT_LABELS[post.viewpoint] || "ブック"}
- 関連カード: ${post.relatedCards.length ? post.relatedCards.join(" / ") : "なし"}
- Like数: ${post.likes}
- 投稿者バッジ: ${badge.label}
- 投稿日時: ${formatKnowledgeDate(post.createdAt)}

### コメント

${post.comment}`;
    })
    .join("\n\n");
}

function buildSelectedKnowledgeMarkdown() {
  const { posts, missingKeys } = resolveReferencedKnowledgePosts();
  const sections = posts.map((post) => {
    const badge = badgeForKnowledgeAuthor(post.badgeTier || post.authorScore);
    return `## ${formatKnowledgeId(post)} ${post.title}

- 種別: ${post.visibility === "private" ? "秘蔵ナレッジ" : "公開ナレッジ"}
- 観点: ${VIEWPOINT_LABELS[post.viewpoint] || "ブック"}
- 関連カード: ${post.relatedCards.length ? post.relatedCards.join(" / ") : "なし"}
- Like数: ${post.likes}
- 投稿者バッジ: ${badge.label}
- 投稿日時: ${formatKnowledgeDate(post.createdAt)}

### コメント

${post.comment}`;
  });
  if (missingKeys.length) {
    sections.push(`## 未取得の指定ナレッジID

${missingKeys.map((key) => `- ${key}`).join("\n")}`);
  }
  return sections.join("\n\n") || "- 指定された公開ナレッジ・秘蔵ナレッジはありません。";
}

function publicKnowledgeUrl() {
  return new URL("./ai/knowledge/public.md", location.href).href;
}

function aiReferenceLinksMarkdown() {
  return AI_REFERENCES.map((ref) => `- ${ref.label}: ${absoluteUrl(ref.url)}`).join("\n");
}

function privateKnowledgeShareUrl(token) {
  return `${shareContextUrl(token)}#private-knowledge`;
}

function shareContextUrl(token) {
  const url = new URL(`./ai/dossier/${encodeURIComponent(token)}.md`, location.href);
  return url.href;
}

function buildBookElementSummary() {
  const elements = ["無", "火", "水", "地", "風"];
  const rows = elements.map((element) => {
    const cards = state.cards.filter((card) => card.element === element && Number(card.book || 0) > 0);
    const kinds = cards.length;
    const copies = cards.reduce((sum, card) => sum + Number(card.book || 0), 0);
    return `${element}:${kinds}種${copies}枚`;
  });
  const itemCopies = state.cards
    .filter((card) => card.category === "アイテム" && Number(card.book || 0) > 0)
    .reduce((sum, card) => sum + Number(card.book || 0), 0);
  const spellCopies = state.cards
    .filter((card) => card.category === "スペル" && Number(card.book || 0) > 0)
    .reduce((sum, card) => sum + Number(card.book || 0), 0);
  return `${rows.join(" / ")} / アイテム:${itemCopies}枚 / スペル:${spellCopies}枚`;
}

function cardContextLine(card) {
  const atHp = card.category === "クリーチャー" ? `${card.st}/${card.hp}` : "-";
  return `${card.name} / カテゴリ:${card.category} / 属性:${card.element} / レアリティ:${card.rarity || "-"} / 種別:${card.kind} / コスト:${card.cost} / AT/HP:${atHp} / 配置制限:${card.placementRestriction} / 使用制限:${card.usageRestriction} / 効果:${card.effect}`;
}

async function saveRemoteKnowledgePost({ title, viewpoint, relatedCards, comment, visibility }) {
  if (!supabaseClient || !state.supabaseUser?.id) return null;
  const { data, error } = await supabaseClient
    .from("knowledge_posts")
    .insert({
      author_id: state.supabaseUser.id,
      title,
      viewpoint,
      comment,
      visibility,
    })
    .select("id,public_no,created_at")
    .single();
  if (error) throw error;
  const relatedRows = relatedCards.map((cardId, index) => ({
    post_id: data.id,
    position: index + 1,
    card_id: cardId,
  }));
  if (relatedRows.length) {
    const { error: relatedError } = await supabaseClient.from("knowledge_related_cards").insert(relatedRows);
    if (relatedError) throw relatedError;
  }
  return data;
}

function setMobilePane(paneName, options = {}) {
  const validPane = mobileTabs.some((button) => button.dataset.mobileTab === paneName) ? paneName : "book";
  document.body.dataset.mobilePane = validPane;
  document.body.classList.add("mobile-tabs-ready");
  mobileTabs.forEach((button) => {
    const isActive = button.dataset.mobileTab === validPane;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  mobilePanes.forEach((pane) => {
    pane.classList.toggle("mobile-pane-active", pane.dataset.mobilePane === validPane);
  });
  if (options.scroll !== false && mobilePaneMedia.matches) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function syncMobilePaneLayout(options = {}) {
  if (mobilePaneMedia.matches) {
    setMobilePane(document.body.dataset.mobilePane || "book", { scroll: false });
    if (options.scroll) window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  document.body.classList.remove("mobile-tabs-ready");
  mobilePanes.forEach((pane) => pane.classList.remove("mobile-pane-active"));
  if (options.scroll) window.scrollTo({ top: 0, behavior: "auto" });
}

function visibleCards() {
  return state.cards.filter((card) => {
    const matchesTab = card.tab === state.activeTab;
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "book" && Number(card.book) > 0) ||
      (state.filter === "owned" && Number(card.owned) > 0);
    const haystack = `${card.name} ${card.effect} ${card.cost} ${card.rarity} ${card.category}`;
    return matchesTab && matchesFilter && haystack.includes(state.query);
  });
}

function renderCards() {
  const cards = visibleCards();
  const countControl = (card, type, value, label) => `
    <div class="count-control" data-count-control>
      <div class="range-count mobile-count-control">
        <span class="range-value">${value}</span>
        <div class="thumb-slider" aria-label="${escapeHtml(label)}" role="slider" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${Math.min(4, Number(value || 0))}">
          <div class="thumb-slider-track" aria-hidden="true"></div>
          <button class="thumb-slider-thumb" data-drag-${type}="${card.id}" type="button" aria-label="${escapeHtml(label)}をドラッグで変更" style="left: ${Math.min(4, Number(value || 0)) * 25}%"></button>
        </div>
      </div>
      <div class="stepper-count desktop-count-control">
        <button class="count-step" data-step-${type}="${card.id}" data-delta="-1" type="button" aria-label="${escapeHtml(label)}を1減らす">-</button>
        <input class="table-count-number" aria-label="${escapeHtml(label)}" data-${type}="${card.id}" type="number" inputmode="numeric" min="0" max="4" value="${Math.min(4, Number(value || 0))}" />
        <button class="count-step" data-step-${type}="${card.id}" data-delta="1" type="button" aria-label="${escapeHtml(label)}を1増やす">+</button>
      </div>
    </div>
  `;
  els.cardGrid.innerHTML = `
    <div class="card-table-wrap">
      <table class="card-table">
        <thead>
          <tr>
            <th>カード名</th>
            <th>属性</th>
            <th>レアリティ</th>
            <th>コスト</th>
            <th>AT</th>
            <th>HP</th>
            <th>配置制限</th>
            <th>使用制限</th>
            <th>能力・効果</th>
            <th>所持</th>
            <th>ブック</th>
          </tr>
        </thead>
        <tbody>
          ${cards
            .map(
              (card) => `
                <tr>
                  <td class="name-cell">
                    <button class="mobile-card-toggle" data-toggle-card-meta="${card.id}" type="button">${escapeHtml(card.name)}</button>
                    <span class="desktop-card-name">${escapeHtml(card.name)}</span>
                    <div class="mobile-card-meta">
                      <dl>
                        <div><dt>属性</dt><dd>${renderCategoryOrElement(card)}</dd></div>
                        <div><dt>レアリティ</dt><dd>${renderRarityIcon(card.rarity)}</dd></div>
                        <div><dt>コスト</dt><dd>${renderCost(card.cost)}</dd></div>
                        <div><dt>AT</dt><dd>${card.st}</dd></div>
                        <div><dt>HP</dt><dd>${card.hp}</dd></div>
                        <div><dt>配置制限</dt><dd>${renderPlacementRestriction(card.placementRestriction)}</dd></div>
                        <div><dt>使用制限</dt><dd>${renderUsageRestriction(card.usageRestriction)}</dd></div>
                      </dl>
                      <p>${renderEffect(card.effect)}</p>
                    </div>
                  </td>
                  <td class="icon-cell" data-label="属性">${renderCategoryOrElement(card)}</td>
                  <td class="icon-cell" data-label="レアリティ">${renderRarityIcon(card.rarity)}</td>
                  <td class="cost-cell" data-label="コスト">${renderCost(card.cost)}</td>
                  <td class="number-cell" data-label="AT">${card.st}</td>
                  <td class="number-cell" data-label="HP">${card.hp}</td>
                  <td class="icon-cell" data-label="配置制限">${renderPlacementRestriction(card.placementRestriction)}</td>
                  <td class="icon-cell" data-label="使用制限">${renderUsageRestriction(card.usageRestriction)}</td>
                  <td class="effect-cell" data-label="能力・効果">${renderEffect(card.effect)}</td>
                  <td data-label="所持">
                    ${countControl(card, "owned", card.owned, `${card.name}の所持枚数`)}
                  </td>
                  <td data-label="ブック">
                    ${countControl(card, "book", card.book, `${card.name}のブック投入枚数`)}
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCategoryOrElement(card) {
  if (card.category === "アイテム") return iconImg(CATEGORY_ICONS.item, "アイテム");
  if (card.category === "スペル") return iconImg(CATEGORY_ICONS.spell, "スペル");
  return renderElementIcon(card.element);
}

function getTotals() {
  const bookCount = state.cards.reduce((sum, card) => sum + Number(card.book || 0), 0);
  const ownedTotal = state.cards.reduce((sum, card) => sum + Number(card.owned || 0), 0);
  const usedKinds = state.cards.filter((card) => Number(card.book || 0) > 0).length;
  const missingCount = state.cards.reduce((sum, card) => {
    return sum + Math.max(0, Number(card.book || 0) - Number(card.owned || 0));
  }, 0);
  return { bookCount, ownedTotal, usedKinds, missingCount };
}

function countBy(predicate) {
  const cards = state.cards.filter((card) => Number(card.book || 0) > 0 && predicate(card));
  const kinds = cards.length;
  const copies = cards.reduce((sum, card) => sum + Number(card.book || 0), 0);
  return { kinds, copies };
}

function renderBookBreakdown() {
  const activeBook = getActiveBook();
  const rows = [
    { label: "クリーチャー", iconHtml: renderElementIcon("複"), ...countBy((card) => card.category === "クリーチャー") },
    { label: "無属性", depth: 1, iconHtml: renderElementIcon("無"), ...countBy((card) => card.element === "無") },
    { label: "火属性", depth: 1, iconHtml: renderElementIcon("火"), ...countBy((card) => card.element === "火") },
    { label: "水属性", depth: 1, iconHtml: renderElementIcon("水"), ...countBy((card) => card.element === "水") },
    { label: "地属性", depth: 1, iconHtml: renderElementIcon("地"), ...countBy((card) => card.element === "地") },
    { label: "風属性", depth: 1, iconHtml: renderElementIcon("風"), ...countBy((card) => card.element === "風") },
    { label: "アイテム", iconHtml: iconImg(CATEGORY_ICONS.item, "アイテム"), ...countBy((card) => card.category === "アイテム") },
    { label: "スペル", iconHtml: iconImg(CATEGORY_ICONS.spell, "スペル"), ...countBy((card) => card.category === "スペル") },
  ];
  const rarityRows = ["N", "S", "R", "E"].map((rarity) => ({
    label: rarity,
    iconHtml: renderRarityIcon(rarity),
    ...countBy((card) => card.rarity === rarity),
  }));

  els.bookBreakdown.innerHTML = `
    <div class="book-panel-title">ブック情報</div>
    <div class="book-line book-total">
      <span>ブック ${escapeHtml(activeBook?.name || DEFAULT_BOOK_NAME)}</span>
      <strong>${getTotals().usedKinds}種 ${getTotals().bookCount}枚</strong>
    </div>
    ${rows
      .map(
        (row) => `
          <div class="book-line ${row.depth ? "book-line-child" : ""}">
            <span><i>${row.iconHtml}</i>${row.label}</span>
            <strong>${row.kinds} / ${row.copies}</strong>
          </div>
        `,
      )
      .join("")}
    <div class="rarity-grid">
      ${rarityRows
        .map(
          (row) => `
            <div class="rarity-item ${row.copies === 0 ? "muted-rarity" : ""}">
              <span>${row.iconHtml}</span>
              <strong>${row.kinds} / ${row.copies}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function selectedCards() {
  return state.cards.filter((card) => Number(card.owned || 0) > 0 || Number(card.book || 0) > 0);
}

function compactCardLine(card, copiesLabel = "") {
  const atHp = card.category === "クリーチャー" ? `${card.st}/${card.hp}` : "-";
  const copies = copiesLabel ? ` ${copiesLabel}` : "";
  return `- ${card.name}${copies} / ${card.category} / 属性:${card.element} / R:${card.rarity || "-"} / コスト:${card.cost} / AT/HP:${atHp} / 効果:${card.effect}`;
}

function buildPromptFallbackContext() {
  const { bookCount, ownedTotal, usedKinds, missingCount } = getTotals();
  const activeBook = getActiveBook();
  const bookCards = state.cards
    .filter((card) => Number(card.book || 0) > 0)
    .map((card) => compactCardLine(card, `x${card.book}`))
    .join("\n");
  const ownedCandidates = selectedCards()
    .filter((card) => Number(card.book || 0) === 0)
    .map((card) => compactCardLine(card, `所持:${card.owned}`))
    .join("\n");
  const referencedKnowledge = buildSelectedKnowledgeMarkdown();

  return `## 本文コンテキスト

### 相談対象
- ゲーム: カルドセプト ビギンズ
- 相談内容: ブック構築とプレイ方針
- ブック名: ${activeBook?.name || DEFAULT_BOOK_NAME}
- 投入枚数: ${bookCount} / ${BOOK_SIZE}
- 採用カード種類: ${usedKinds}
- 所持カード合計: ${ownedTotal}
- 所持不足の採用枚数: ${missingCount}
- 採用中の属性構成: ${buildBookElementSummary()}

### このブックのストラテジー・狙い
${els.skillText.value}

### 現在のブック内カード
${bookCards || "- まだカードが採用されていません。"}

### 所持しているが未採用の候補カード
${ownedCandidates || "- 未採用候補はありません。"}

### 採用したいナレッジ
${referencedKnowledge}

### 今回の質問
${els.questionText.value}`;
}

function buildDossierMarkdown({ selectedKnowledgeMarkdown = "" } = {}) {
  return `# Cepter Prompt Atelier AI Dossier

## 採用したいナレッジ
{#selected-knowledge}

${selectedKnowledgeMarkdown || "- 採用したいナレッジはありません。"}`;
}

function buildPrompt() {
  return `カルドセプト ビギンズのブック構築とストラテジーについて相談したいです。

以下の本文コンテキストをもとに、ブック構築とプレイ方針を助言してください。

${buildPromptFallbackContext()}

## 全カードデータベース
全カードのデータベースはこちらにあります。必要に応じて、カード効果や未所持カードの確認に参照してください。
${absoluteUrl("./cards-begins.html")}

## 情報の優先順位
1. プロンプト本文の相談者本人の情報（相談内容・ブック状況・所持カード・ストラテジー）
2. プロンプト本文中の採用したいナレッジ
3. ユーザー指定参考URL
4. 全カードデータベース

採用したいナレッジは、相談者本人のブック状況と矛盾しない範囲で重視してください。
ナレッジが本文のブック状況と矛盾する場合は、プロンプト本文の相談者本人の情報を優先してください。

## 回答形式
回答では、勝ち筋、抜く候補、足す候補、所持カードが足りない場合の代替案、プレイ中に意識することを分けて説明してください。
カード効果や所持枚数から判断できない部分は、推測で断定せず「確認したい点」として分けてください。`;
}

function randomShareToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function saveShareContext(context, { pagePath = "./share.html", urlFromToken } = {}) {
  if (supabaseClient) {
    const token = randomShareToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseClient.from("share_contexts").insert({
      token,
      user_id: state.supabaseUser?.id || null,
      context_md: context,
      expires_at: expiresAt,
    });
    if (!error) {
      if (urlFromToken) return urlFromToken(token);
      const shareUrl = new URL(pagePath, location.href);
      shareUrl.searchParams.set("t", token);
      return shareUrl.href;
    }
    console.warn("Supabase share context insert failed; falling back to local share API", error);
  }

  const response = await fetch("./api/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ context }),
  });
  if (!response.ok) {
    throw new Error("AIクエリURLを作成できませんでした。");
  }
  const payload = await response.json();
  return payload.url;
}

function updateSummary() {
  const { bookCount } = getTotals();
  [els.bookCount, els.stickyBookCount].forEach((item) => {
    if (item) item.textContent = bookCount;
  });
  [els.bookCountStatus, els.stickyBookCountStatus].forEach((item) => {
    if (!item) return;
    item.classList.toggle("book-count-ok", bookCount === BOOK_SIZE);
    item.classList.toggle("book-count-over", bookCount > BOOK_SIZE);
  });
  [els.bookMeter, els.stickyBookMeter].forEach((item) => {
    if (!item) return;
    item.classList.toggle("meter-over", bookCount > BOOK_SIZE);
    item.style.width = `${Math.min(100, (bookCount / BOOK_SIZE) * 100)}%`;
  });
  renderBookBreakdown();
  if (state.promptGenerated) {
    setPromptPreviewText(buildPrompt());
  } else {
    setPromptPreviewText("");
  }
}

async function makeShareUrl() {
  const context = buildDossierMarkdown({ selectedKnowledgeMarkdown: buildSelectedKnowledgeMarkdown() });
  const url = await saveShareContext(context, { pagePath: "./share.html", urlFromToken: shareContextUrl });
  state.shareUrl = url;
  state.privateKnowledgeUrl = `${url}#selected-knowledge`;
  state.promptGenerated = true;
  els.shareUrl.value = url;
  return url;
}

els.brandHome.addEventListener("click", (event) => {
  event.preventDefault();
  showScreen("landing", { smooth: true });
});

els.headerLogin.addEventListener("click", () => {
  showScreen("login", { smooth: true });
});

els.headerLogout.addEventListener("click", async () => {
  els.headerLogout.disabled = true;
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    }
    await applySupabaseSession(null);
    showScreen("landing", { smooth: true });
  } catch (error) {
    console.warn("logout failed", error);
    setAuthMessage(`ログアウトできませんでした: ${error.message}`);
    showScreen("login", { smooth: true });
  } finally {
    els.headerLogout.disabled = false;
  }
});

els.menuToggle.addEventListener("click", () => {
  toggleSiteMenu();
});

els.siteMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-target]");
  if (!button) return;
  const target = button.dataset.menuTarget;
  if (target === "landing" || target === "related" || target === "contact" || target === "knowledge") {
    showScreen(target, { smooth: true });
    closeSiteMenu();
    return;
  }
  showScreen("app", { scroll: false });
  const paneMap = {
    book: "book",
    strategy: "strategy",
    question: "question",
    prompt: "prompt",
  };
  const sectionMap = {
    book: "#book",
    strategy: "#mypage",
    question: "#context",
    prompt: "#context",
  };
  setMobilePane(paneMap[target] || "book", { scroll: false });
  closeSiteMenu();
  window.requestAnimationFrame(() => {
    if (mobilePaneMedia.matches) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    scrollToSection(sectionMap[target] || "#book");
  });
});

document.addEventListener("click", (event) => {
  if (els.siteMenu.hidden) return;
  if (event.target.closest("#siteMenu") || event.target.closest("#menuToggle")) return;
  closeSiteMenu();
});

els.startRegistration.addEventListener("click", () => {
  showScreen("register", { smooth: true });
});

els.startGuest.addEventListener("click", () => {
  enterApp({ registered: false });
});

els.startLogin?.addEventListener("click", () => {
  showScreen("login", { smooth: true });
});

els.backToLanding.addEventListener("click", () => {
  showScreen("landing", { smooth: true });
});

els.loginToRegistration.addEventListener("click", () => {
  showScreen("register", { smooth: true });
});

els.forgotPassword.addEventListener("click", async () => {
  if (!supabaseClient) {
    els.passwordResetNotice.hidden = false;
    return;
  }
  const email = els.loginName.value.trim();
  if (!email || !email.includes("@")) {
    setAuthMessage("パスワード再設定にはメールアドレスを入力してください。");
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname,
  });
  setAuthMessage(error ? `再設定メールを送れませんでした: ${error.message}` : "パスワード再設定メールを送信しました。");
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    enterApp({ registered: true, userName: els.loginName.value || "ログインユーザー" });
    return;
  }
  const email = els.loginName.value.trim();
  const password = els.loginPassword.value;
  if (!email || !password) {
    setAuthMessage("メールアドレスとパスワードを入力してください。");
    return;
  }
  setAuthMessage("ログイン中です...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthMessage(`ログインできませんでした: ${error.message}`);
    return;
  }
  showScreen("app");
  setAuthMessage("");
  applySupabaseSession(data.session).catch((sessionError) => {
    console.warn("post-login session apply failed", sessionError);
    els.bookStatus.textContent = `ログイン後の読み込みに失敗しました: ${sessionError.message}`;
  });
});

els.registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    enterApp({ registered: true, userName: els.registerUserName.value || "登録ユーザー" });
    return;
  }
  const displayName = els.registerUserName.value.trim() || "登録ユーザー";
  const email = els.registerEmail.value.trim();
  const password = els.registerPassword.value;
  if (!email || !password) {
    setAuthMessage("メールアドレスとパスワードを入力してください。", "register");
    return;
  }
  setAuthMessage("登録中です...", "register");
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: location.origin + location.pathname,
    },
  });
  if (error) {
    setAuthMessage(`登録できませんでした: ${error.message}`, "register");
    return;
  }
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    setAuthMessage("このメールアドレスは既に登録済みです。ログイン画面からログインしてください。", "register");
    return;
  }
  if (data.user) await upsertProfileForUser(data.user, displayName);
  if (data.session) {
    await applySupabaseSession(data.session);
    setAuthMessage("", "register");
    showScreen("app");
    return;
  }
  setAuthMessage(
    "確認メールを送信しました。メールが届かない場合は、既に登録済みの可能性があります。ログイン画面からログインしてください。",
    "register",
  );
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderCards();
  });
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.activeTab = button.dataset.tab;
    renderCards();
    if (mobilePaneMedia.matches) {
      requestAnimationFrame(scrollCardsBelowStickyTabs);
    }
  });
});

mobileTabs.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.mobileTab === "knowledge") {
      showScreen("knowledge", { smooth: true });
      setMobilePane("knowledge", { scroll: false });
      return;
    }
    showScreen("app", { scroll: false });
    setMobilePane(button.dataset.mobileTab);
  });
});

if (mobilePaneMedia.addEventListener) {
  mobilePaneMedia.addEventListener("change", () => syncMobilePaneLayout({ scroll: true }));
} else {
  mobilePaneMedia.addListener(() => syncMobilePaneLayout({ scroll: true }));
}

window.addEventListener("resize", () => {
  window.clearTimeout(mobilePaneResizeTimer);
  mobilePaneResizeTimer = window.setTimeout(() => syncMobilePaneLayout(), 120);
});

els.cardSearch.addEventListener("input", () => {
  state.query = els.cardSearch.value.trim();
  renderCards();
});

els.cardGrid.addEventListener("input", (event) => {
  const ownedId = event.target.dataset.owned;
  const bookId = event.target.dataset.book;
  const id = ownedId || bookId;
  if (!id) return;
  updateCardCount(id, ownedId ? "owned" : "book", event.target.value, event.target);
});

function updateCardCount(id, field, value, sourceElement, options = {}) {
  const card = state.cards.find((item) => item.id === id);
  if (!card) return;
  const nextValue = Math.min(4, Math.max(0, Number(value || 0)));
  const previousValue = Number(card[field] || 0);
  card[field] = nextValue;
  sourceElement?.closest("[data-count-control]")?.querySelectorAll("input").forEach((input) => {
    input.value = nextValue;
  });
  sourceElement?.closest("[data-count-control]")?.querySelectorAll(".range-value").forEach((item) => {
    item.textContent = nextValue;
  });
  sourceElement?.closest("[data-count-control]")?.querySelectorAll(".thumb-slider").forEach((slider) => {
    slider.setAttribute("aria-valuenow", String(nextValue));
  });
  sourceElement?.closest("[data-count-control]")?.querySelectorAll(".thumb-slider-thumb").forEach((thumb) => {
    thumb.style.left = `${nextValue * 25}%`;
  });
  captureActiveBookFromCards();
  if (!options.skipPending && previousValue !== nextValue) setPendingCardChanges(true);
  persistAppState({ sync: false });
  updateSummary();
}

els.applyBookChanges?.addEventListener("click", async () => {
  if (!pendingCardChanges) return;
  els.applyBookChanges.disabled = true;
  els.applyBookChanges.textContent = "反映中...";
  try {
    captureActiveBookFromCards();
    captureOwnedFromCards();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        skillText: els.skillText.value,
        knowledgeReferenceIds: state.isRegistered ? normalizeKnowledgeReferenceText(els.knowledgeReferenceIds?.value) : "",
        questionText: els.questionText.value,
        currentBookId: state.currentBookId,
        ownedByCardId: state.ownedByCardId,
        books: state.books,
        initialDataVersion: INITIAL_DATA_VERSION,
        isRegistered: state.isRegistered,
        userName: state.userName,
        knowledgePosts: state.knowledgePosts,
        likedKnowledgeIds: state.likedKnowledgeIds,
      }),
    );
    if (state.isRegistered && supabaseClient && state.supabaseUser?.id && state.remoteReady) {
      await saveRemoteUserData();
      els.bookStatus.textContent = "ブック枚数をSupabaseへ反映しました。";
    } else {
      els.bookStatus.textContent = "ブック枚数をこの端末に反映しました。";
    }
    setPendingCardChanges(false);
  } catch (error) {
    console.warn("apply book changes failed", error);
    els.bookStatus.textContent = `ブック枚数を反映できませんでした: ${error.message}`;
  } finally {
    els.applyBookChanges.disabled = false;
    els.applyBookChanges.textContent = "ブックに反映する";
  }
});

document.querySelector("[data-knowledge-list-link]")?.addEventListener("click", (event) => {
  event.preventDefault();
  showScreen("knowledge", { smooth: true });
});

els.cardGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step-owned], [data-step-book]");
  if (!button) return;
  const ownedId = button.dataset.stepOwned;
  const bookId = button.dataset.stepBook;
  const id = ownedId || bookId;
  const field = ownedId ? "owned" : "book";
  const card = state.cards.find((item) => item.id === id);
  if (!card) return;
  updateCardCount(id, field, Number(card[field] || 0) + Number(button.dataset.delta || 0), button);
});

function sliderValueFromPointer(slider, clientX) {
  const rect = slider.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
  return Math.min(4, Math.max(0, Math.round(ratio * 4)));
}

els.cardGrid.addEventListener("pointerdown", (event) => {
  const thumb = event.target.closest(".thumb-slider-thumb");
  if (thumb) {
    const ownedId = thumb.dataset.dragOwned;
    const bookId = thumb.dataset.dragBook;
    const id = ownedId || bookId;
    const field = ownedId ? "owned" : "book";
    const slider = thumb.closest(".thumb-slider");
    if (!id || !slider) return;
    event.preventDefault();
    thumb.setPointerCapture?.(event.pointerId);
    const move = (moveEvent) => {
      updateCardCount(id, field, sliderValueFromPointer(slider, moveEvent.clientX), thumb);
    };
    const stop = () => {
      thumb.removeEventListener("pointermove", move);
      thumb.removeEventListener("pointerup", stop);
      thumb.removeEventListener("pointercancel", stop);
      thumb.releasePointerCapture?.(event.pointerId);
    };
    thumb.addEventListener("pointermove", move);
    thumb.addEventListener("pointerup", stop);
    thumb.addEventListener("pointercancel", stop);
    return;
  }

  const button = event.target.closest("[data-toggle-card-meta]");
  if (!button) return;
  button.closest("tr")?.classList.add("press-card-meta");
});

["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
  els.cardGrid.addEventListener(eventName, () => {
    els.cardGrid.querySelectorAll(".press-card-meta").forEach((row) => row.classList.remove("press-card-meta"));
  });
});

[els.displayName, els.skillText, els.knowledgeReferenceIds, els.questionText].filter(Boolean).forEach((input) => {
  input.addEventListener("input", () => {
    if (input === els.knowledgeReferenceIds) {
      writeKnowledgeReferenceInputToStrategy();
      renderKnowledgePosts();
    }
    if (input === els.skillText) {
      const activeBook = getActiveBook();
      if (activeBook) {
        activeBook.skillText = ensureProfileHeadings(els.skillText.value);
        activeBook.knowledgeReferenceIds = normalizeKnowledgeReferenceText(els.knowledgeReferenceIds?.value);
      }
      syncKnowledgeReferenceInputFromStrategy();
      renderKnowledgePosts();
    }
    persistAppState();
    updateSummary();
  });
});

els.copyStrategyFromBook.addEventListener("click", () => {
  const sourceBook = state.books.find((book) => book.id === els.strategyCopySource.value);
  if (!sourceBook) return;
  els.skillText.value = ensureProfileHeadings(sourceBook.skillText || els.skillText.value);
  els.knowledgeReferenceIds.value = normalizeKnowledgeReferenceText(sourceBook.knowledgeReferenceIds || extractKnowledgeReferenceMetadata(sourceBook.skillText));
  const activeBook = getActiveBook();
  if (activeBook) {
    activeBook.skillText = els.skillText.value;
    activeBook.knowledgeReferenceIds = normalizeKnowledgeReferenceText(els.knowledgeReferenceIds.value);
  }
  renderKnowledgePosts();
  persistAppState();
  updateSummary();
});

els.registeredMode.addEventListener("change", () => {
  state.isRegistered = Boolean(els.registeredMode.checked);
  updateKnowledgeMode();
  renderAuthState();
  renderKnowledgePosts();
  persistAppState();
});

els.knowledgeComposeToggle.addEventListener("click", () => {
  const panel = document.querySelector(".knowledge-panel");
  panel.classList.toggle("compose-open");
  if (panel.classList.contains("compose-open")) {
    els.knowledgeTitle.focus();
  }
});

els.knowledgeComposeClose.addEventListener("click", () => {
  document.querySelector(".knowledge-panel")?.classList.remove("compose-open");
});

els.knowledgeSearch.addEventListener("input", () => {
  state.knowledgeQuery = els.knowledgeSearch.value.trim();
  renderKnowledgePosts();
});

document.querySelectorAll("[data-knowledge-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    setKnowledgeFilter(button.dataset.knowledgeFilter);
  });
});

els.knowledgeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.isRegistered) {
    els.knowledgeStatus.textContent = "投稿するにはログインが必要です。";
    return;
  }
  const title = els.knowledgeTitle.value.trim();
  const comment = els.knowledgeComment.value.trim();
  if (!title || !comment) {
    els.knowledgeStatus.textContent = "タイトルとコメントを入力してください。";
    return;
  }
  const relatedCards = [els.knowledgeCard1.value, els.knowledgeCard2.value, els.knowledgeCard3.value]
    .map((value) => value.trim())
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .slice(0, 3);
  let remotePost = null;
  if (supabaseClient && state.supabaseUser?.id) {
    try {
      remotePost = await saveRemoteKnowledgePost({
        title,
        viewpoint: els.knowledgeViewpoint.value,
        relatedCards,
        comment,
        visibility: els.knowledgeVisibility.value,
      });
    } catch (error) {
      els.knowledgeStatus.textContent = `ナレッジを保存できませんでした: ${error.message}`;
      return;
    }
  }
  const post = normalizeKnowledgePost({
    id: remotePost?.id || `knowledge-${Date.now().toString(36)}`,
    publicNo: remotePost?.public_no,
    title,
    viewpoint: els.knowledgeViewpoint.value,
    relatedCards,
    comment,
    visibility: els.knowledgeVisibility.value,
    likes: 0,
    ownerId: "current-user",
    createdAt: remotePost?.created_at || new Date().toISOString(),
  });
  state.knowledgePosts.unshift(post);
  els.knowledgeForm.reset();
  els.knowledgeViewpoint.value = "book";
  els.knowledgeVisibility.value = "public";
  els.knowledgeStatus.textContent =
    post.visibility === "public" ? "公開ナレッジに投稿しました。" : "秘蔵ナレッジに保存しました。";
  document.querySelector(".knowledge-panel")?.classList.remove("compose-open");
  if (post.visibility === "private") {
    setKnowledgeFilter("private");
  } else {
    renderKnowledgePosts();
  }
  if (supabaseClient) await loadRemoteKnowledgePosts();
  persistAppState();
  updateSummary();
});

els.knowledgeList.addEventListener("click", async (event) => {
  const referenceButton = event.target.closest("[data-reference-knowledge]");
  if (referenceButton) {
    const post = state.knowledgePosts.find((item) => item.id === referenceButton.dataset.referenceKnowledge);
    if (post) toggleKnowledgeReference(post);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-knowledge]");
  if (deleteButton) {
    const id = deleteButton.dataset.deleteKnowledge;
    const post = state.knowledgePosts.find((item) => item.id === id);
    if (!post || post.ownerId !== "current-user") return;
    if (supabaseClient && isUuid(id)) {
      const { error } = await supabaseClient.from("knowledge_posts").delete().eq("id", id);
      if (error) {
        els.knowledgeStatus.textContent = `ナレッジを削除できませんでした: ${error.message}`;
        return;
      }
    }
    state.knowledgePosts = state.knowledgePosts.filter((item) => item.id !== id);
    state.likedKnowledgeIds = state.likedKnowledgeIds.filter((item) => item !== id);
    renderKnowledgePosts();
    persistAppState();
    updateSummary();
    return;
  }
  const button = event.target.closest("[data-like-knowledge]");
  if (!button) return;
  const id = button.dataset.likeKnowledge;
  const post = state.knowledgePosts.find((item) => item.id === id);
  if (!post) return;
  if (supabaseClient && isUuid(id) && post.visibility === "public") {
    const { data, error } = await supabaseClient.rpc("toggle_knowledge_like", {
      p_post_id: id,
      p_guest_key: state.supabaseUser?.id ? null : guestKey(),
    });
    if (error) {
      els.knowledgeStatus.textContent = `Likeできませんでした: ${error.message}`;
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (result?.liked) {
      if (!state.likedKnowledgeIds.includes(id)) state.likedKnowledgeIds.push(id);
    } else {
      state.likedKnowledgeIds = state.likedKnowledgeIds.filter((item) => item !== id);
    }
    post.likes = Number(result?.likes_count ?? post.likes ?? 0);
    await loadRemoteKnowledgePosts();
    renderKnowledgePosts();
    persistAppState();
    updateSummary();
    return;
  }
  const liked = state.likedKnowledgeIds.includes(id);
  if (liked) {
    state.likedKnowledgeIds = state.likedKnowledgeIds.filter((item) => item !== id);
    post.likes = Math.max(0, Number(post.likes || 0) - 1);
    post.authorScore = Math.max(0, Number(post.authorScore || 0) - 1);
  } else {
    state.likedKnowledgeIds.push(id);
    post.likes = Number(post.likes || 0) + 1;
    post.authorScore = Number(post.authorScore || 0) + 1;
  }
  renderKnowledgePosts();
  persistAppState();
  updateSummary();
});

els.savedBookSelect.addEventListener("change", () => {
  captureActiveBookFromCards();
  state.currentBookId = els.savedBookSelect.value;
  applyActiveBookToCards();
  closeBookRegistration();
  renderBookSelect();
  renderCards();
  persistAppState();
  updateSummary();
});

els.deleteBook.addEventListener("click", async () => {
  if (state.books.length <= 1) {
    els.bookStatus.textContent = "最後のブックは削除できません。";
    return;
  }
  const activeBook = getActiveBook();
  if (supabaseClient && state.supabaseUser?.id && isUuid(activeBook?.id)) {
    const { error } = await supabaseClient.from("books").delete().eq("id", activeBook.id);
    if (error) {
      els.bookStatus.textContent = `ブックを削除できませんでした: ${error.message}`;
      return;
    }
  }
  state.books = state.books.filter((book) => book.id !== state.currentBookId);
  state.currentBookId = state.books[0]?.id || DEFAULT_BOOK_ID;
  applyActiveBookToCards();
  closeBookRegistration();
  renderBookSelect();
  renderCards();
  persistAppState();
  updateSummary();
  els.bookStatus.textContent = `${activeBook?.name || "ブック"}を削除しました。`;
});

els.newBook.addEventListener("click", () => {
  openBookRegistration();
});

els.cancelBookRegistration.addEventListener("click", () => {
  closeBookRegistration();
});

els.saveBook.addEventListener("click", () => {
  captureActiveBookFromCards();
  const nextIndex = state.books.length + 1;
  const name = els.bookName.value.trim() || `新しいブック ${nextIndex}`;
  const book = {
    id: crypto.randomUUID(),
    name,
    cards: {},
    skillText: emptySkillText(),
    knowledgeReferenceIds: "",
  };
  state.books.push(book);
  state.currentBookId = book.id;
  applyActiveBookToCards();
  closeBookRegistration();
  renderBookSelect();
  renderCards();
  persistAppState();
  updateSummary();
  els.bookStatus.textContent = "ブックを登録しました。";
});

els.makeShareUrl.addEventListener("click", async () => {
  try {
    await makeShareUrl();
    state.promptEdited = false;
    setPromptPreviewText(buildPrompt(), { force: true });
    els.copyStatus.textContent = "プロンプトを生成しました。";
  } catch (error) {
    els.copyStatus.textContent = "プロンプトを生成できませんでした。ローカルサーバーが起動しているか確認してください。";
  }
});

els.copyPrompt.addEventListener("click", async () => {
  if (!state.promptGenerated) {
    els.copyStatus.textContent = "先にプロンプト生成を押してください。";
    return;
  }
  const prompt = els.promptPreview.value || buildPrompt();
  try {
    await navigator.clipboard.writeText(prompt);
    els.copyStatus.textContent = "プロンプトをコピーしました。";
  } catch {
    els.copyStatus.textContent = "コピーできませんでした。下の文を選択してコピーしてください。";
  }
});

els.promptPreview.addEventListener("input", () => {
  if (state.promptGenerated) state.promptEdited = true;
});

hydrateStaticIcons();

loadCards().then(async () => {
  await loadInitialBookData();
  initializeStoredState();
  const hasSupabaseSession = await initializeSupabaseAuth();
  await loadRemoteKnowledgePosts();
  renderAuthState();
  showScreen(hasSupabaseSession && isSupabaseAuthCallback() ? "app" : "landing", { scroll: false });
  syncMobilePaneLayout();
  renderCards();
  updateSummary();
});
