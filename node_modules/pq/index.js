var _pq = function(){};
require("util").inherits(_pq, require("events").EventEmitter);

var pq = new _pq();

module.exports = pq;

pq.connection = require("./lib/connection");
pq.job = require("./lib/job");
pq.worker = require("./lib/worker");

pq.connection.pq = pq;