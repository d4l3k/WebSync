var jsonpatch = require('fast-json-patch'),
    _ = require('lodash'),
    stringify = require('json-stable-stringify');

var config = require('../config.js');
var postgres = config.postgres,
    redis = config.redis;

module.exports = function(ws, data) {
  postgres.query('SELECT body FROM ws_files WHERE id = $1', [ws.docId]).
  on('row', function(row) {
    var body = JSON.parse(row.body);
    try {
      if (data.encrypted) {
        postgres.query('UPDATE ws_files SET edit_time=$2 WHERE id = $1', [ws.docId, new Date()]);
      } else {
        // Apply the patch directly if not encrypted.
        jsonpatch.apply(body, data.patch);
        postgres.query('UPDATE ws_files SET body=$2,edit_time=$3 WHERE id = $1', [ws.docId, stringify(body), new Date()]);
      }
      var id = -1;
      postgres.query('SELECT id FROM changes WHERE file_id=$1 ORDER BY time DESC LIMIT 1;', [ws.docId]).on('row', function(row) {
        id = row.id;
      }).on('end', function() {
        var patch = data.patch;
        if (!_.isString(patch)) {
          patch = stringify(data.patch);
        }
        postgres.query('INSERT INTO changes (time, patch, file_id, user_email, parent) VALUES ($3, $2, $1, $4, $5)', [ws.docId, patch, new Date(), ws.userEmail, id]);
      });
      redis.publish('doc:' + ws.docId, JSON.stringify({
        type: 'client_bounce',
        client: ws.clientId,
        data: JSON.stringify(data)
      }));
    } catch (e) {
      console.log('[data_patch] Error:', e);
      ws.sendJSON({
        type: 'error',
        reason: 'Bad patch'
      });
    }
  });
};
