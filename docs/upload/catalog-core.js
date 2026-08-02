/** Shared catalog helpers for 灣蛋配送站 */
window.CatalogCore = (() => {
  const CAT_LABEL = {
    history: "歷史與怪談",
    food: "美食與生活",
    geo: "地理與奇葩",
  };
  const CAT_CLASS = { history: "cat-history", food: "cat-food", geo: "cat-geo" };
  const NEED = [
    "id",
    "title",
    "content",
    "category",
    "sourceName",
    "sourceURL",
    "funFactValue",
  ];
  const ALLOWED = new Set(["history", "food", "geo"]);
  const BAD = /<\s*script|javascript:|onerror\s*=|onload\s*=/i;

  function titleKey(text) {
    return String(text || "")
      .split("")
      .filter((ch) => /[0-9a-zA-Z\u4e00-\u9fff]/.test(ch))
      .join("")
      .toLowerCase();
  }

  function catLabel(c) {
    return CAT_LABEL[c] || c;
  }

  function catClass(c) {
    return CAT_CLASS[c] || "";
  }

  function suspicious(text) {
    return BAD.test(String(text || ""));
  }

  function validateCatalog(data, live) {
    const errors = [];
    const rootKeys = Object.keys(data).sort().join(",");
    if (rootKeys !== "cards,updatedAt,version") {
      errors.push("根物件只能有 version、updatedAt、cards");
    }
    if (typeof data.version !== "number" || !Number.isFinite(data.version)) {
      errors.push("version 必須是數字");
    }
    if (typeof data.updatedAt !== "string" || !data.updatedAt) {
      errors.push("updatedAt 必須是非空字串");
    }
    if (!Array.isArray(data.cards)) {
      errors.push("cards 必須是陣列");
      return errors;
    }
    const ids = new Set();
    data.cards.forEach((c, i) => {
      if (!c || typeof c !== "object") {
        errors.push(`cards[${i}] 不是物件`);
        return;
      }
      const keys = new Set(Object.keys(c));
      if (keys.size !== NEED.length || NEED.some((k) => !keys.has(k))) {
        errors.push(`卡片 ${c.id || i} 欄位必須剛好為七個標準鍵`);
      }
      if (!c.id || typeof c.id !== "string") errors.push(`卡片 #${i} 缺編號`);
      else if (ids.has(c.id)) errors.push(`重複編號：${c.id}`);
      else ids.add(c.id);
      if (!ALLOWED.has(c.category)) {
        errors.push(`${c.id || i} 種類只能是三種固定值`);
      }
      if (c.sourceURL !== null && typeof c.sourceURL !== "string") {
        errors.push(`${c.id || i} 來源網址格式錯誤`);
      }
      if (c.sourceURL === "") {
        errors.push(`${c.id || i} 來源網址請留空（null）勿用空字串`);
      }
      ["title", "content", "funFactValue", "sourceName"].forEach((f) => {
        if (typeof c[f] === "string" && suspicious(c[f])) {
          errors.push(`${c.id || i} ${f} 含可疑內容`);
        }
      });
    });
    if (live) {
      const liveCount = Array.isArray(live.cards) ? live.cards.length : 0;
      const liveVersion =
        typeof live.version === "number" ? live.version : -Infinity;
      if (data.cards.length < liveCount) {
        errors.push(`張數不可變少（線上 ${liveCount} → ${data.cards.length}）`);
      }
      if (typeof data.version === "number" && data.version < liveVersion) {
        errors.push(`version 不可倒退（線上 ${liveVersion} → ${data.version}）`);
      }
    }
    return errors;
  }

  function buildIndex(catalog) {
    return {
      version: catalog.version,
      updatedAt: catalog.updatedAt,
      cardCount: catalog.cards.length,
      cards: catalog.cards.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        sourceName: c.sourceName,
        titleKey: titleKey(c.title),
      })),
    };
  }

  function cloneCatalog(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function nowUTC() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  function prepareForUpload(working, live) {
    const data = cloneCatalog(working);
    data.updatedAt = nowUTC();
    if (live && typeof live.version === "number") {
      if (data.version <= live.version) data.version = live.version + 1;
    }
    const errors = validateCatalog(data, live);
    return { data, errors, text: JSON.stringify(data, null, 2) + "\n" };
  }

  function genId(cards, category) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `od-web-${day}-${category}-`;
    let n = 1;
    const existing = new Set(cards.map((c) => c.id));
    while (existing.has(prefix + String(n).padStart(2, "0"))) n += 1;
    return prefix + String(n).padStart(2, "0");
  }

  function validateNewCard(card, catalog) {
    const errors = [];
    if (!card.title?.trim()) errors.push("請填標題");
    if (!card.content?.trim()) errors.push("請填內容");
    if (!card.funFactValue?.trim()) errors.push("請填趣味標籤");
    if (!card.sourceName?.trim()) errors.push("請選或填來源");
    if (!ALLOWED.has(card.category)) errors.push("請選擇種類");
    if (card.sourceURL) {
      if (!String(card.sourceURL).startsWith("https://")) {
        errors.push("來源網址須為 https:// 或留空");
      }
    }
    ["title", "content", "funFactValue", "sourceName"].forEach((f) => {
      if (suspicious(card[f])) errors.push(`${f} 含可疑內容`);
    });
    if (card.title && (card.title.length < 4 || card.title.length > 28)) {
      errors.push("標題建議 4–28 字");
    }
    if (card.content && (card.content.length < 20 || card.content.length > 160)) {
      errors.push("內容建議 20–160 字");
    }
    if (card.funFactValue && card.funFactValue.length > 16) {
      errors.push("趣味標籤建議 16 字以內");
    }
    const tk = titleKey(card.title);
    if (catalog.cards.some((c) => c.id === card.id)) errors.push("編號重複");
    if (catalog.cards.some((c) => titleKey(c.title) === tk)) {
      errors.push("標題與既有卡重複");
    }
    return errors;
  }

  function mergeDelta(base, delta) {
    if (
      !("baseVersion" in delta) &&
      delta.version != null &&
      Array.isArray(delta.cards) &&
      delta.cards.length > 40
    ) {
      throw new Error("這看起來像完整圖鑑，請使用增量檔（含 baseVersion）");
    }
    if (delta.baseVersion == null || !Array.isArray(delta.cards)) {
      throw new Error("增量檔需包含 baseVersion 與 cards");
    }
    if (delta.baseVersion !== base.version) {
      throw new Error(
        `baseVersion 不符（增量 ${delta.baseVersion}／目前 ${base.version}）`
      );
    }
    const out = cloneCatalog(base);
    const ids = new Set(out.cards.map((c) => c.id));
    const titles = new Set(out.cards.map((c) => titleKey(c.title)));
    const needKey = NEED.slice().sort().join(",");
    delta.cards.forEach((c, i) => {
      if (Object.keys(c).sort().join(",") !== needKey) {
        throw new Error(`增量第 ${i + 1} 張欄位不完整`);
      }
      if (!ALLOWED.has(c.category)) throw new Error(`增量第 ${i + 1} 種類錯誤`);
      if (c.sourceURL === "") throw new Error(`增量第 ${i + 1} 來源網址勿用空字串`);
      if (ids.has(c.id)) throw new Error(`編號重複：${c.id}`);
      if (titles.has(titleKey(c.title))) throw new Error(`標題重複：${c.title}`);
      ids.add(c.id);
      titles.add(titleKey(c.title));
      out.cards.push(c);
    });
    out.version = base.version + 1;
    out.updatedAt = nowUTC();
    return out;
  }

  function diffCatalogs(base, next) {
    const baseMap = new Map((base?.cards || []).map((c) => [c.id, c]));
    const nextMap = new Map((next?.cards || []).map((c) => [c.id, c]));
    const added = [];
    const removed = [];
    const changed = [];
    nextMap.forEach((c, id) => {
      if (!baseMap.has(id)) added.push(c);
      else {
        const o = baseMap.get(id);
        const fields = [];
        ["title", "content", "funFactValue", "sourceName", "category"].forEach(
          (f) => {
            if (o[f] !== c[f]) fields.push(f);
          }
        );
        if (fields.length) changed.push({ id, before: o, after: c, fields });
      }
    });
    baseMap.forEach((c, id) => {
      if (!nextMap.has(id)) removed.push(c);
    });
    return { added, removed, changed };
  }

  const FIELD_ZH = {
    title: "標題",
    content: "內容",
    funFactValue: "趣味標籤",
    sourceName: "來源",
    category: "種類",
  };

  return {
    CAT_LABEL,
    NEED,
    ALLOWED,
    catLabel,
    catClass,
    titleKey,
    validateCatalog,
    buildIndex,
    cloneCatalog,
    nowUTC,
    prepareForUpload,
    genId,
    validateNewCard,
    mergeDelta,
    diffCatalogs,
    FIELD_ZH,
  };
})();
