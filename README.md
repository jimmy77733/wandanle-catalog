# 灣蛋啦｜圖鑑資料

公開託管《灣蛋啦》冷知識圖鑑 JSON（**不含** iOS App 源碼）。

## 下載

- 主站（Firebase Hosting）：  
  https://wandanle-catalog.web.app/knowledge_cards.json
- 本倉庫備援：  
  https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json

檔案：`knowledge_cards.json`（與 `public/knowledge_cards.json` 內容相同）。

## 自動更新（維護者）

Gemini 寫入 Google Drive 後，由 Apps Script 轉寫本 repo，再由 GitHub Action 部署 Firebase。  
設定說明見 [`automation/apps-script/README.md`](automation/apps-script/README.md)。

## 工作流解說（公開文件）

整套「內容 → CDN」自動化流程、為何這樣設計、如何複用到其他專案（密鑰皆隱碼）：

- PDF：[`docs/catalog-automation-workflow.pdf`](docs/catalog-automation-workflow.pdf)
- Markdown：[`docs/catalog-automation-workflow.md`](docs/catalog-automation-workflow.md)
