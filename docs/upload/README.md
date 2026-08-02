# 灣蛋配送站

《灣蛋啦》圖鑑 JSON 的**驗證與發布頁**（GitHub Pages 靜態站）。

網址：https://jimmy77733.github.io/wandanle-catalog/upload/

## 這頁做什麼

1. 檢查上傳的完整 `knowledge_cards.json`（結構、`category`、id 唯一）  
2. 與線上版比較：禁止張數變少、禁止 `version` 倒退  
3. 預覽 version／總張數／相對線上新增數  
4. （可選）以具備本倉庫寫入權的 GitHub token 更新 `knowledge_cards.json` 與 `public/knowledge_cards.json`  
5. 觸發既有 GitHub Action：再驗證後部署 Firebase CDN  

也可只做「驗證並下載」，不必寫入倉庫。

專案總覽：https://github.com/jimmy77733/wandanle-catalog/blob/main/README.md

## 誰可以寫入

- 倉庫**公開讀取**；任意訪客可開本頁、可 fork／開 PR。  
- **直接改 `main` 上的圖鑑檔**需要 GitHub 寫入授權（維護者帳號或 scoped token）。  
- 頁面的站門密碼只控制「是否顯示上傳表單」，**不能**取代倉庫寫入權。  
- 寫入保護與 Action 驗證：見 [`../repo-protection.md`](../repo-protection.md)。

## 技術位置

原始檔位於本倉庫 `docs/upload/`（Pages 來源為 `main` 的 `/docs`）。  
Token **不會**寫進倉庫；僅暫存在使用者瀏覽器工作階段。
