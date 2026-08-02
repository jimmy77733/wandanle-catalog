/** 灣蛋配送站設定（可公開；勿寫入 PAT 或明文站門密碼） */
window.WANDANLE_UPLOAD = {
  owner: "jimmy77733",
  repo: "wandanle-catalog",
  branch: "main",
  paths: ["knowledge_cards.json", "public/knowledge_cards.json"],
  /** 線上底稿（驗證用） */
  liveCatalogURL: "https://wandanle-catalog.web.app/knowledge_cards.json",
  liveCatalogFallbackURL:
    "https://raw.githubusercontent.com/jimmy77733/wandanle-catalog/main/knowledge_cards.json",
  /**
   * 站門密碼的 SHA-256（hex，小寫）。明文不進版控。
   * 重算：echo -n '新密碼' | shasum -a 256
   */
  gateHash:
    "eea849cd81d115c1b35aa76f3ccdf599c929467df12d7e44ee1d97c3674d5fa1",
};
