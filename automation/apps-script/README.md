# Drive → GitHub 自動轉發（Apps Script）

Gemini Spark **無法覆寫既有 Drive 檔內容**（工具多半只能改 metadata 或**新建檔**）。因此正式做法是：

1. AI **每次上傳一份新的** `knowledge_cards_….json` 到約定資料夾  
2. 本腳本用 **`DRIVE_FOLDER_ID`** 自動選「最新修改」的那份同步到 GitHub  
3. GitHub Action 再部署 Firebase  

## 一次設定

### 1. Drive 約定資料夾

1. 建立資料夾，例如：`灣蛋啦圖鑑`
2. 打開資料夾，網址形如：  
   `https://drive.google.com/drive/folders/【FOLDER_ID】`  
   複製 `FOLDER_ID`
3. （可選）先放一份底稿 `knowledge_cards.json`

> 資料夾內可有多個 `knowledge_cards*.json`；腳本永遠取**最後修改時間最新**的那份。舊檔可手動清，不影響同步。

### 2. GitHub Fine-grained PAT

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained  
2. Repository access：只選 **`wandanle-catalog`**  
3. Permissions → **Contents: Read and write**  
4. 產生後複製 token（只顯示一次）

### 3. 建立 Apps Script 專案

1. 打開 [script.google.com](https://script.google.com/) → 新增專案  
2. 將 [`Code.gs`](./Code.gs) 全文貼上  
3. 專案設定 → **指令碼屬性**：

| 屬性 | 值 |
|------|-----|
| `GITHUB_TOKEN` | PAT |
| `DRIVE_FOLDER_ID` | 資料夾 ID（**建議**） |
| `DRIVE_FILE_ID` | 單一檔 ID（僅在沒設 folder 時當備援） |
| `GITHUB_OWNER` | `jimmy77733`（可省略） |
| `GITHUB_REPO` | `wandanle-catalog`（可省略） |
| `GITHUB_BRANCH` | `main`（可省略） |

4. 執行 `syncCatalogFromDrive` 一次並授權  
5. 時間觸發器：每 15–60 分鐘跑 `syncCatalogFromDrive`

### 4. 驗收

1. 讓 AI 上傳新檔（檔名須以 `knowledge_cards` 開頭、`.json` 結尾）  
2. 手動執行腳本或等觸發  
3. 日誌應出現：`來源檔：…` 與 `已更新 GitHub。version=…`  
4. 檢查 commits 與 https://wandanle-catalog.web.app/knowledge_cards.json  

## 函式

| 函式 | 用途 |
|------|------|
| `syncCatalogFromDrive` | **主路徑**：Contents API 寫兩份 JSON → push 觸發 Firebase |
| `dispatchCatalogFromDrive` | 小檔備援（payload 約 &lt; 60KB） |

## 安全

- PAT 只放 Script Properties，不要貼進 Gemini 對話或公開 README  
- 腳本會拒絕「張數變少」或「version 倒退」
