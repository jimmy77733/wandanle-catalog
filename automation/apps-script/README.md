# Drive → GitHub 自動轉發（Apps Script）

**現行做法：** AI 每次在 Drive 資料夾**新建** `knowledge_cards_v{N}_{日期}.json`；本腳本用 `DRIVE_FOLDER_ID` 取最新 `knowledge_cards*.json` 寫入本 repo，再由 Action 部署 Firebase。

（部分 AI 的 Drive 工具無法覆寫檔案內容、也不能刪檔。）

## 設定

### 1. Drive

1. 資料夾例如 `灣蛋啦圖鑑`  
2. 網址 `/folders/【FOLDER_ID】` → 複製 ID  
3. 資料夾內可多檔；永遠同步**最後修改最新**且檔名符合 `knowledge_cards*.json` 者  

### 2. GitHub Fine-grained PAT

- 僅授權本 repo  
- **Contents: Read and write**（必要；不要只開 Advisories）  
- Token 只放 Script Properties  

### 3. Apps Script

1. 貼上 [`Code.gs`](./Code.gs)  
2. 指令碼屬性：

| 屬性 | 說明 |
|------|------|
| `GITHUB_TOKEN` | PAT |
| `DRIVE_FOLDER_ID` | 資料夾 ID（建議） |
| `DRIVE_FILE_ID` | 備援：單一檔 ID |
| `GITHUB_OWNER` / `REPO` / `BRANCH` | 可省略 |

3. 執行一次 `syncCatalogFromDrive` 並授權  
4. 時間觸發：每 15–60 分鐘  

### 4. 驗收

日誌：`來源檔：…` → `已更新 GitHub。version=…`  
再查 commits 與 https://wandanle-catalog.web.app/knowledge_cards.json  

## 函式

| 函式 | 用途 |
|------|------|
| `syncCatalogFromDrive` | 主路徑（Contents API） |
| `dispatchCatalogFromDrive` | 小檔備援（約 &lt; 60KB） |

## 曾踩過的坑

| 現象 | 處理 |
|------|------|
| HTTP 403 Resource not accessible by PAT | Contents 改 Read and write，更新 `GITHUB_TOKEN` |
| 一直跳過舊 version | 改用／檢查 `DRIVE_FOLDER_ID`，勿釘死舊檔 |
| 張數變少被拒 | 上傳完整 catalog，勿只交增量 |

## 安全

PAT 勿貼進 AI 對話或公開 README。腳本會拒絕張數變少與 version 倒退。
