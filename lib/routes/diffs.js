var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (data.action === 'list') {
    var patches = [];
    postgres.query('SELECT time, patch, user_email, id, parent FROM changes WHERE file_id=$1 AND time>$2 ORDER BY time ASC', [ws.docId, new Date(data.after || 0)]).on('row', function(row) {
      patches.push(row);
    }).on('end', function() {
      ws.sendJSON({
        type: 'diff_list',
        reqId: data.reqId,
        patches: patches
      });
    });
  }
};
