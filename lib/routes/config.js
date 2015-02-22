var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (data.action === 'get') {
    postgres.query('SELECT config FROM ws_files WHERE id = $1', [ws.docId]).
    on('row', function(row) {
      if (data.space === 'document') {
        var docData = JSON.parse(row.config);
        ws.sendJSON({
          type: 'config',
          action: 'get',
          space: data.space,
          value: docData[data.property],
          id: data.id
        });

      }
      //TODO: Implement user config
    });
  } // else if (data.action == 'set') {}
};
