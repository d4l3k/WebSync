var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  postgres.query('INSERT INTO symmetric_keys (body, created, user_email, ws_file_id) VALUES ($1, $2, $3, $4)', [data.symmetricKey.key, new Date(), ws.userEmail, ws.docId]);
  postgres.query('UPDATE ws_files SET body=$2,edit_time=$3,encrypted=true WHERE id = $1', [ws.docId, JSON.stringify(data.body), new Date()]);
  // TODO: encrypt patches
};
