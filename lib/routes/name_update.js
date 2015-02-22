var config = require('../config.js');
var postgres = config.postgres,
    redis = config.redis;

module.exports = function(ws, data) {
  console.log('Update', ws.docId, data.name);
  postgres.query('UPDATE ws_files SET name=$2,edit_time=$3 WHERE id = $1', [ws.docId, data.name, new Date()], function(err) {
    if (err) {
      throw err;
    }
  });
  redis.publish('doc:' + ws.docId, JSON.stringify({
    type: 'client_bounce',
    client: ws.clientId,
    data: JSON.stringify(data)
  }));
};
