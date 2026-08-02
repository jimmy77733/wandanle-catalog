# 灣蛋配送站（圖鑑上傳備用）

靜態頁：驗證完整 `knowledge_cards.json` →（可選）以 Fine-grained PAT 寫入本 repo → 既有 GitHub Action 部署 Firebase。

啟用 Pages 後網址（建議）：

```text
https://jimmy77733.github.io/wandanle-catalog/upload/
```

本地預覽：在本目錄開靜態伺服器（需能 `fetch` CDN；若純 `file://` 可能被瀏覽器擋）。

```bash
cd docs/upload && python3 -m http.server 8787
# 開 http://127.0.0.1:8787/
```

---

## 1. 啟用 GitHub Pages

1. Repo Settings → **Pages**
2. Source：**Deploy from a branch**
3. Branch：`main`／Folder：**`/docs`**
4. 儲存後等 1–2 分鐘；開啟上述 `/upload/` 路徑

上傳站放在 `docs/upload/`，**不會**進 Firebase `public/`（避免跟 App CDN 混在同一主站首頁邏輯裡）。

---

## 2. 安全模型（必讀）

| 層級 | 做什麼 | 不是什麼 |
|------|--------|----------|
| 站門密碼 | 隱藏上傳 UI，防路人誤入 | **不能**取代 GitHub 寫入權 |
| Fine-grained PAT | 真正能改 `knowledge_cards.json` | 勿用 classic／過大權限 |
| GitHub Ruleset | 鎖誰能 push `main`、禁 force push | 需在 GitHub UI 手動啟用（見下） |
| Action JSON 驗證 | 壞檔／倒退 version 不部署 CDN | 不能阻止有寫入權的人改 Git 歷史（可 revert） |

**公開 repo ≠ 路人能 commit。** 路人可讀、可 fork、可開 PR；沒有你的帳號／PAT／collaborator 就不能寫 `main`。

### 建立 PAT

1. GitHub → Settings → Developer settings → **Fine-grained tokens**
2. Resource owner：你的帳號；只選 repository **`wandanle-catalog`**
3. Permissions → Repository → **Contents: Read and write**
4. 產生後只貼在配送站／本機，**不要 commit**

疑洩漏：立刻 **Revoke** → 新建 → 上傳時貼新的（不必改網站程式）。

### 站門密碼

- Repo 只存 **SHA-256 hex**（`upload.config.js` 的 `gateHash`）
- **預設明文（請立刻改掉）：** `wandanle-gate-change-me`
- 重算：

```bash
echo -n '你的新長密碼' | shasum -a 256
```

把輸出的 64 字元寫進 `gateHash`，commit 後等 Pages 更新。  
忘記站門：仍可用本機腳本或直接 git push JSON；改雜湊即可重設。

密碼建議 ≥ 16 字元、與 PAT 分開保管。

### 可選：Cloudflare Access + Google 登入（真站門）

若要把上傳站掛到自有網域並強制 Google 帳號：

1. 用 Cloudflare 代理該網域（或 Pages／Workers 前面）
2. Zero Trust → Access → Applications → 保護上傳站路徑
3. Policy：Allow 你的 Gmail（Identity provider = Google）
4. 通過後仍在頁內貼 PAT 寫 GitHub

這比前端站門密碼安全得多；第一期非必須。

---

## 3. GitHub Ruleset（建議你現在就開）

Settings → **Rules** → **Rulesets** → New branch ruleset：

1. Name：`protect-main-catalog`
2. Enforcement：**Active**
3. Target branches：`main`（或 default）
4. Rules 勾選：
   - **Restrict deletions**
   - **Block force pushes**
   - **Restrict updates**／Restrict who can push → 只加你自己（`jimmy77733`）
5. **不要**強制「Require a pull request」（一人維護 + 配送站 Contents API 直推會被擋）
6. 不要加不可信 Collaborator

啟用後：沒有你的寫入權就無法對 `main` 做出有效推送。

---

## 4. 日常使用

1. 用一般 Gemini（非 Spark）依 Skill 產出**完整** `knowledge_cards.json` 並下載  
2. 開啟配送站 → 站門密碼 → 選檔 → 確認 version／張數／新增數  
3. 貼 PAT → **上傳並發布**  
4. 到 Actions 看「Publish catalog」；成功後：

```bash
curl -sL "https://wandanle-catalog.web.app/knowledge_cards.json" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['version'],len(d['cards']))"
```

只想檢查檔案：用 **只驗證下載**（不需 PAT）。

---

## 5. 保底路徑

- 私有 App repo：`./scripts/publish_catalog.sh /path/to/knowledge_cards.json`
- 或本機編輯後 `git push`（仍過 Action 驗證）

Spark → Drive → Apps Script 仍可選；恢復後可繼續用。
