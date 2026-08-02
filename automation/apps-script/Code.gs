/**
 * 灣蛋啦圖鑑：Google Drive ↔ GitHub（wandanle-catalog）轉發腳本
 *
 * 設定（專案設定 → 指令碼屬性 Script properties）：
 *   GITHUB_TOKEN     Fine-grained PAT，僅授權 jimmy77733/wandanle-catalog Contents: Read and write
 *   DRIVE_FOLDER_ID  （建議）「灣蛋啦圖鑑」資料夾 ID；腳本會取其中最新的 knowledge_cards*.json
 *   DRIVE_FILE_ID    （備援）單一檔案 ID；僅在未設 DRIVE_FOLDER_ID 時使用
 *   GITHUB_OWNER     預設 jimmy77733
 *   GITHUB_REPO      預設 wandanle-catalog
 *   GITHUB_BRANCH    預設 main
 *   MIRROR_SECRET    （建議）Web App 鏡像用密鑰；與配送站 upload.config.js 的 driveMirrorSecret 相同
 *
 * 為何用資料夾而不是固定檔案：
 *   部分 AI（如 Gemini Spark）的 Drive 工具只能「新建檔」或改 metadata，
 *   無法覆寫既有 JSON 內容。改為每次上傳新檔，由此腳本挑最新一份同步。
 *
 * 觸發：
 *   - 時間驅動（建議每 15–60 分鐘）執行 syncCatalogFromDrive（Drive → GitHub）
 *   - 配送站發布後呼叫 Web App mirrorCatalogToDrive（GitHub → Drive 新建底稿）
 */

var DEFAULT_OWNER = 'jimmy77733';
var DEFAULT_REPO = 'wandanle-catalog';
var DEFAULT_BRANCH = 'main';
var ROOT_PATH = 'knowledge_cards.json';
var PUBLIC_PATH = 'public/knowledge_cards.json';
/** 檔名需以此開頭且以 .json 結尾，例如 knowledge_cards.json / knowledge_cards_v7_20260801.json */
var FILE_NAME_PREFIX = 'knowledge_cards';

function syncCatalogFromDrive() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var owner = props.getProperty('GITHUB_OWNER') || DEFAULT_OWNER;
  var repo = props.getProperty('GITHUB_REPO') || DEFAULT_REPO;
  var branch = props.getProperty('GITHUB_BRANCH') || DEFAULT_BRANCH;

  if (!token) {
    throw new Error('缺少 Script Property：GITHUB_TOKEN');
  }

  var picked = resolveDriveCatalogFile_(props);
  var raw = picked.file.getBlob().getDataAsString('UTF-8');
  var catalog = validateCatalog_(raw);
  var pretty = JSON.stringify(catalog, null, 2) + '\n';

  Logger.log(
    '來源檔：' +
      picked.file.getName() +
      ' id=' +
      picked.file.getId() +
      ' updated=' +
      picked.file.getLastUpdated()
  );

  var remote = fetchGitHubJson_(owner, repo, ROOT_PATH, branch, token);
  if (remote && remote.catalog) {
    assertNotRegressing_(remote.catalog, catalog);
    if (
      remote.catalog.version === catalog.version &&
      remote.catalog.cards.length === catalog.cards.length &&
      remote.sha
    ) {
      var same =
        JSON.stringify(
          remote.catalog.cards
            .map(function (c) {
              return c.id;
            })
            .sort()
        ) ===
        JSON.stringify(
          catalog.cards
            .map(function (c) {
              return c.id;
            })
            .sort()
        );
      if (same) {
        Logger.log('GitHub 已是相同 version/ids，跳過。version=' + catalog.version);
        return { skipped: true, version: catalog.version, total: catalog.cards.length };
      }
    }
  }

  var rootSha = remote && remote.sha ? remote.sha : null;
  putGitHubFile_(
    owner,
    repo,
    ROOT_PATH,
    branch,
    token,
    pretty,
    rootSha,
    'catalog: sync v' + catalog.version + ' (' + catalog.cards.length + ' cards) from Drive'
  );

  var publicMeta = fetchGitHubJson_(owner, repo, PUBLIC_PATH, branch, token);
  var publicSha = publicMeta && publicMeta.sha ? publicMeta.sha : null;
  putGitHubFile_(
    owner,
    repo,
    PUBLIC_PATH,
    branch,
    token,
    pretty,
    publicSha,
    'catalog: sync public/ v' + catalog.version + ' from Drive'
  );

  Logger.log('已更新 GitHub。version=' + catalog.version + ' total=' + catalog.cards.length);
  return {
    skipped: false,
    version: catalog.version,
    total: catalog.cards.length,
    driveFile: picked.file.getName()
  };
}

/**
 * GitHub → Drive：把 main 上最新 knowledge_cards.json 新建為版本檔，供 Spark 當底稿。
 * 編輯器手動執行此函式（不檢查 MIRROR_SECRET）。Web App 請走 doGet／doPost。
 */
function mirrorCatalogToDrive() {
  return mirrorCatalogToDriveCore_();
}

/** Web App 用：需通過 MIRROR_SECRET（若有設定）。 */
function mirrorCatalogToDriveWithSecret_(providedSecret) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('MIRROR_SECRET');
  if (expected) {
    if (!providedSecret || providedSecret !== expected) {
      throw new Error('MIRROR_SECRET 不符或未提供');
    }
  }
  return mirrorCatalogToDriveCore_();
}

function mirrorCatalogToDriveCore_() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var owner = props.getProperty('GITHUB_OWNER') || DEFAULT_OWNER;
  var repo = props.getProperty('GITHUB_REPO') || DEFAULT_REPO;
  var branch = props.getProperty('GITHUB_BRANCH') || DEFAULT_BRANCH;
  var folderId = props.getProperty('DRIVE_FOLDER_ID');

  if (!token) {
    throw new Error('缺少 Script Property：GITHUB_TOKEN');
  }
  if (!folderId) {
    throw new Error('缺少 Script Property：DRIVE_FOLDER_ID（鏡像必須寫入資料夾）');
  }

  var remote = fetchGitHubJson_(owner, repo, ROOT_PATH, branch, token);
  if (!remote || !remote.catalog) {
    throw new Error('GitHub 上找不到 ' + ROOT_PATH);
  }
  var catalog = validateCatalog_(JSON.stringify(remote.catalog));
  var pretty = JSON.stringify(catalog, null, 2) + '\n';
  var fileName = 'knowledge_cards_v' + catalog.version + '_' + todayYmd_() + '.json';

  try {
    var picked = resolveDriveCatalogFile_(props);
    var driveRaw = picked.file.getBlob().getDataAsString('UTF-8');
    var driveCat = validateCatalog_(driveRaw);
    if (
      driveCat.version === catalog.version &&
      driveCat.cards.length === catalog.cards.length
    ) {
      Logger.log(
        'Drive 最新底稿已是 version=' +
          catalog.version +
          '／' +
          catalog.cards.length +
          ' 張，跳過。檔=' +
          picked.file.getName()
      );
      return {
        ok: true,
        skipped: true,
        version: catalog.version,
        total: catalog.cards.length,
        fileName: picked.file.getName(),
        message: 'Drive 底稿已是最新，無需新建'
      };
    }
  } catch (e) {
    Logger.log('讀取既有 Drive 底稿略過比對：' + e);
  }

  var folder = DriveApp.getFolderById(folderId);
  var created = folder.createFile(fileName, pretty, MimeType.PLAIN_TEXT);
  Logger.log(
    '已新建 Drive 底稿：' +
      created.getName() +
      ' id=' +
      created.getId() +
      ' version=' +
      catalog.version
  );
  return {
    ok: true,
    skipped: false,
    version: catalog.version,
    total: catalog.cards.length,
    fileName: created.getName(),
    fileId: created.getId(),
    message: '已新建 Drive 底稿 ' + created.getName()
  };
}

/** Web App：GET ?action=mirror&secret=... */
function doGet(e) {
  return handleMirrorHttp_(e && e.parameter ? e.parameter : {});
}

/**
 * Web App：POST body 為 JSON 或 text/plain JSON
 * { "action": "mirror", "secret": "..." }
 * Content-Type 建議 text/plain，避免瀏覽器 CORS preflight。
 */
function doPost(e) {
  var params = {};
  try {
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: 'JSON 解析失敗：' + err });
  }
  if (e && e.parameter) {
    for (var k in e.parameter) {
      if (Object.prototype.hasOwnProperty.call(e.parameter, k) && params[k] == null) {
        params[k] = e.parameter[k];
      }
    }
  }
  return handleMirrorHttp_(params);
}

function handleMirrorHttp_(params) {
  try {
    var action = params.action || 'mirror';
    if (action !== 'mirror') {
      return jsonOut_({ ok: false, error: '未知 action：' + action });
    }
    var result = mirrorCatalogToDriveWithSecret_(params.secret || null);
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err.message || err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function todayYmd_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd');
}

/** 可選：若 JSON 較小（payload < ~60KB），改打 repository_dispatch。大檔請用 syncCatalogFromDrive。 */
function dispatchCatalogFromDrive() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var owner = props.getProperty('GITHUB_OWNER') || DEFAULT_OWNER;
  var repo = props.getProperty('GITHUB_REPO') || DEFAULT_REPO;

  if (!token) {
    throw new Error('需要 GITHUB_TOKEN');
  }

  var picked = resolveDriveCatalogFile_(props);
  var raw = picked.file.getBlob().getDataAsString('UTF-8');
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
  Logger.log('已送出 catalog-update dispatch；來源=' + picked.file.getName());
  return { dispatched: true, driveFile: picked.file.getName() };
}

// --- Drive resolve ---

/**
 * 優先 DRIVE_FOLDER_ID：在資料夾內找檔名以 knowledge_cards 開頭、.json 結尾的最新檔。
 * 否則退回 DRIVE_FILE_ID。
 */
function resolveDriveCatalogFile_(props) {
  var folderId = props.getProperty('DRIVE_FOLDER_ID');
  if (folderId) {
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var best = null;
    var bestTime = 0;
    while (files.hasNext()) {
      var f = files.next();
      var name = f.getName();
      if (!isCatalogFileName_(name)) {
        continue;
      }
      var t = f.getLastUpdated().getTime();
      if (t >= bestTime) {
        bestTime = t;
        best = f;
      }
    }
    if (!best) {
      throw new Error(
        '資料夾內找不到 knowledge_cards*.json。請讓 AI 上傳新檔，或檢查 DRIVE_FOLDER_ID。'
      );
    }
    return { file: best, mode: 'folder' };
  }

  var fileId = props.getProperty('DRIVE_FILE_ID');
  if (!fileId) {
    throw new Error('請設定 DRIVE_FOLDER_ID（建議）或 DRIVE_FILE_ID');
  }
  return { file: DriveApp.getFileById(fileId), mode: 'file' };
}

function isCatalogFileName_(name) {
  if (!name || name.charAt(0) === '.') {
    return false;
  }
  var lower = name.toLowerCase();
  return (
    lower.indexOf(FILE_NAME_PREFIX) === 0 &&
    lower.slice(-5) === '.json'
  );
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
    throw new Error('拒絕覆寫：新 version ' + newCat.version + ' < 線上 ' + oldCat.version);
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
