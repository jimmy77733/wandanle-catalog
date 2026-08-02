# 灣蛋啦｜圖鑑資料

公開託管《灣蛋啦》冷知識圖鑑 JSON（**不含** iOS App 源碼）。

## 下載

- 主站（Firebase Hosting）：  
  https://wandanle-catalog.web.app/knowledge_cards.json
- 本倉庫備援：  
  https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json

檔案：`knowledge_cards.json`（與 `public/knowledge_cards.json` 內容相同）。

## 維護者：上傳備用站（建議主路徑）

當 Gemini Spark／Drive／Apps Script 不穩時，用 **灣蛋配送站** 驗證並以 Fine-grained PAT 寫入本 repo，再由 Action 部署 Firebase。

- 頁面（啟用 Pages 後）：  
  https://jimmy77733.github.io/wandanle-catalog/upload/
- 說明：[`docs/upload/README.md`](docs/upload/README.md)（站門密碼、PAT、Pages、Cloudflare Access）
- 寫入保護：[`docs/repo-protection.md`](docs/repo-protection.md)

**公開可讀 ≠ 路人可 commit。** 寫入需要你的帳號或 PAT。

### 啟用 GitHub Pages（一次）

Settings → Pages → Deploy from branch → `main`／`/docs` → 儲存。

## 可選：Drive → Apps Script

Gemini 在 Drive 資料夾**新建**版本化 JSON → Apps Script 取最新檔寫入本 repo → Action 部署 Firebase。  
設定：[`automation/apps-script/README.md`](automation/apps-script/README.md)。  
此路徑保留；不再當作唯一自動化。

## 工作流解說（公開）

- PDF：[`docs/catalog-automation-workflow.pdf`](docs/catalog-automation-workflow.pdf)
- Markdown：[`docs/catalog-automation-workflow.md`](docs/catalog-automation-workflow.md)
