# 倉庫寫入保護說明

## 公開讀 ≠ 公開寫

本倉庫公開是為了讓 App／網站下載圖鑑 JSON。  
任何人都可以瀏覽、clone、fork 或提出 Pull Request；**沒有寫入權就不能直接修改 `main` 上的檔案**。

因此「被搜到公開 repo」本身不會讓路人覆寫線上圖鑑；風險主要來自**寫入憑證外洩**或誤授協作權限。

## 本專案採用的保護

### 1. 分支規則（Ruleset）

對預設分支（`main`）套用規則，例如：

- 禁止 force push、限制刪除分支  
- 限制可直接更新該分支的帳號  

未具備寫入權的帳號無法對受保護分支完成有效推送。具體規則以 GitHub 倉庫 Settings → Rules → Rulesets 為準。

### 2. 部署前內容驗證

[`.github/workflows/publish.yml`](../.github/workflows/publish.yml) 在部署 Firebase 前執行 [`scripts/validate_catalog.py`](../scripts/validate_catalog.py)：

- JSON schema、`category`、id 唯一  
- 相對上一版：**禁止張數變少、禁止 version 倒退**  
- 驗證失敗 → **不部署 CDN**（必要時可由維護者在 Git 歷史中還原）

### 3. 客戶端緩衝（App）

《灣蛋啦》App 對遠端圖鑑採「先暫存、再於每日時段揭曉可見數量」的策略，降低一次異常更新立刻影響畫面的衝擊。這**不是**密碼學簽章，不能代替倉庫寫入控管。

## 與配送站的關係

[灣蛋配送站](./upload/) 可協助驗證並由**已授權**的維護流程寫入本倉庫。  
站門密碼僅隱藏操作介面；真正能否改檔仍取決於 GitHub 權限。
