var jsondiffpatch = require('./jsondiffpatch.js');
// load google diff_match_patch library for text diff/patch
jsondiffpatch.config.diff_match_patch = require('./diff_match_patch_uncompressed.js');

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 8080});
wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        console.log('received: %s', message);
    });
    ws.send('something');
});
