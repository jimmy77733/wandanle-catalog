# Drive ↔ GitHub（Apps Script）

橋接重點：**Drive 寫入一律走本腳本的 `DriveApp.createFile`**（已授權、不會跳 Spark「需要確認」）。  
Spark **不要**再用內建 Drive 工具新建／搬移圖鑑檔。

| 方向 | 函式／action | 用途 |
|------|----------------|------|
| Drive → GitHub | `syncCatalogFromDrive` | 時間觸發，取最新底稿寫入倉庫 |
| GitHub → Drive | `mirror` / `mirrorCatalogToDrive` | 配送站發布後鏡像底稿 |
| 外部 JSON → Drive | `ingest` / `ingestCatalogToDrive` | Spark Custom app 或 curl 交完整庫 |
| 讀最新底稿 | `latestDraft` / `latestDraftCatalog` | 給 Spark 讀底稿，少用 Drive 工具 |
| 備援產卡 | `runDailyCatalogViaGeminiApi` | 不經 Spark，GAS 呼叫 Gemini API |

配送站： [灣蛋配送站](../../docs/upload/)

## 設定（維護者）

### 1. Drive

1. 專用資料夾「灣蛋啦圖鑑」  
2. 自網址 `/folders/…` 取得資料夾 ID（例：`1Ayiz2ww87XYRg1nVb1ZDs5nyYF_Px7y7`）  
3. 同步取 **最後修改最新**且檔名符合 `knowledge_cards*.json` 者  

**清理建議：** 保留最近 3～5 個 `knowledge_cards_v{N}_{日期}.json`；過舊可刪或移出。固定名 `knowledge_cards.json` 易混淆，建議不用。

### 2. GitHub token

- Fine-grained、僅本資料倉庫、**Contents: Read and write**  
- 只放 Script Properties  

### 3. Apps Script 屬性

| 屬性 | 必填 | 說明 |
|------|------|------|
| `GITHUB_TOKEN` | ✅ | PAT |
| `DRIVE_FOLDER_ID` | ✅ | 資料夾 ID |
| `MIRROR_SECRET` | 建議 | Web App 密鑰；配送站／Spark Custom app 共用 |
| `GEMINI_API_KEY` | 方案 B | 僅 `runDailyCatalogViaGeminiApi` 需要 |
| `GITHUB_OWNER`／`REPO`／`BRANCH` | 可選 | 預設 jimmy77733／wandanle-catalog／main |

### 4. 部署 Web App

1. 貼上最新 [`Code.gs`](./Code.gs)  
2. 編輯器執行一次 `mirrorCatalogToDrive` 完成授權  
3. **部署 → 新部署作業 → 網頁應用程式**（執行：我；存取：任何人）  
4. 複製 `…/exec` URL  
5. 填入 [`docs/upload/upload.config.js`](../../docs/upload/upload.config.js) 的 `driveMirrorWebAppURL`／`driveMirrorSecret`  
6. **改碼後務必「管理部署 → 編輯 → 新版本」**

### 5. 掛到 Gemini Spark（避開「需要確認」）

1. Gemini Spark → Connected Apps → **Custom apps for Spark**  
2. 新增自訂應用，URL 指向 Web App，例如：  
   `https://script.google.com/macros/s/XXXX/exec?secret=你的_MIRROR_SECRET`  
   （實際參數名稱依 Spark 當版 UI；工具應能對 `action=latestDraft`／`action=ingest` 發請求）  
3. Skill 改為：讀底稿用 `latestDraft`；寫入用 `ingest`（帶完整 `catalog`）；**禁止** Spark 原生 Drive 新建／搬移  

若 Custom app 呼叫寫入時**仍**跳出確認 → 改用方案 B（下方）。

### 6. 時間觸發

| 函式 | 建議 |
|------|------|
| `syncCatalogFromDrive` | 每 15–60 分（備援） |
| `runDailyCatalogViaGeminiApi` | 僅方案 B：每日一次（例如 07:00） |

## Web App actions

| action | 方法 | body／參數 | 說明 |
|--------|------|------------|------|
| `mirror` | GET／POST | `secret` | GitHub → Drive 新建 |
| `latestDraft` | GET／POST | `secret` | 回傳最新底稿 `catalog` |
| `ingest` | POST | `secret` + `catalog`；可選 `sync:false` | 驗證後新建 Drive；預設再跑 sync |

### 測試 ingest

```bash
curl -sL -X POST "https://script.google.com/macros/s/XXXX/exec" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"ingest","secret":"你的密鑰","catalog":{"version":11,"updatedAt":"2026-08-06T00:00:00Z","cards":[…]}}'
```

### 測試 latestDraft

```bash
curl -sL "https://script.google.com/macros/s/XXXX/exec?action=latestDraft&secret=你的密鑰"
```

## 方案 B：GAS + Gemini API（完全不經 Spark）

當 Spark／Custom app 仍要按「允許」時使用：

1. Script Properties 加 `GEMINI_API_KEY`  
2. 編輯器執行 `runDailyCatalogViaGeminiApi` 驗通  
3. 設時間觸發每日執行  
4. Spark 改為手動抽查／補產即可  

流程：讀 Drive 最新底稿 → Gemini API 產完整庫 → `DriveApp.createFile` → `syncCatalogFromDrive`。

## 函式一覽

| 函式 | 用途 |
|------|------|
| `syncCatalogFromDrive` | Drive → GitHub |
| `mirrorCatalogToDrive` | GitHub → Drive |
| `ingestCatalogToDrive` | 外部 JSON → Drive（＋可 sync） |
| `latestDraftCatalog` | 讀最新底稿 |
| `runDailyCatalogViaGeminiApi` | 方案 B 產卡 |
| `doGet`／`doPost` | Web App |
| `dispatchCatalogFromDrive` | 小檔 repository_dispatch 備援 |

## 常見問題

| 現象 | 處理 |
|------|------|
| Spark「需要確認／允許」 | 不要用 Spark Drive 寫檔；改 ingest 或方案 B |
| HTTP 403 | PAT 需 Contents 讀寫 |
| 張數變少被拒 | 完整庫且 ≥ 線上／Drive |
| 配送站鏡像失敗 | Web App 新版本部署、`MIRROR_SECRET` 一致 |
| ingest 後 GitHub 沒更新 | 看回傳 `sync.error`；或等時間觸發 |

腳本會拒絕張數變少與 version 倒退。
