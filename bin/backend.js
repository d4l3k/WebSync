#!/usr/bin/env node

var config = require('../lib/config.js');
var routes = require('../lib/routes.js');

var WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({
    port: config.port
  });

wss.on('connection', routes);
console.log('WebSync WebSocket server is ready to receive connections.');
console.log('Listening on: 0.0.0.0:' + config.port);
