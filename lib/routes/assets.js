var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (data.action === 'list') {
    postgres.query('SELECT * FROM assets ORDER BY name').
    on('row', function(row) {
      ws.sendJSON({
        type: 'asset_list',
        id: row.id,
        name: row.name,
        description: row.description,
        url: row.url,
        atype: row.type
      });
    });
  } else if (data.action === 'add' && ws.editor) {
    postgres.query('INSERT INTO asset_ws_files (file_id, asset_id) VALUES ($1, $2)', [ws.docId, data.id]);
  } else if (data.action === 'delete' && ws. editor) {
    postgres.query('DELETE FROM asset_ws_files WHERE file_id = $1 AND asset_id = $2', [ws.docId, data.id]);
  }
};
