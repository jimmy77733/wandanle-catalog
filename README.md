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

更新原則：以**完整 catalog** 為線上主檔；`version` 遞增；總張數不得少於上一版。部署前由 GitHub Action 再驗證。

## 怎麼更新到線上？

```text
完整圖鑑（或增量合并後的完整檔）
  → 灣蛋配送站驗證／預覽／發布
  → 寫入本倉庫（主檔 + public/ + 版本封存 + 索引）
  → GitHub Action 驗證並部署 Firebase
  → App／網站讀取 CDN（失敗則 raw）
```

- **配送站：** https://jimmy77733.github.io/wandanle-catalog/upload/  
  使用說明：[`docs/upload/README.md`](docs/upload/README.md)
- 版本封存：`versions/`（完整快照 + `manifest.json`）
- 給內容產線用的精簡索引：`index/catalog_index.json`
- 增量示例目錄：`deltas/`（合并腳本見 `scripts/merge_delta.py`）

本倉庫**公開可讀**；寫入僅限具備權限的維護者。說明：[`docs/repo-protection.md`](docs/repo-protection.md)。

## 更多解說

- 架構說明：[`docs/catalog-automation-workflow.md`](docs/catalog-automation-workflow.md)
- PDF：[`docs/catalog-automation-workflow.pdf`](docs/catalog-automation-workflow.pdf)
