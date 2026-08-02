# 灣蛋啦｜圖鑑資料

公開託管 iOS App《灣蛋啦》使用的冷知識圖鑑 JSON（**不含** App 原始碼）。

## 下載

| 來源 | URL |
|------|-----|
| 主站（Firebase Hosting） | https://wandanle-catalog.web.app/knowledge_cards.json |
| 本倉庫備援（raw） | https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json |

檔案：`knowledge_cards.json`（與 `public/knowledge_cards.json` 內容相同）。

## 資料格式（摘要）

根物件僅含：`version`、`updatedAt`、`cards`。  
每張卡含：`id`、`title`、`content`、`category`（`history`｜`food`｜`geo`）、`sourceName`、`sourceURL`、`funFactValue`。

更新原則：以**完整 catalog** 覆寫；`version` 遞增；總張數不得少於上一版。部署前由 GitHub Action 再驗證一次。

## 怎麼更新到線上？

維護流程（概念）：

```text
產出完整 knowledge_cards.json
  → 寫入本倉庫（根目錄與 public/）
  → GitHub Action 驗證並部署 Firebase
  → App／網站讀取 CDN（失敗則改讀 raw）
```

實務上可透過：

- **灣蛋配送站**（靜態驗證／發布頁）：https://jimmy77733.github.io/wandanle-catalog/upload/
- 或具有本倉庫寫入權的 git／API 流程  
- （可選）外部中繼區同步進本倉庫，見 [`automation/apps-script/`](automation/apps-script/)

本倉庫**公開可讀**；寫入僅限具備權限的維護者。說明見 [`docs/repo-protection.md`](docs/repo-protection.md)。

配送站頁面說明：[`docs/upload/README.md`](docs/upload/README.md)。

## 更多解說

- 架構說明：[`docs/catalog-automation-workflow.md`](docs/catalog-automation-workflow.md)
- PDF：[`docs/catalog-automation-workflow.pdf`](docs/catalog-automation-workflow.pdf)
