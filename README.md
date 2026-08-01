# 灣蛋啦圖鑑資料（公開 CDN 鏡像）

此 repo **只放** `knowledge_cards.json`，不含 iOS App 源碼。

## App 下載順序

1. Firebase Hosting：`https://wandanle.web.app/knowledge_cards.json`
2. 本 repo raw（備援）：  
   `https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json`
3. App 內建 `seed_cards.json`

## Gemini Spark／人工更新流程

1. 產出完整 catalog（舊卡 + 新卡，總數只增不減）
2. 覆寫本 repo 根目錄 `knowledge_cards.json` **以及** `public/knowledge_cards.json`（兩者保持相同）
3. `git commit` + `push` 到 `main`
4. （可選）GitHub Action 自動 deploy 到 Firebase Hosting（需設定 secret，見下方）

## 啟用 Firebase 自動部署（一次設定）

1. 安裝工具：`npm i -g firebase-tools`
2. 登入：`firebase login`
3. 確認專案 id 對應 `wandanle.web.app`（必要時改 `.firebaserc`）
4. 產生 CI token：`firebase login:ci` → 複製 token
5. 在本 GitHub repo → Settings → Secrets → Actions 新增：
   - Name: `FIREBASE_TOKEN`
   - Value: 上一步的 token
6. 之後每次 push `main` 會自動 `firebase deploy --only hosting`

沒有設定 secret 時，Action 會略過 Firebase，**raw URL 備援仍可用**。
