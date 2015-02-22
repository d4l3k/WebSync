var _ = require('lodash'),
    openpgp = require('openpgp');

var config = require('../config.js');
var postgres = config.postgres,
    redis = config.redis;

module.exports = function(ws, data) {
  ws.responded = true;
  redis.get('doc:' + ws.docId + ':users', function(err, reply) {
    var users = {};
    if (reply) {
      users = JSON.parse(reply);
    }
    users[ws.clientId] = {
      id: ws.userId,
      email: ws.userEmail,
      time: new Date()
    };
    _.each(users, function(data, id) {
      if ((new Date() - new Date(data.time)) > 60) {
        delete users[id];
        redis.publish('doc:' + ws.docId, JSON.stringify({
          type: 'client_bounce',
          client: ws.clientId,
          data: JSON.stringify({
            type: 'exit_user',
            id: id
          })
        }));
      }
    });
    redis.set('doc:' + ws.docId + ':users', JSON.stringify(users));
  });

  postgres.query('SELECT body, encrypted FROM ws_files WHERE id = $1', [ws.docId]).
  on('row', function(row) {
    var hash = openpgp.crypto.hash.md5(row.body);
    console.log(data.hash, hash);
    if (data.hash !== hash) {
      ws.sendJSON({
        type: 'error',
        action: 'sync',
        body: JSON.parse(row.body),
        reason: 'Client & Server have become desynced and future changes may not be saved.'
      });
    }
  });
};
