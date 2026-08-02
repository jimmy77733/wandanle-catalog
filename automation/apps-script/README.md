# Drive → GitHub 自動轉發（Apps Script）

可選橋接：在 Google Drive 資料夾**新建**版本化 `knowledge_cards_v{N}_{日期}.json` 後，本腳本以 `DRIVE_FOLDER_ID` 取最新 `knowledge_cards*.json` 寫入本倉庫，再由 Action 部署 Firebase。

（部分 AI 的 Drive 工具無法覆寫檔案內容、也不能刪檔，故採「每次新建」。）

主要發布路徑亦可改用 [灣蛋配送站](../../docs/upload/)，不必依賴本腳本。

## 設定（維護者）

### 1. Drive

1. 建立專用中繼資料夾  
2. 自網址 `/folders/…` 取得資料夾 ID  
3. 資料夾內可多檔；同步**最後修改最新**且檔名符合 `knowledge_cards*.json` 者  

### 2. GitHub token

- Fine-grained、僅授權本資料倉庫  
- **Contents: Read and write**  
- 只放在 Apps Script 的 Script Properties，勿寫進程式碼或公開文件  

### 3. Apps Script

1. 貼上 [`Code.gs`](./Code.gs)  
2. 指令碼屬性：`GITHUB_TOKEN`、`DRIVE_FOLDER_ID`（建議）；可選 `DRIVE_FILE_ID`、`GITHUB_OWNER`／`REPO`／`BRANCH`  
3. 執行一次 `syncCatalogFromDrive` 並完成授權  
4. 視需要設定時間觸發  

### 4. 驗收

日誌出現已更新 GitHub 後，確認 CDN：  
https://wandanle-catalog.web.app/knowledge_cards.json  

## 函式

| 函式 | 用途 |
|------|------|
| `syncCatalogFromDrive` | 主路徑（Contents API） |
| `dispatchCatalogFromDrive` | 小檔備援（約 &lt; 60KB） |

## 常見問題

| 現象 | 處理 |
|------|------|
| HTTP 403 | token 需 Contents 讀寫權限 |
| 一直跳過舊 version | 檢查是否使用資料夾最新檔 |
| 張數變少被拒 | 必須上傳完整 catalog |

腳本會拒絕張數變少與 version 倒退。