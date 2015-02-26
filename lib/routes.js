var Base62 = require('base62');

var config = require('./config.js');
var postgres = config.postgres,
    redis = config.redis;

// Routes
var authRoute = require('./routes/auth.js'),
    loadScriptsRoute = require('./routes/load_scripts.js'),
    shareRoute = require('./routes/share.js'),
    permissionInfoRoute = require('./routes/permission_info.js'),
    exportHtmlRoute = require('./routes/export_html.js'),
    blobInfoRoute = require('./routes/blob_info.js'),
    defaultPermissionsRoute = require('./routes/default_permissions.js'),
    pingRoute = require('./routes/ping.js'),
    configRoute = require('./routes/config.js'),
    dataPatchRoute = require('./routes/data_patch.js'),
    nameUpdateRoute = require('./routes/name_update.js'),
    clientEventRoute = require('./routes/client_event.js'),
    assetsRoute = require('./routes/assets.js'),
    diffsRoute = require('./routes/diffs.js'),
    keysRoute = require('./routes/keys.js'),
    encryptDocumentRoute = require('./routes/encrypt_document.js'),
    wolframRoute = require('./routes/wolfram.js');

function userAuth(docId, userEmail, callback) {
  var info;
  postgres.query('SELECT level FROM permissions WHERE file_id = $1 AND user_email = $2', [docId, userEmail]).on('row', function(row) {
    info = row;
  }).on('end', function() {
    if (info) {
      callback(info.level);
    } else {
      postgres.query('SELECT visibility, default_level FROM ws_files WHERE id = $1', [docId]).
      on('row', function(row) {
        if (row.visibility === 'private') {
          callback('none');
        } else {
          callback(row.default_level);
        }
      });
    }
  });
}

function wsConnection(ws) {
  console.log('Connection: ', ws.upgradeReq.url);
  var url = ws.upgradeReq.url;
  var base = url.split('?')[0];
  var parts = base.split('/');
  console.log(parts);
  ws.docId = Base62.decode(parts[1]);
  if (parts[2] !== 'edit' && parts[2] !== 'view') {
    return;
  }

  // Helper Functions
  ws.sendJSON = function(json) {
    this.send(JSON.stringify(json), function(err) {
      if (err) {
        console.error('WS ERROR', err);
      }
    });
  };
  ws.error = function(msg) {
    ws.sendJSON({
      type: 'error',
      reason: msg
    });
  };

  // Handlers
  ws.on('close', function() {
    if (ws.redisSock) {
      ws.redisSock.quit();
    }
  });
  ws.on('message', function(message) {
    var data = JSON.parse(message);
    if (data.type === 'auth') {
      authRoute(ws, data);
    } else if (ws.authenticated) {
      userAuth(ws.docId, ws.userEmail, function(authLevel) {
        ws.authLevel = authLevel;
        ws.editor = authLevel === 'editor' || authLevel === 'owner';

        if (data.type === 'load_scripts') {
          loadScriptsRoute(ws, data);
        } else if (data.type === 'share') {
          shareRoute(ws, data);
        } else if (data.type === 'permission_info') {
          permissionInfoRoute(ws, data);
        } else if (data.type === 'export_html') {
          exportHtmlRoute(ws, data);
        } else if (data.type === 'blob_info') {
          blobInfoRoute(ws, data);
        } else if (data.type === 'default_permissions') {
          defaultPermissionsRoute(ws, data);
        } else if (data.type === 'ping') {
          pingRoute(ws, data);
        } else if (data.type === 'config') {
          configRoute(ws, data);
        } else if (data.type === 'data_patch' && ws.editor) {
          dataPatchRoute(ws, data);
        } else if (data.type === 'name_update' && ws.editor) {
          nameUpdateRoute(ws, data);
        } else if (data.type === 'client_event') {
          clientEventRoute(ws, data);
        } else if (data.type === 'assets') {
          assetsRoute(ws, data);
        } else if (data.type === 'diffs') {
          diffsRoute(ws, data);
        } else if (data.type === 'keys') {
          keysRoute(ws, data);
        } else if (data.type === 'encrypt_document') {
          encryptDocumentRoute(ws, data);
        } else if (data.type === 'wolfram') {
          wolframRoute(ws, data);
        }
      });
    }
  });

  // Handshake
  console.log('Connection! (Document: ' + ws.docId + ')');
  ws.authenticated = false;
  ws.responded = true;

  ws.sendJSON({
    type: 'connected'
  });
}
module.exports = wsConnection;
