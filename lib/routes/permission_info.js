var _ = require('lodash');
var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (ws.authLevel === 'editor' || ws.authLevel === 'owner') {
    var perms;
    postgres.query('SELECT visibility, default_level FROM ws_files WHERE id = $1', [ws.docId]).
    on('row', function(row) {
      perms = row;
    }).
    on('end', function() {
      // Check to so if it successfully got the permission level.
      if (perms) {
        perms.users = [];
        postgres.query('SELECT user_email, level FROM permissions WHERE file_id = $1', [ws.docId]).
        on('row', function(row) {
          perms.users.push(row);
        }).
        on('end', function() {
          ws.sendJSON(_.extend({
            type: 'permissions'
          }, perms));
        });
      }
    });
  } else {
    ws.sendJSON({
      type: 'error',
      reason: 'You don\'t have permission to do that..'
    });
  }
};
