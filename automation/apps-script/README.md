# Drive ↔ GitHub（Apps Script）

雙向橋接（皆為「新建／覆寫 GitHub」，**不覆寫** Drive 舊檔）：

| 方向 | 函式 | 用途 |
|------|------|------|
| Drive → GitHub | `syncCatalogFromDrive` | Spark 每日新建底稿後，**時間觸發**寫入倉庫 |
| GitHub → Drive | `mirrorCatalogToDrive` | 配送站手動發布後，把線上最新鏡像成 Drive 新底稿 |

主線：**Gemini Spark 排程**在 Drive「灣蛋啦圖鑑」新建 `knowledge_cards_v…json`（寫入時可能要按「允許」）→ 本腳本定期 `syncCatalogFromDrive`。  
不使用 Custom app／MCP。

（Spark Drive 工具無法覆寫檔案內容、也不能刪檔，故 Drive 端一律「每次新建」。）

配送站： [灣蛋配送站](../../docs/upload/)

## 設定（維護者）

### 1. Drive

1. 專用資料夾「灣蛋啦圖鑑」  
2. 自網址 `/folders/…` 取得資料夾 ID（例：`1Ayiz2ww87XYRg1nVb1ZDs5nyYF_Px7y7`）  
3. 同步／Spark **最後修改最新**且檔名符合 `knowledge_cards*.json` 者  

**清理建議：** 保留最近 3～5 個 `knowledge_cards_v{N}_{日期}.json`；過舊可刪或移出。固定名 `knowledge_cards.json` 易混淆，建議不用。勿「再儲存」舊小檔（會變成最新修改時間而被誤抓）。

### 2. GitHub token

- Fine-grained、僅本資料倉庫、**Contents: Read and write**  
- 只放 Script Properties，勿寫進程式碼  

### 3. Apps Script 屬性

| 屬性 | 必填 | 說明 |
|------|------|------|
| `GITHUB_TOKEN` | ✅ | PAT |
| `DRIVE_FOLDER_ID` | ✅ | 資料夾 ID |
| `MIRROR_SECRET` | 建議 | Web App 密鑰；與配送站 `driveMirrorSecret` 相同 |
| `GITHUB_OWNER`／`REPO`／`BRANCH` | 可選 | 預設 jimmy77733／wandanle-catalog／main |

### 4. 部署 Web App（配送站自動鏡像用）

1. 貼上最新 [`Code.gs`](./Code.gs)  
2. 執行一次 `mirrorCatalogToDrive`（編輯器內）完成 Drive／GitHub 授權  
3. **部署 → 新部署作業 → 類型：網頁應用程式**  
   - 執行身分：我  
   - 具有存取權的使用者：**任何人**  
4. 複製 Web App URL（`…/exec`）  
5. 填入公開配送站 [`docs/upload/upload.config.js`](../../docs/upload/upload.config.js)：  
   - `driveMirrorWebAppURL`  
   - `driveMirrorSecret`（= Script Property `MIRROR_SECRET`）  
6. **每次改 Code.gs 後要「管理部署作業 → 編輯 → 新版本」**，否則配送站仍打到舊碼  

### 5. 時間觸發（Spark 路徑）

每 15–60 分執行 `syncCatalogFromDrive`。

## 函式一覽

| 函式 | 用途 |
|------|------|
| `syncCatalogFromDrive` | Drive 最新檔 → GitHub |
| `mirrorCatalogToDrive` | GitHub 主檔 → Drive 新建版本檔 |
| `doGet`／`doPost` | Web App 入口（`action=mirror` + `secret`） |
| `dispatchCatalogFromDrive` | 小檔 repository_dispatch 備援 |

### 手動測 Web App

瀏覽器或 curl（將 URL／secret 換成你的）：

```bash
curl -sL "https://script.google.com/macros/s/XXXX/exec?action=mirror&secret=你的密鑰"
```

或 POST（`text/plain` 可減少 CORS preflight）：

```bash
curl -sL -X POST "https://script.google.com/macros/s/XXXX/exec" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"mirror","secret":"你的密鑰"}'
```

成功回應含 `ok: true`、`fileName`、`version`、`total`；已最新則 `skipped: true`。

## 常見問題

| 現象 | 處理 |
|------|------|
| HTTP 403 | token 需 Contents 讀寫 |
| 張數變少被拒（Drive→GitHub） | Drive 底稿必須是完整庫且 ≥ 線上 |
| 配送站鏡像失敗 | 檢查 Web App 是否「新版本」部署、`MIRROR_SECRET` 是否一致 |
| Spark 仍讀舊檔 | 看資料夾「最後修改」是否指向新的 `knowledge_cards_v…json` |

腳本會拒絕張數變少與 version 倒退（Drive → GitHub）。
