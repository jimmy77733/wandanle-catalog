# 倉庫寫入保護（wandanle-catalog）

## 公開讀 ≠ 公開寫

本 repo 公開是為了讓 App／CDN 讀取圖鑑 JSON。  
**任何人都可以 clone／fork／開 Pull Request；沒有寫入權就不能改 `main`。**

真正風險：PAT 外洩、或誤加 Collaborator——不是「被搜到」。

## 建議 Ruleset（請在 GitHub UI 啟用）

Settings → Rules → Rulesets → New：

| 項目 | 設定 |
|------|------|
| Name | `protect-main-catalog` |
| Enforcement | Active |
| Target | `main` |
| Restrict deletions | ✅ |
| Block force pushes | ✅ |
| Restrict who can push | 只允許維護者帳號（如 `jimmy77733`） |
| Require pull request | ❌（一人維護＋上傳站直推需要） |

詳細步驟與 PAT／站門密碼：見 [`upload/README.md`](./upload/README.md)。

## Action 第二關

[`.github/workflows/publish.yml`](../.github/workflows/publish.yml) 部署前執行 [`scripts/validate_catalog.py`](../scripts/validate_catalog.py)：

- Schema／id 唯一／category
- 相對上一版：**禁止張數變少、禁止 version 倒退**
- 失敗 → 不部署 Firebase（Git 上仍可能有該 commit，可手動 revert）

## App 緩衝

iOS App 遠端圖鑑先 stage，每日 ≥08:00 才揭曉可見數量——惡意灌檔不會立刻全部進畫面，但**不能**當成簽章驗證。
