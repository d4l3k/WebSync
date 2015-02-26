var config = require('../config.js');
var Client = require('node-wolfram');
var Wolfram = new Client(config.wolframAppId);

module.exports = function(ws, data) {
  Wolfram.query(data.query, function(err, result) {
    if(err) {
        console.log(err);
    } else {
      ws.sendJSON({
        type: 'wolfram',
        reqId: data.reqId,
        result: result
      });
    }
  });
};
