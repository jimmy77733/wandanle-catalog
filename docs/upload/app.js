(() => {
  const CFG = window.WANDANLE_UPLOAD;
  if (!CFG) {
    console.error("missing upload.config.js");
    return;
  }

  const GATE_KEY = "wandanle_upload_gate_ok";
  const PAT_KEY = "wandanle_upload_pat";

  const el = {
    gateCard: document.getElementById("gate-card"),
    mainCard: document.getElementById("main-card"),
    gate: document.getElementById("gate"),
    gateBtn: document.getElementById("gate-btn"),
    gateStatus: document.getElementById("gate-status"),
    drop: document.getElementById("drop"),
    file: document.getElementById("file"),
    preview: document.getElementById("preview"),
    errors: document.getElementById("errors"),
    pat: document.getElementById("pat"),
    uploadBtn: document.getElementById("upload-btn"),
    downloadBtn: document.getElementById("download-btn"),
    clearPat: document.getElementById("clear-pat"),
    workStatus: document.getElementById("work-status"),
    statVersion: document.getElementById("stat-version"),
    statCount: document.getElementById("stat-count"),
    statDelta: document.getElementById("stat-delta"),
  };

  let catalogText = "";
  let catalogData = null;
  let valid = false;

  function showStatus(node, kind, text) {
    node.className = `status show ${kind}`;
    node.textContent = text;
  }

  function clearStatus(node) {
    node.className = "status";
    node.textContent = "";
  }

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function unlockMain() {
    el.gateCard.classList.add("hidden");
    el.mainCard.classList.remove("hidden");
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

  if (sessionStorage.getItem(GATE_KEY) === "1") {
    unlockMain();
  }

  el.gateBtn.addEventListener("click", () => {
    tryGate().catch((e) => showStatus(el.gateStatus, "bad", String(e)));
  });
  el.gate.addEventListener("keydown", (e) => {
    if (e.key === "Enter") el.gateBtn.click();
  });

  el.pat.addEventListener("change", () => {
    if (el.pat.value) sessionStorage.setItem(PAT_KEY, el.pat.value);
    else sessionStorage.removeItem(PAT_KEY);
  });
  el.clearPat.addEventListener("click", () => {
    el.pat.value = "";
    sessionStorage.removeItem(PAT_KEY);
    showStatus(el.workStatus, "info", "已清除此工作階段的 Token。");
  });

  ["dragenter", "dragover"].forEach((name) => {
    el.drop.addEventListener(name, (e) => {
      e.preventDefault();
      el.drop.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    el.drop.addEventListener(name, (e) => {
      e.preventDefault();
      el.drop.classList.remove("dragover");
    });
  });
  el.drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  });
  el.file.addEventListener("change", () => {
    const f = el.file.files?.[0];
    if (f) readFile(f);
  });

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      catalogText = String(reader.result || "");
      validateAndPreview().catch((err) => {
        valid = false;
        updateButtons();
        showStatus(el.workStatus, "bad", String(err));
      });
    };
    reader.onerror = () => showStatus(el.workStatus, "bad", "讀檔失敗");
    reader.readAsText(file, "utf-8");
  }

  async function fetchLive() {
    const urls = [CFG.liveCatalogURL, CFG.liveCatalogFallbackURL];
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        return await res.json();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("無法取得線上圖鑑");
  }

  function validateCatalog(data, live) {
    const errors = [];
    const rootKeys = Object.keys(data).sort().join(",");
    if (rootKeys !== "cards,updatedAt,version") {
      errors.push('根物件只能有 version、updatedAt、cards');
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

    const need = new Set([
      "id",
      "title",
      "content",
      "category",
      "sourceName",
      "sourceURL",
      "funFactValue",
    ]);
    const allowed = new Set(["history", "food", "geo"]);
    const ids = new Set();

    data.cards.forEach((c, i) => {
      if (!c || typeof c !== "object") {
        errors.push(`cards[${i}] 不是物件`);
        return;
      }
      const keys = new Set(Object.keys(c));
      if (keys.size !== need.size || [...need].some((k) => !keys.has(k))) {
        errors.push(`卡片 ${c.id || i} 欄位必須剛好為七個標準鍵`);
      }
      if (!c.id || typeof c.id !== "string") errors.push(`卡片 #${i} 缺 id`);
      else if (ids.has(c.id)) errors.push(`重複 id：${c.id}`);
      else ids.add(c.id);
      if (!allowed.has(c.category)) {
        errors.push(`${c.id || i} category 只能是 history|food|geo`);
      }
      if (c.sourceURL !== null && typeof c.sourceURL !== "string") {
        errors.push(`${c.id || i} sourceURL 必須是 string 或 null`);
      }
      if (c.sourceURL === "") {
        errors.push(`${c.id || i} sourceURL 禁止空字串（請用 null）`);
      }
    });

    if (live) {
      const liveCount = Array.isArray(live.cards) ? live.cards.length : 0;
      const liveVersion =
        typeof live.version === "number" ? live.version : -Infinity;
      if (data.cards.length < liveCount) {
        errors.push(
          `張數不可變少（線上 ${liveCount} → 上傳 ${data.cards.length}）`
        );
      }
      if (typeof data.version === "number" && data.version < liveVersion) {
        errors.push(
          `version 不可倒退（線上 ${liveVersion} → 上傳 ${data.version}）`
        );
      }
    }
    return errors;
  }

  function setStat(node, value, kind) {
    node.className = `stat${kind ? ` ${kind}` : ""}`;
    node.querySelector(".n").textContent = value;
  }

  async function validateAndPreview() {
    clearStatus(el.workStatus);
    el.errors.hidden = true;
    el.errors.innerHTML = "";
    valid = false;
    catalogData = null;

    let data;
    try {
      data = JSON.parse(catalogText);
    } catch {
      showStatus(el.workStatus, "bad", "不是合法 JSON。");
      updateButtons();
      return;
    }

    showStatus(el.workStatus, "info", "正在比對線上圖鑑…");
    let live = null;
    try {
      live = await fetchLive();
    } catch (e) {
      showStatus(
        el.workStatus,
        "info",
        `無法抓線上版（${e}），僅做結構驗證。`
      );
    }

    const errors = validateCatalog(data, live);
    const count = Array.isArray(data.cards) ? data.cards.length : 0;
    const liveCount = live && Array.isArray(live.cards) ? live.cards.length : null;
    const delta = liveCount == null ? "—" : String(count - liveCount);

    el.preview.hidden = false;
    setStat(el.statVersion, data.version ?? "—", errors.length ? "bad" : "ok");
    setStat(el.statCount, count, errors.length ? "bad" : "ok");
    setStat(
      el.statDelta,
      delta,
      liveCount == null ? "warn" : count - liveCount >= 0 ? "ok" : "bad"
    );

    if (errors.length) {
      el.errors.hidden = false;
      errors.slice(0, 12).forEach((msg) => {
        const li = document.createElement("li");
        li.textContent = msg;
        el.errors.appendChild(li);
      });
      if (errors.length > 12) {
        const li = document.createElement("li");
        li.textContent = `…另有 ${errors.length - 12} 項`;
        el.errors.appendChild(li);
      }
      showStatus(el.workStatus, "bad", `驗證失敗（${errors.length}）`);
      updateButtons();
      return;
    }

    // normalize pretty text for upload
    catalogData = data;
    catalogText = JSON.stringify(data, null, 2) + "\n";
    valid = true;
    const catCounts = { history: 0, food: 0, geo: 0 };
    data.cards.forEach((c) => {
      if (catCounts[c.category] != null) catCounts[c.category] += 1;
    });
    showStatus(
      el.workStatus,
      "ok",
      `驗證通過。version=${data.version}、共 ${count} 張（紅${catCounts.history}／黃${catCounts.food}／藍${catCounts.geo}）${
        liveCount != null ? `、相對線上 +${count - liveCount}` : ""
      }`
    );
    updateButtons();
  }

  function updateButtons() {
    el.uploadBtn.disabled = !valid;
    el.downloadBtn.disabled = !valid;
  }

  el.downloadBtn.addEventListener("click", () => {
    if (!valid || !catalogText) return;
    const blob = new Blob([catalogText], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "knowledge_cards.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showStatus(el.workStatus, "ok", "已下載驗證後的 knowledge_cards.json");
  });

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
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`讀取 ${path} 失敗：${res.status} ${t}`);
    }
    const j = await res.json();
    return j.sha;
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
    const url = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${path}`;
    const body = {
      message,
      content: toBase64Utf8(content),
      branch: CFG.branch,
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`寫入 ${path} 失敗：${res.status} ${text}`);
    return JSON.parse(text);
  }

  el.uploadBtn.addEventListener("click", async () => {
    if (!valid || !catalogData) return;
    const token = el.pat.value.trim();
    if (!token) {
      showStatus(el.workStatus, "bad", "請先貼上 Fine-grained PAT。");
      return;
    }
    sessionStorage.setItem(PAT_KEY, token);
    el.uploadBtn.disabled = true;
    try {
      const message = `catalog: v${catalogData.version} (${catalogData.cards.length} cards) via 灣蛋配送站`;
      const results = [];
      for (const path of CFG.paths) {
        showStatus(el.workStatus, "info", `正在上傳 ${path}…`);
        const sha = await githubGetSha(path, token);
        const put = await githubPut(path, token, catalogText, sha, message);
        results.push(put.commit?.html_url || put.content?.html_url || path);
      }
      const commitUrl = results.find((u) => String(u).startsWith("http")) || "";
      showStatus(
        el.workStatus,
        "ok",
        `上傳成功。GitHub Action「Publish catalog」會驗證並部署 Firebase。\n請稍候再查 CDN。${
          commitUrl ? `\n${commitUrl}` : ""
        }`
      );
    } catch (e) {
      showStatus(el.workStatus, "bad", String(e.message || e));
    } finally {
      updateButtons();
    }
  });
})();
