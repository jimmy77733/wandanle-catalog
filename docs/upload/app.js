(() => {
  const CFG = window.WANDANLE_UPLOAD;
  const Core = window.CatalogCore;
  if (!CFG || !Core) {
    console.error("missing upload config/core");
    return;
  }

  const GATE_KEY = "wandanle_upload_gate_ok";
  const PAT_KEY = "wandanle_upload_pat";
  const THEME_KEY = "wandanle_upload_theme";

  const $ = (id) => document.getElementById(id);

  const applyTheme = (theme) => {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) { /* ignore */ }
    const btn = $("theme-toggle");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        next === "dark" ? "切換為淺色主題" : "切換為深色主題"
      );
      btn.title = next === "dark" ? "淺色模式" : "深色模式";
    }
  };

  const currentTheme = () =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

  applyTheme(currentTheme());
  $("theme-toggle")?.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });
  const el = {
    gateCard: $("gate-card"),
    mainCard: $("main-card"),
    editorCard: $("editor-card"),
    publishCard: $("publish-card"),
    diffCard: $("diff-card"),
    histCard: $("hist-card"),
    gate: $("gate"),
    gateBtn: $("gate-btn"),
    gateStatus: $("gate-status"),
    drop: $("drop"),
    file: $("file"),
    dropDelta: $("drop-delta"),
    fileDelta: $("file-delta"),
    loadLiveBtn: $("load-live-btn"),
    stats: $("stats"),
    errors: $("errors"),
    workStatus: $("work-status"),
    publishStatus: $("publish-status"),
    addStatus: $("add-status"),
    pat: $("pat"),
    patToggle: $("pat-toggle"),
    uploadBtn: $("upload-btn"),
    clearPat: $("clear-pat"),
    statVersion: $("stat-version"),
    statCount: $("stat-count"),
    statDelta: $("stat-delta"),
    filterCat: $("filter-cat"),
    filterSource: $("filter-source"),
    filterQ: $("filter-q"),
    filterMeta: $("filter-meta"),
    cardList: $("card-list"),
    applyBtn: $("apply-btn"),
    dlWorkBtn: $("dl-work-btn"),
    openDiffBtn: $("open-diff-btn"),
    openHistBtn: $("open-hist-btn"),
    closeDiffBtn: $("close-diff-btn"),
    closeHistBtn: $("close-hist-btn"),
    diffList: $("diff-list"),
    diffMeta: $("diff-meta"),
    histList: $("hist-list"),
    sourceList: $("source-list"),
    addCat: $("add-cat"),
    addSource: $("add-source"),
    addUrl: $("add-url"),
    addTitle: $("add-title"),
    addContent: $("add-content"),
    addFact: $("add-fact"),
    addBtn: $("add-btn"),
  };

  let liveCatalog = null;
  let working = null;
  let baselineForDiff = null;
  let valid = false;
  let dirty = false;

  function showStatus(node, kind, text) {
    node.className = `status show ${kind}`;
    node.textContent = text;
  }
  function clearStatus(node) {
    node.className = "status";
    node.textContent = "";
  }

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function unlockMain() {
    el.gateCard.classList.add("hidden");
    el.mainCard.classList.remove("hidden");
    el.publishCard.classList.remove("hidden");
    sessionStorage.setItem(GATE_KEY, "1");
    const saved = sessionStorage.getItem(PAT_KEY);
    if (saved) el.pat.value = saved;
  }

  async function tryGate() {
    const hash = await sha256Hex(el.gate.value);
    if (hash !== CFG.gateHash) {
      showStatus(el.gateStatus, "bad", "站門密碼不正確。");
      return;
    }
    clearStatus(el.gateStatus);
    unlockMain();
  }

  if (sessionStorage.getItem(GATE_KEY) === "1") unlockMain();
  el.gateBtn.addEventListener("click", () => tryGate().catch((e) => showStatus(el.gateStatus, "bad", String(e))));
  el.gate.addEventListener("keydown", (e) => {
    if (e.key === "Enter") el.gateBtn.click();
  });

  function setPatVisible(show) {
    el.pat.type = show ? "text" : "password";
    el.patToggle.setAttribute("aria-pressed", show ? "true" : "false");
    el.patToggle.setAttribute("aria-label", show ? "隱藏 Token" : "顯示 Token");
    el.patToggle.querySelector(".eye-open")?.classList.toggle("hidden", show);
    el.patToggle.querySelector(".eye-shut")?.classList.toggle("hidden", !show);
  }
  el.pat.addEventListener("input", () => {
    if (el.pat.value) sessionStorage.setItem(PAT_KEY, el.pat.value);
    else sessionStorage.removeItem(PAT_KEY);
  });
  el.patToggle.addEventListener("click", () => setPatVisible(el.pat.type === "password"));
  el.clearPat.addEventListener("click", () => {
    el.pat.value = "";
    setPatVisible(false);
    sessionStorage.removeItem(PAT_KEY);
    showStatus(el.publishStatus, "info", "已清除此工作階段的 Token。");
  });

  function bindDrop(zone, input, handler) {
    ["dragenter", "dragover"].forEach((n) =>
      zone.addEventListener(n, (e) => {
        e.preventDefault();
        zone.classList.add("dragover");
      })
    );
    ["dragleave", "drop"].forEach((n) =>
      zone.addEventListener(n, (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
      })
    );
    zone.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files?.[0];
      if (f) handler(f);
    });
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f) handler(f);
    });
  }

  function readText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("讀檔失敗"));
      r.readAsText(file, "utf-8");
    });
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }

  async function fetchLive() {
    const urls = [CFG.liveCatalogURL, CFG.liveCatalogFallbackURL];
    let last;
    for (const url of urls) {
      try {
        return await fetchJSON(url);
      } catch (e) {
        last = e;
      }
    }
    throw last || new Error("無法取得線上圖鑑");
  }

  function setStat(node, value, kind) {
    node.className = `stat${kind ? ` ${kind}` : ""}`;
    node.querySelector(".n").textContent = value;
  }

  function updateStats(data) {
    el.stats.hidden = false;
    const count = data.cards.length;
    const liveCount = liveCatalog ? liveCatalog.cards.length : null;
    const delta = liveCount == null ? "—" : String(count - liveCount);
    setStat(el.statVersion, data.version, "ok");
    setStat(el.statCount, count, "ok");
    setStat(
      el.statDelta,
      delta,
      liveCount == null ? "warn" : count - liveCount >= 0 ? "ok" : "bad"
    );
  }

  function fillSourceFilters() {
    const sources = [...new Set(working.cards.map((c) => c.sourceName))].sort((a, b) =>
      a.localeCompare(b, "zh-Hant")
    );
    const cur = el.filterSource.value;
    el.filterSource.innerHTML = `<option value="">全部來源</option>`;
    sources.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      el.filterSource.appendChild(opt);
    });
    if (sources.includes(cur)) el.filterSource.value = cur;
    el.sourceList.innerHTML = "";
    sources.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      el.sourceList.appendChild(opt);
    });
  }

  function collectEditsFromDOM() {
    if (!working) return;
    el.cardList.querySelectorAll(".egg-card").forEach((node) => {
      const id = node.dataset.id;
      const card = working.cards.find((c) => c.id === id);
      if (!card) return;
      const title = node.querySelector('[data-f="title"]')?.value;
      const content = node.querySelector('[data-f="content"]')?.value;
      const fact = node.querySelector('[data-f="funFactValue"]')?.value;
      if (title != null) card.title = title.trim();
      if (content != null) card.content = content.trim();
      if (fact != null) card.funFactValue = fact.trim();
    });
  }

  function renderCards() {
    if (!working) return;
    const cat = el.filterCat.value;
    const source = el.filterSource.value;
    const q = el.filterQ.value.trim().toLowerCase();
    const list = working.cards.filter((c) => {
      if (cat && c.category !== cat) return false;
      if (source && c.sourceName !== source) return false;
      if (q) {
        const hay = `${c.title} ${c.content} ${c.id} ${c.funFactValue}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    el.filterMeta.textContent = `顯示 ${list.length} / ${working.cards.length} 張`;
    el.cardList.innerHTML = "";
    list.forEach((c) => {
      const art = document.createElement("details");
      art.className = `egg-card ${Core.catClass(c.category)}`;
      art.dataset.id = c.id;
      art.innerHTML = `
        <summary class="egg-summary">
          <div class="egg-top">
            <span class="pill ${Core.catClass(c.category)}">${Core.catLabel(c.category)}</span>
            <span class="pill">來源：${escapeHtml(c.sourceName)}</span>
            <span class="meta-id">${escapeHtml(c.id)}</span>
          </div>
          <div class="egg-summary-title">${escapeHtml(c.title)}</div>
        </summary>
        <div class="egg-body">
          <div class="field">
            <div class="flabel">標題</div>
            <input data-f="title" type="text" maxlength="28" value="${escapeAttr(c.title)}" />
          </div>
          <div class="field">
            <div class="flabel">內容</div>
            <textarea data-f="content" rows="3" maxlength="160">${escapeHtml(c.content)}</textarea>
          </div>
          <div class="field">
            <div class="flabel">趣味標籤</div>
            <input data-f="funFactValue" type="text" maxlength="16" value="${escapeAttr(c.funFactValue)}" />
          </div>
          <div class="field">
            <div class="flabel">來源網址</div>
            <div class="readonly">${c.sourceURL ? escapeHtml(c.sourceURL) : "（無）"}</div>
          </div>
        </div>`;
      const titlePreview = art.querySelector(".egg-summary-title");
      art.querySelectorAll("input,textarea").forEach((inp) =>
        inp.addEventListener("input", () => {
          dirty = true;
          if (inp.dataset.f === "title" && titlePreview) {
            titlePreview.textContent = inp.value.trim() || "（未命名）";
          }
        })
      );
      el.cardList.appendChild(art);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function setWorking(data, opts = {}) {
    working = Core.cloneCatalog(data);
    if (!baselineForDiff || opts.resetBaseline) {
      baselineForDiff = liveCatalog ? Core.cloneCatalog(liveCatalog) : Core.cloneCatalog(data);
    }
    dirty = false;
    const errors = Core.validateCatalog(working, liveCatalog);
    el.errors.hidden = true;
    el.errors.innerHTML = "";
    if (errors.length) {
      valid = false;
      el.errors.hidden = false;
      errors.slice(0, 12).forEach((msg) => {
        const li = document.createElement("li");
        li.textContent = msg;
        el.errors.appendChild(li);
      });
      showStatus(el.workStatus, "bad", `驗證失敗（${errors.length}）`);
      el.editorCard.classList.add("hidden");
      el.uploadBtn.disabled = true;
      updateStats(working);
      return;
    }
    valid = true;
    el.editorCard.classList.remove("hidden");
    updateStats(working);
    fillSourceFilters();
    renderCards();
    el.uploadBtn.disabled = false;
    const cats = { history: 0, food: 0, geo: 0 };
    working.cards.forEach((c) => {
      if (cats[c.category] != null) cats[c.category] += 1;
    });
    showStatus(
      el.workStatus,
      "ok",
      `已載入工作檔 version=${working.version}、${working.cards.length} 張（歷史${cats.history}／美食${cats.food}／地理${cats.geo}）`
    );
  }

  async function ensureLive() {
    if (!liveCatalog) liveCatalog = await fetchLive();
  }

  async function loadFullText(text) {
    showStatus(el.workStatus, "info", "正在比對線上圖鑑…");
    try {
      await ensureLive();
    } catch (e) {
      showStatus(el.workStatus, "info", `無法抓線上版（${e}），僅做結構驗證。`);
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showStatus(el.workStatus, "bad", "不是合法 JSON。");
      return;
    }
    setWorking(data, { resetBaseline: true });
  }

  bindDrop(el.drop, el.file, async (file) => {
    try {
      await loadFullText(await readText(file));
    } catch (e) {
      showStatus(el.workStatus, "bad", String(e.message || e));
    }
  });

  bindDrop(el.dropDelta, el.fileDelta, async (file) => {
    try {
      showStatus(el.workStatus, "info", "正在合并增量…");
      await ensureLive();
      const delta = JSON.parse(await readText(file));
      const base = working || liveCatalog;
      const merged = Core.mergeDelta(base, delta);
      setWorking(merged, { resetBaseline: true });
      showStatus(
        el.workStatus,
        "ok",
        `增量已合并：+${delta.cards.length} → version=${merged.version}`
      );
    } catch (e) {
      showStatus(el.workStatus, "bad", String(e.message || e));
    }
  });

  el.loadLiveBtn.addEventListener("click", async () => {
    try {
      showStatus(el.workStatus, "info", "載入線上版…");
      liveCatalog = await fetchLive();
      setWorking(liveCatalog, { resetBaseline: true });
    } catch (e) {
      showStatus(el.workStatus, "bad", String(e.message || e));
    }
  });

  ["change", "input"].forEach((n) => {
    el.filterCat.addEventListener(n, () => {
      collectEditsFromDOM();
      renderCards();
    });
    el.filterSource.addEventListener(n, () => {
      collectEditsFromDOM();
      renderCards();
    });
    el.filterQ.addEventListener(n, () => {
      collectEditsFromDOM();
      renderCards();
    });
  });

  el.applyBtn.addEventListener("click", () => {
    collectEditsFromDOM();
    setWorking(working);
    dirty = false;
    showStatus(el.workStatus, "ok", "已套用畫面中的修改到工作檔。");
  });

  el.dlWorkBtn.addEventListener("click", () => {
    collectEditsFromDOM();
    const prepared = Core.prepareForUpload(working, liveCatalog);
    if (prepared.errors.length) {
      showStatus(el.workStatus, "bad", prepared.errors.join("\n"));
      return;
    }
    downloadBlob(prepared.text, "knowledge_cards.json");
    showStatus(el.workStatus, "ok", "已下載目前工作檔。");
  });

  function downloadBlob(text, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  el.addBtn.addEventListener("click", () => {
    collectEditsFromDOM();
    const card = {
      id: Core.genId(working.cards, el.addCat.value),
      title: el.addTitle.value.trim(),
      content: el.addContent.value.trim(),
      category: el.addCat.value,
      sourceName: el.addSource.value.trim(),
      sourceURL: el.addUrl.value.trim() ? el.addUrl.value.trim() : null,
      funFactValue: el.addFact.value.trim(),
    };
    const errs = Core.validateNewCard(card, working);
    if (errs.length) {
      showStatus(el.addStatus, "bad", errs.join("\n"));
      return;
    }
    working.cards.push(card);
    dirty = true;
    fillSourceFilters();
    renderCards();
    const fresh = el.cardList.querySelector(`.egg-card[data-id="${CSS.escape(card.id)}"]`);
    if (fresh) fresh.open = true;
    updateStats(working);
    el.addTitle.value = "";
    el.addContent.value = "";
    el.addFact.value = "";
    el.addUrl.value = "";
    showStatus(el.addStatus, "ok", `已新增：${card.title}（${card.id}）`);
  });

  function renderDiff(base, next) {
    const d = Core.diffCatalogs(base, next);
    el.diffMeta.textContent = `基準 version=${base?.version ?? "—"} → 工作檔 version=${next.version}｜新增 ${d.added.length}／修改 ${d.changed.length}／刪除 ${d.removed.length}`;
    el.diffList.innerHTML = "";
    d.added.forEach((c) => {
      el.diffList.appendChild(diffNode("added", "新增", c.title, `${Core.catLabel(c.category)} · ${c.sourceName}\n${c.content}`));
    });
    d.changed.forEach((x) => {
      const fields = x.fields.map((f) => Core.FIELD_ZH[f] || f).join("、");
      el.diffList.appendChild(
        diffNode(
          "changed",
          "修改",
          x.after.title,
          `變更欄位：${fields}\n原標題：${x.before.title}`
        )
      );
    });
    d.removed.forEach((c) => {
      el.diffList.appendChild(diffNode("removed", "刪除", c.title, c.id));
    });
    if (!d.added.length && !d.changed.length && !d.removed.length) {
      el.diffList.innerHTML = `<div class="diff-item"><p>與基準沒有差異。</p></div>`;
    }
  }

  function diffNode(kind, tag, title, body) {
    const div = document.createElement("div");
    div.className = `diff-item ${kind}`;
    div.innerHTML = `<h3>【${tag}】${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>`;
    return div;
  }

  el.openDiffBtn.addEventListener("click", async () => {
    collectEditsFromDOM();
    try {
      if (!baselineForDiff) {
        await ensureLive();
        baselineForDiff = Core.cloneCatalog(liveCatalog);
      }
      renderDiff(baselineForDiff, working);
      el.diffCard.classList.remove("hidden");
      el.diffCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      showStatus(el.workStatus, "bad", String(e.message || e));
    }
  });
  el.closeDiffBtn.addEventListener("click", () => el.diffCard.classList.add("hidden"));

  async function loadManifest() {
    try {
      return await fetchJSON(CFG.manifestURL);
    } catch {
      return [];
    }
  }

  el.openHistBtn.addEventListener("click", async () => {
    el.histCard.classList.remove("hidden");
    el.histList.innerHTML = `<p class="hint">載入中…</p>`;
    const manifest = await loadManifest();
    el.histList.innerHTML = "";
    if (!manifest.length) {
      el.histList.innerHTML = `<div class="hist-item"><div><h3>尚無封存</h3><p>成功上傳後會寫入 versions/。</p></div></div>`;
      return;
    }
    manifest.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "hist-item";
      item.innerHTML = `
        <div>
          <h3>版本 ${entry.version}</h3>
          <p>${escapeHtml(entry.updatedAt || "")} · ${entry.cardCount ?? "—"} 張</p>
        </div>
        <div class="actions">
          <button type="button" class="btn-secondary btn-mini" data-act="dl">下載</button>
          <button type="button" class="btn-ghost btn-mini" data-act="diff">當差異基準</button>
        </div>`;
      item.querySelector('[data-act="dl"]').addEventListener("click", async () => {
        try {
          const data = await fetchJSON(CFG.versionFileURL(entry.path));
          downloadBlob(JSON.stringify(data, null, 2) + "\n", `knowledge_cards_v${entry.version}.json`);
        } catch (e) {
          showStatus(el.workStatus, "bad", String(e.message || e));
        }
      });
      item.querySelector('[data-act="diff"]').addEventListener("click", async () => {
        try {
          baselineForDiff = await fetchJSON(CFG.versionFileURL(entry.path));
          collectEditsFromDOM();
          renderDiff(baselineForDiff, working);
          el.diffCard.classList.remove("hidden");
          showStatus(el.workStatus, "info", `差異基準已設為 version ${entry.version}`);
        } catch (e) {
          showStatus(el.workStatus, "bad", String(e.message || e));
        }
      });
      el.histList.appendChild(item);
    });
    el.histCard.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  el.closeHistBtn.addEventListener("click", () => el.histCard.classList.add("hidden"));

  async function githubGetSha(path, token) {
    const url = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${path}?ref=${encodeURIComponent(CFG.branch)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`讀取 ${path} 失敗：${res.status} ${await res.text()}`);
    return (await res.json()).sha;
  }

  function toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin);
  }

  async function githubPut(path, token, content, sha, message) {
    const body = { message, content: toBase64Utf8(content), branch: CFG.branch };
    if (sha) body.sha = sha;
    const res = await fetch(
      `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`寫入 ${path} 失敗：${res.status} ${text}`);
    return JSON.parse(text);
  }

  async function putPath(path, token, content, message) {
    const sha = await githubGetSha(path, token);
    return githubPut(path, token, content, sha, message);
  }

  el.uploadBtn.addEventListener("click", async () => {
    if (!working) return;
    collectEditsFromDOM();
    const token = el.pat.value.trim();
    if (!token) {
      showStatus(el.publishStatus, "bad", "請先貼上 Fine-grained PAT。");
      return;
    }
    try {
      await ensureLive();
    } catch (_) {
      /* optional */
    }
    const prepared = Core.prepareForUpload(working, liveCatalog);
    if (prepared.errors.length) {
      showStatus(el.publishStatus, "bad", prepared.errors.join("\n"));
      return;
    }
    working = prepared.data;
    updateStats(working);
    sessionStorage.setItem(PAT_KEY, token);
    el.uploadBtn.disabled = true;
    const message = `catalog: v${working.version} (${working.cards.length} cards) via 灣蛋配送站`;
    try {
      const indexText = JSON.stringify(Core.buildIndex(working), null, 2) + "\n";
      const archivePath = `versions/v${working.version}.json`;
      let manifest = [];
      try {
        manifest = await fetchJSON(CFG.manifestURL);
      } catch (_) {
        manifest = [];
      }
      if (!Array.isArray(manifest)) manifest = [];
      const entry = {
        version: working.version,
        updatedAt: working.updatedAt,
        cardCount: working.cards.length,
        path: archivePath,
      };
      manifest = manifest.filter((e) => e.version !== working.version);
      manifest.unshift(entry);
      const manifestText = JSON.stringify(manifest, null, 2) + "\n";

      const paths = [
        ["knowledge_cards.json", prepared.text],
        ["public/knowledge_cards.json", prepared.text],
        [archivePath, prepared.text],
        ["versions/manifest.json", manifestText],
        ["index/catalog_index.json", indexText],
      ];
      let commitUrl = "";
      for (const [path, content] of paths) {
        showStatus(el.publishStatus, "info", `正在上傳 ${path}…`);
        const put = await putPath(path, token, content, message);
        if (!commitUrl) commitUrl = put.commit?.html_url || "";
      }
      liveCatalog = Core.cloneCatalog(working);
      baselineForDiff = Core.cloneCatalog(working);
      showStatus(
        el.publishStatus,
        "ok",
        `上傳成功。Action「Publish catalog」會驗證並部署 Firebase。\n線上（Git／CDN）將更新；本機 seed 請另下載後同步。${
          commitUrl ? `\n${commitUrl}` : ""
        }`
      );
    } catch (e) {
      showStatus(el.publishStatus, "bad", String(e.message || e));
    } finally {
      el.uploadBtn.disabled = !valid;
    }
  });
})();
