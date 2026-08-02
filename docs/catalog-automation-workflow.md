# 內容自動化發布工作流解說

**適用對象：** 想了解如何把「AI／人工產出的靜態 JSON」送到公開 CDN，供 App 或網站抓取的人。

**參考實作：** [jimmy77733/wandanle-catalog](https://github.com/jimmy77733/wandanle-catalog)  
**文件版本：** 2026-08-02

> 密鑰、私人資料夾 ID 等不以明文出現在公開文件中。公開 URL 可作為可驗證實例。

---

## 1. 目標架構

```text
內容生產者（人工或 AI）
  → 產出「完整」資料檔（非增量片段）
  → 寫入公開資料倉庫（需寫入權）
  → CI 驗證並部署 CDN
  → 客戶端：CDN → raw 備援 → 內建 seed
```

本倉庫實例：

| 角色 | 實作 |
|------|------|
| 資料倉庫 | 本 GitHub repo（公開讀） |
| 驗證／發布輔助頁 | [灣蛋配送站](./upload/) |
| CI 部署 | GitHub Action → Firebase Hosting |
| CDN | https://wandanle-catalog.web.app/knowledge_cards.json |
| raw 備援 | https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json |

寫入控管見 [`repo-protection.md`](./repo-protection.md)。

---

## 2. 為什麼常拆成「產內容」與「發布」？

許多 AI 助理可以協助產出或暫存檔案，但通常：

- 不宜持有／長期保存 API Token  
- 不便可靠地直接 `git push` 或呼叫需密鑰的 API  
- 部分雲端硬碟工具能**新建**檔案，卻無法覆寫既有檔內容  

因此常見切法是：AI／編輯只負責合法完整 JSON；**持有密鑰的橋接**（網頁＋token、腳本、或排程服務）才寫入資料倉庫與 CDN。

---

## 3. 路徑 A：靜態驗證頁寫入（本專案主要說明）

```text
完整 knowledge_cards.json
  → 配送站驗證（結構／防倒退）
  → 以授權 token 更新倉庫內 JSON
  → Action 再驗證 → 部署 Firebase
```

頁面說明：[`upload/README.md`](./upload/README.md)。

---

## 4. 路徑 B：中繼資料夾＋排程橋接（可選）

適用於希望「檔案進資料夾後自動同步」的情境：

```text
內容端在中繼區新建版本化 JSON
  → 排程腳本取最新符合命名規則的檔
  → Contents API 寫入公開資料 repo
  → 同上 Action 部署
```

本倉庫可選實作：[`automation/apps-script/`](../automation/apps-script/)。  
要點：以資料夾內**最新**檔為準；腳本做 schema 與防倒退檢查；密鑰放在腳本屬性／Secret，不進 Skill 或截圖。

---

## 5. 資料契約

根鍵恰好：`version`、`updatedAt`、`cards`。  
每卡：`id`、`title`、`content`、`category`、`sourceName`、`sourceURL`、`funFactValue`。  
`category` 僅 `history`｜`food`｜`geo`；`sourceURL` 為字串或 `null`（禁止 `""`）。  
更新應為完整 catalog；張數不得少於上一版；`version` 不得倒退。前端頁與 Action 雙重驗證。

---

## 6. 客戶端抓取順序（建議）

1. Hosting CDN  
2. GitHub raw  
3. 內建 seed  

合并策略：以 `id` upsert；遠端變少時客戶端可不刪本地既有資料。

---

## 7. 安全原則（公開專案適用）

- 公開資料倉庫不放 App 原始碼與後台金鑰  
- Token 最小授權、僅綁資料倉庫必要權限  
- 文件與示範截圖勿出現完整密鑰  
- 「公開可讀」不代表訪客可寫入 `main`

---

## 8. 套用到其他專案

| 本專案 | 可替換為 |
|--------|----------|
| 圖鑑 JSON | 題庫、目錄、關卡表、字串包 |
| 配送站／橋接腳本 | 任何持密鑰的發布步驟 |
| Firebase Hosting | 其他靜態 CDN／Pages／物件儲存 |

核心不變：**產完整檔 → 授權寫入資料倉庫 → CI 驗證上 CDN → 客戶端只讀。**

---

## 9. 本倉庫索引

| 路徑 | 說明 |
|------|------|
| `knowledge_cards.json` / `public/…` | 公開圖鑑 |
| `docs/upload/` | 驗證／發布頁 |
| `.github/workflows/publish.yml` | 驗證＋部署 |
| `scripts/validate_catalog.py` | CI 驗證腳本 |
| `automation/apps-script/` | 可選中繼同步 |
| `docs/repo-protection.md` | 寫入保護說明 |

---

*公開資料倉庫文件；不含私人 App 原始碼與真實密鑰。*
