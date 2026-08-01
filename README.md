# 灣蛋啦｜圖鑑資料

公開託管《灣蛋啦》冷知識圖鑑 JSON（**不含** iOS App 源碼）。

## 下載

- 主站（Firebase Hosting）：  
  https://wandanle-catalog.web.app/knowledge_cards.json
- 本倉庫備援：  
  https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json

檔案：`knowledge_cards.json`（與 `public/knowledge_cards.json` 內容相同）。

## 自動更新（維護者）

Gemini 在 Drive 資料夾**新建**版本化 JSON → Apps Script 取最新檔寫入本 repo → GitHub Action 部署 Firebase。  
設定：[`automation/apps-script/README.md`](automation/apps-script/README.md)。

## 工作流解說（公開）

- PDF：[`docs/catalog-automation-workflow.pdf`](docs/catalog-automation-workflow.pdf)
- Markdown：[`docs/catalog-automation-workflow.md`](docs/catalog-automation-workflow.md)
