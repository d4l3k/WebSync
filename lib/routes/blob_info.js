var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (ws.editor) {
    var resources = [];
    postgres.query('SELECT name, edit_time, create_time, content_type, octet_length(data) FROM ws_files WHERE parent_id = $1', [ws.docId]).
    on('row', function(row) {
      resources.push(row);
    }).
    on('end', function() {
      ws.sendJSON({
        type: 'blobs',
        resources: resources
      });
    });
  } else {
    ws.sendJSON({
      type: 'error',
      reason: 'invalid permissions.'
    });
  }
};
