# 灣蛋配送站（使用說明）

網址：https://jimmy77733.github.io/wandanle-catalog/upload/

這是《灣蛋啦》圖鑑資料的**驗證、預覽與發布頁**。倉庫本身公開可讀；寫入線上資料需要維護者授權。

## 可以做什麼

1. **載入圖鑑**  
   - 完整 `knowledge_cards.json`  
   - 或增量檔（含 `baseVersion` 與新卡列表）  
   - 或一鍵「載入線上版」

2. **預覽與編輯（美化卡面）**  
   - 依**種類**、**來源**篩選，並可搜尋  
   - 可修改：**標題**、**內容**、**趣味標籤**  
   - **種類**、**來源**、編號為唯讀（既有卡）  
   - **套用變更**／**下載工作檔**

3. **新增題目**  
   - 選擇種類（三種固定顏色分類）  
   - 來源可從既有清單選或自行輸入  
   - 編號自動產生  

4. **版本差異／版本紀錄**  
   - 以卡面方式查看新增、修改、刪除  
   - 下載歷史完整檔，或指定某版當差異基準  

5. **上傳並發布**  
   - 貼上具備本倉庫寫入權限的 GitHub token  
   - 成功後會更新公開圖鑑，並由自動化流程部署到 CDN  

## 種類中文對照

| 顯示 | 內部值 |
|------|--------|
| 歷史與怪談 | history |
| 美食與生活 | food |
| 地理與奇葩 | geo |

## 公開資料在哪裡

- CDN：https://wandanle-catalog.web.app/knowledge_cards.json  
- GitHub：https://github.com/jimmy77733/wandanle-catalog  

專案總覽：https://github.com/jimmy77733/wandanle-catalog/blob/main/README.md  

寫入保護說明：[`../repo-protection.md`](../repo-protection.md)
