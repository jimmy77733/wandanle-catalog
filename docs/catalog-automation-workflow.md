# 內容自動化發布工作流解說

**適用對象：** 要把「AI／人工產出的靜態 JSON」自動送到公開 CDN，供 App 或網站抓取的人。

**參考實作：** [jimmy77733/wandanle-catalog](https://github.com/jimmy77733/wandanle-catalog)  
**文件版本：** 2026-08-01（與現行實作一致：Drive **新建版本檔** + 資料夾最新檔同步）

> **隱私：** 密鑰、檔案／資料夾 ID、私人信箱皆以 `••••` 隱碼。公開 URL 與公開 repo 名稱可保留為可驗證實例。

---

## 1. 為什麼要這套架構？

許多 AI 助理（如 Gemini Spark）可以讀寫使用者的 Google Drive，但通常：

- **不能**安全持有／儲存 API Token  
- **不能**可靠對外 HTTP／`git push`  
- Drive 工具常能 **新建檔、讀內容**，卻 **不能覆寫既有檔內容**、也不能刪檔  

因此正式發布必須由你控制的密鑰完成：Apps Script（Script Properties）+ GitHub Actions Secrets。

---

## 2. 現行架構

```text
內容生產者（AI）
  → 每次「新建」Drive 資料夾內 knowledge_cards_v{N}_{日期}.json
  → Apps Script（時間觸發）取資料夾內最新 knowledge_cards*.json
  → GitHub Contents API 寫入公開資料 repo（根目錄 + public/）
  → GitHub Action 驗證並部署 Firebase Hosting
  → 客戶端抓 CDN（失敗則 raw／內建 seed）
```

**職責切分**

| 角色 | 做什麼 | 持密鑰？ |
|------|--------|----------|
| AI | 產出合法完整 JSON，寫入 Drive 新檔 | 否 |
| Apps Script | 驗證 + 寫 GitHub | 是（PAT） |
| GitHub | 版本歷史 + raw 備援 | — |
| Actions | 再驗證 + 部署 CDN | 是（Firebase CI token） |
| App／網站 | 只讀公開 URL | 否 |

---

## 3. 各環節要點

### 3.1 Drive（中繼區）

- 固定一個資料夾；記下 **FOLDER_ID**（`/folders/…`）  
- AI 每次上傳：`knowledge_cards_v{version}_{YYYYMMDD}.json`  
- 允許多檔；同步腳本取 **最後修改時間最新** 且檔名符合 `knowledge_cards*.json` 者  
- 舊檔可手動清理（AI 通常不能刪）

### 3.2 Apps Script

1. 用 `DRIVE_FOLDER_ID` 解析最新檔（備援：`DRIVE_FILE_ID`）  
2. Schema 驗證  
3. 與線上比較：同 version + 同 id 集合 → 跳過；張數變少／version 倒退 → 拒絕  
4. 更新 `knowledge_cards.json` 與 `public/knowledge_cards.json`

**Script Properties（隱碼）**

| 屬性 | 範例 |
|------|------|
| `GITHUB_TOKEN` | `github_pat_••••••••••••••••` |
| `DRIVE_FOLDER_ID` | `••••••••••••••••••••` |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` | 可省略則用專案預設 |

PAT 必須：**Fine-grained**、僅該資料 repo、**Contents: Read and write**（僅 Advisories 會 403）。

### 3.3 GitHub Actions

觸發：push 變更 JSON、手動、`repository_dispatch`（小檔備援）。  
Secret：`FIREBASE_TOKEN` = `1//••••••••`（未設定時可 soft-fail，至少 raw 可用）。

### 3.4 客戶端抓取順序（建議）

1. Hosting CDN  
2. GitHub raw  
3. 內建 seed  

合并：以 `id` upsert。

本倉庫公開實例：

- https://wandanle-catalog.web.app/knowledge_cards.json  
- https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json  

---

## 4. 資料契約（雙重驗證）

根鍵恰好：`version`, `updatedAt`, `cards`。  
每卡：`id`, `title`, `content`, `category`, `sourceName`, `sourceURL`, `funFactValue`。  
建議同時寫在 Apps Script 與 Action：白名單 category、禁止空字串 URL、id 唯一、防清空／防 version 倒退。

---

## 5. 一次建置清單

- [ ] Public 資料 repo（與 App 源碼分離）+ `public/` 鏡像 JSON  
- [ ] `publish.yml` + Firebase 專案 + `FIREBASE_TOKEN`  
- [ ] Drive 專用資料夾 + `DRIVE_FOLDER_ID`  
- [ ] Fine-grained PAT（Contents 讀寫）→ 只放 Script Properties  
- [ ] Apps Script + 時間觸發  
- [ ] AI Skill：只寫 Drive、**新建版本檔**、禁止 Token／push  

驗收：新檔進資料夾 → GAS「已更新 GitHub」→ Action 綠燈 → curl CDN version／筆數正確。

---

## 6. 常見問題（精簡）

| 現象 | 處理 |
|------|------|
| 一直跳過、讀不到新內容 | 改用資料夾最新檔；勿死釘舊 FILE_ID |
| AI 覆寫失敗 | 改為新建版本檔（工具限制） |
| GitHub 403 | PAT 補上 Contents: Read and write |
| CDN 舊、repo 新 | 查 Action／`FIREBASE_TOKEN` |
| dispatch 失敗 | payload 過大 → 改 Contents API 主路徑 |

---

## 7. 安全

- 文件／Skill／截圖勿出現完整 token  
- PAT 最小授權；公開 repo 不放 App 源碼與後台金鑰  
- App 只存公開 CDN URL  

```text
GITHUB_TOKEN=github_pat_••••••••••••••••
FIREBASE_TOKEN=1//••••••••••••••••
DRIVE_FOLDER_ID=••••••••••••••••••••
```

---

## 8. 套用到其他專案

| 本專案 | 可替換為 |
|--------|----------|
| 圖鑑 JSON | 題庫、目錄、關卡表、字串包 |
| Gemini Spark | 任何不能持密鑰的產內容端 |
| Drive 資料夾 | 其他中繼匣（仍由橋接程式讀） |
| Apps Script | Cloud Function／自架 worker |
| Firebase Hosting | Pages／S3+CDN／GitHub Pages |

核心不變：**私有中繼寫入 → 持密鑰橋樑發布 → CDN → 客戶端只讀。**

---

## 9. 本倉庫索引

| 路徑 | 說明 |
|------|------|
| `knowledge_cards.json` / `public/…` | 公開圖鑑 |
| `.github/workflows/publish.yml` | 驗證＋部署 |
| `automation/apps-script/` | Drive → GitHub 橋 |
| `docs/catalog-automation-workflow.pdf` | 本文件 PDF |

設定步驟細節：[`automation/apps-script/README.md`](../automation/apps-script/README.md)。

---

*公開資料倉庫文件；不含私人 App 原始碼與真實密鑰。*
