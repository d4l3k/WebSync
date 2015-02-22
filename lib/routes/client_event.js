var redis = require('../config.js').redis;

module.exports = function(ws, data) {
  data.from = ws.clientId;
  redis.publish('doc:' + ws.docId, JSON.stringify({
    type: 'client_bounce',
    client: ws.clientId,
    data: JSON.stringify(data)
  }));
};
