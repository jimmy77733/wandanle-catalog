# Drive → GitHub 自動轉發（Apps Script）

Gemini Spark **只寫 Google Drive**；本腳本由你的 Google 帳號定時讀取該檔，驗證後寫入本 repo，既有 GitHub Action 再部署 Firebase。

## 一次設定

### 1. Drive 約定檔

1. 建立資料夾，例如：`灣蛋啦圖鑑`
2. 放入（或新建）檔名恰好為 `knowledge_cards.json` 的檔案  
   （可先從本 repo 根目錄下載目前的 JSON 上傳）
3. 開啟檔案，網址形如：  
   `https://drive.google.com/file/d/【FILE_ID】/view`  
   複製 `FILE_ID`

### 2. GitHub Fine-grained PAT

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained  
2. Resource owner：你的帳號  
3. Repository access：只選 **`wandanle-catalog`**  
4. Permissions → Repository permissions → **Contents: Read and write**  
5. 產生後複製 token（只顯示一次）

### 3. 建立 Apps Script 專案

1. 打開 [script.google.com](https://script.google.com/) → 新增專案  
2. 將 [`Code.gs`](./Code.gs) 全文貼上取代預設碼  
3. （可選）專案設定 → 顯示 `appsscript.json`，貼上同目錄的 manifest  
4. 專案設定 → **指令碼屬性** 新增：

| 屬性 | 值 |
|------|-----|
| `GITHUB_TOKEN` | 上一步的 PAT |
| `DRIVE_FILE_ID` | Drive 檔案 ID |
| `GITHUB_OWNER` | `jimmy77733`（可省略） |
| `GITHUB_REPO` | `wandanle-catalog`（可省略） |
| `GITHUB_BRANCH` | `main`（可省略） |

5. 執行 `syncCatalogFromDrive` 一次，授權 Drive 與外部請求  
6. 觸發條件 → 新增時間驅動觸發器 → 選擇 `syncCatalogFromDrive` → 例如每 30 分鐘

### 4. 驗收

1. 用 Spark／手動改 Drive 裡的 JSON（提高 `version`、加卡）  
2. 等觸發或手動執行腳本  
3. 檢查 https://github.com/jimmy77733/wandanle-catalog/commits/main  
4. 檢查 https://wandanle-catalog.web.app/knowledge_cards.json  

## 函式說明

| 函式 | 用途 |
|------|------|
| `syncCatalogFromDrive` | **建議主路徑**：Contents API 寫入兩份 JSON（大檔 OK）→ push 觸發 Firebase Action |
| `dispatchCatalogFromDrive` | 僅小檔：`repository_dispatch`（payload 約 &lt; 60KB）；大檔會失敗 |

## 安全

- PAT 只放在 **Script Properties**，不要貼進 Gemini 對話或公開 README  
- 腳本會拒絕「張數變少」或「version 倒退」的覆寫  
