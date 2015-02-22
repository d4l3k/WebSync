var _ = require('lodash');

var postgres = require('../config.js').postgres;

module.exports = function(ws, data) {
  if (data.action === 'add') {
    _.each(data.keys, function(keys, type) {
      _.each(keys, function(key) {
        postgres.query('INSERT INTO keys (type, body, user_email, created) VALUES ($1, $2, $3, $4)', [type, key, ws.userEmail, new Date()]);
      });
    });
  } else if (data.action === 'get') {
    var keys = {
      public: [],
      private: []
    };
    postgres.query('SELECT type, body, created FROM keys WHERE user_email=$1', [ws.userEmail]).
    on('row', function(key) {
      keys[key.type].push(key);
    }).on('end', function() {
      ws.sendJSON({
        type: 'keys',
        keys: keys
      });
    });
  }
};
