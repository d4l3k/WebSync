var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (ws.authLevel === 'owner') {
    // TODO: Sanitize inputs. But whateva.
    postgres.query('UPDATE ws_files SET visibility=$1, default_level=$2 WHERE id = $3', [data.visibility, data.default_level, ws.docId]);
  } else {
    ws.sendJSON({
      type: 'error',
      reason: 'Invalid permissions.'
    });
  }
};
