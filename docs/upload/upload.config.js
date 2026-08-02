/** 灣蛋配送站設定（可公開；勿寫入 PAT 或明文站門密碼） */
window.WANDANLE_UPLOAD = {
  owner: "jimmy77733",
  repo: "wandanle-catalog",
  branch: "main",
  paths: ["knowledge_cards.json", "public/knowledge_cards.json"],
  liveCatalogURL: "https://wandanle-catalog.web.app/knowledge_cards.json",
  liveCatalogFallbackURL:
    "https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json",
  manifestURL:
    "https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/versions/manifest.json",
  versionFileURL: (path) =>
    `https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/${path}`,
  indexURL:
    "https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/index/catalog_index.json",
  /** Spark／GAS 底稿資料夾（手動引導用） */
  driveFolderURL:
    "https://drive.google.com/drive/folders/1Ayiz2ww87XYRg1nVb1ZDs5nyYF_Px7y7",
  /**
   * GAS Web App「鏡像 GitHub → Drive」URL（部署後貼上 …/exec）。
   * 空白＝發布後只走引導（下載版本檔＋開啟資料夾）。
   */
  driveMirrorWebAppURL:
    "https://script.google.com/macros/s/AKfycbzbYeKGRa-uUQuHzFpwEae6fKDJ1ufgC7e6SS30EZpDE84QIW6DZlHv-EiA0vd6aaQeTw/exec",
  /**
   * 與 GAS Script Property `MIRROR_SECRET` 相同。
   * Web App URL 填好後再填；勿用與 PAT／站門相同的字串。
   */
  driveMirrorSecret: "3KZKEQuEPg0wu5dd",
  /**
   * 站門密碼的 SHA-256（hex，小寫）。明文不進版控。
   * 重算：echo -n '新密碼' | shasum -a 256
   */
  gateHash:
    "dc2b88d86d4327e61d52fc737d5a2eba53eb04bd7ce34e3a74805a267c4b72e8",
};
