/**
 * 灣蛋啦圖鑑：Google Drive → GitHub（wandanle-catalog）轉發腳本
 *
 * 設定（專案設定 → 指令碼屬性 Script properties）：
 *   GITHUB_TOKEN   Fine-grained PAT，僅授權 jimmy77733/wandanle-catalog Contents: Read and write
 *   DRIVE_FILE_ID  Drive 上 knowledge_cards.json 的檔案 ID（網址 /d/FILE_ID/ 那段）
 *   GITHUB_OWNER   預設 jimmy77733
 *   GITHUB_REPO    預設 wandanle-catalog
 *   GITHUB_BRANCH  預設 main
 *
 * 觸發：時間驅動（建議每 15–60 分鐘）執行 syncCatalogFromDrive
 * 或手動在編輯器選 syncCatalogFromDrive → 執行
 */

var DEFAULT_OWNER = 'jimmy77733';
var DEFAULT_REPO = 'wandanle-catalog';
var DEFAULT_BRANCH = 'main';
var ROOT_PATH = 'knowledge_cards.json';
var PUBLIC_PATH = 'public/knowledge_cards.json';

function syncCatalogFromDrive() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var fileId = props.getProperty('DRIVE_FILE_ID');
  var owner = props.getProperty('GITHUB_OWNER') || DEFAULT_OWNER;
  var repo = props.getProperty('GITHUB_REPO') || DEFAULT_REPO;
  var branch = props.getProperty('GITHUB_BRANCH') || DEFAULT_BRANCH;

  if (!token) {
    throw new Error('缺少 Script Property：GITHUB_TOKEN');
  }
  if (!fileId) {
    throw new Error('缺少 Script Property：DRIVE_FILE_ID');
  }

  var raw = DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8');
  var catalog = validateCatalog_(raw);
  var pretty = JSON.stringify(catalog, null, 2) + '\n';

  var remote = fetchGitHubJson_(owner, repo, ROOT_PATH, branch, token);
  if (remote && remote.catalog) {
    assertNotRegressing_(remote.catalog, catalog);
    if (remote.catalog.version === catalog.version &&
        remote.catalog.cards.length === catalog.cards.length &&
        remote.sha) {
      // 以 version + 張數判斷大致相同則略過（避免無謂 commit）
      var same = JSON.stringify(remote.catalog.cards.map(function (c) { return c.id; }).sort()) ===
        JSON.stringify(catalog.cards.map(function (c) { return c.id; }).sort());
      if (same) {
        Logger.log('GitHub 已是相同 version/ids，跳過。version=' + catalog.version);
        return { skipped: true, version: catalog.version, total: catalog.cards.length };
      }
    }
  }

  var rootSha = remote && remote.sha ? remote.sha : null;
  putGitHubFile_(owner, repo, ROOT_PATH, branch, token, pretty, rootSha,
    'catalog: sync v' + catalog.version + ' (' + catalog.cards.length + ' cards) from Drive');

  var publicMeta = fetchGitHubJson_(owner, repo, PUBLIC_PATH, branch, token);
  var publicSha = publicMeta && publicMeta.sha ? publicMeta.sha : null;
  putGitHubFile_(owner, repo, PUBLIC_PATH, branch, token, pretty, publicSha,
    'catalog: sync public/ v' + catalog.version + ' from Drive');

  Logger.log('已更新 GitHub。version=' + catalog.version + ' total=' + catalog.cards.length);
  return { skipped: false, version: catalog.version, total: catalog.cards.length };
}

/** 可選：若 JSON 較小（payload < ~60KB），改打 repository_dispatch 給 Action 寫檔。大檔請用 syncCatalogFromDrive。 */
function dispatchCatalogFromDrive() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var fileId = props.getProperty('DRIVE_FILE_ID');
  var owner = props.getProperty('GITHUB_OWNER') || DEFAULT_OWNER;
  var repo = props.getProperty('GITHUB_REPO') || DEFAULT_REPO;

  if (!token || !fileId) {
    throw new Error('需要 GITHUB_TOKEN 與 DRIVE_FILE_ID');
  }

  var raw = DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8');
  validateCatalog_(raw);

  if (raw.length > 60000) {
    throw new Error('檔案太大無法用 repository_dispatch（約限 64KB）。請改跑 syncCatalogFromDrive。');
  }

  var url = 'https://api.github.com/repos/' + owner + '/' + repo + '/dispatches';
  var payload = {
    event_type: 'catalog-update',
    client_payload: {
      source: 'google-drive',
      catalog_text: raw
    }
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code !== 204 && code !== 200) {
    throw new Error('repository_dispatch 失敗 HTTP ' + code + ' ' + res.getContentText());
  }
  Logger.log('已送出 catalog-update dispatch');
  return { dispatched: true };
}

// --- validation ---

function validateCatalog_(raw) {
  var data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error('不是合法 JSON：' + e);
  }

  var keys = Object.keys(data).sort();
  if (keys.join(',') !== 'cards,updatedAt,version') {
    throw new Error('根鍵必須剛好是 version, updatedAt, cards');
  }
  if (typeof data.version !== 'number' || !isFinite(data.version)) {
    throw new Error('version 必須是數字');
  }
  if (typeof data.updatedAt !== 'string' || !data.updatedAt) {
    throw new Error('updatedAt 必須是字串');
  }
  if (!Array.isArray(data.cards) || data.cards.length < 1) {
    throw new Error('cards 必須是非空陣列');
  }

  var allowed = { history: true, food: true, geo: true };
  var need = ['id', 'title', 'content', 'category', 'sourceName', 'sourceURL', 'funFactValue'];
  var seen = {};

  for (var i = 0; i < data.cards.length; i++) {
    var c = data.cards[i];
    for (var k = 0; k < need.length; k++) {
      if (!Object.prototype.hasOwnProperty.call(c, need[k])) {
        throw new Error('卡片缺少欄位 ' + need[k] + ' @ index ' + i);
      }
    }
    if (!allowed[c.category]) {
      throw new Error('非法 category：' + c.category + ' id=' + c.id);
    }
    if (c.sourceURL !== null && typeof c.sourceURL !== 'string') {
      throw new Error('sourceURL 必須是 string 或 null，id=' + c.id);
    }
    if (c.sourceURL === '') {
      throw new Error('sourceURL 不可為空字串，id=' + c.id);
    }
    if (seen[c.id]) {
      throw new Error('重複 id：' + c.id);
    }
    seen[c.id] = true;
  }

  return data;
}

function assertNotRegressing_(oldCat, newCat) {
  if (newCat.cards.length < oldCat.cards.length) {
    throw new Error(
      '拒絕覆寫：新檔張數 ' + newCat.cards.length + ' < 線上 ' + oldCat.cards.length + '（防清空）'
    );
  }
  if (newCat.version < oldCat.version) {
    throw new Error(
      '拒絕覆寫：新 version ' + newCat.version + ' < 線上 ' + oldCat.version
    );
  }
}

// --- GitHub helpers ---

function fetchGitHubJson_(owner, repo, path, branch, token) {
  var url =
    'https://api.github.com/repos/' +
    owner +
    '/' +
    repo +
    '/contents/' +
    path +
    '?ref=' +
    encodeURIComponent(branch);

  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code === 404) {
    return null;
  }
  if (code < 200 || code >= 300) {
    throw new Error('讀取 GitHub ' + path + ' 失敗 HTTP ' + code + ' ' + res.getContentText());
  }

  var body = JSON.parse(res.getContentText());
  var decoded = Utilities.newBlob(Utilities.base64Decode(body.content)).getDataAsString('UTF-8');
  return { sha: body.sha, catalog: JSON.parse(decoded) };
}

function putGitHubFile_(owner, repo, path, branch, token, text, sha, message) {
  var url = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path;
  var payload = {
    message: message,
    content: Utilities.base64Encode(text, Utilities.Charset.UTF_8),
    branch: branch
  };
  if (sha) {
    payload.sha = sha;
  }

  var res = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('寫入 GitHub ' + path + ' 失敗 HTTP ' + code + ' ' + res.getContentText());
  }
}
