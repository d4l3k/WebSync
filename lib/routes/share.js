var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (ws.authLevel === 'owner') {
    postgres.query('DELETE FROM permissions WHERE file_id = $1 AND user_email = $2', [ws.docId, data.email]).
      //.on('error', function(err) {})
    on('end', function() {
      if (data.level !== 'delete') {
        postgres.query('INSERT INTO permissions (user_email, file_id, level) VALUES ($2, $1, $3)', [ws.docId, data.email, data.level]);
      }
    });
  } else {
    ws.sendJSON({
      type: 'error',
      reason: 'You don\'t have permission to do that.'
    });
  }
};
