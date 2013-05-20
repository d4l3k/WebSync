var jsondiffpatch = require('jsondiffpatch');
// load google diff_match_patch library for text diff/patch
jsondiffpatch.config.diff_match_patch = require('./diff_match_patch_uncompressed.js');
Base62 = require('base62');
redisLib = require('redis');
redis = redisLib.createClient();
var config = {
    port: 4568
};
var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: config.port});
wss.on('connection', function(ws) {
    console.log("Connection: ",ws.upgradeReq.url);
    var url = ws.upgradeReq.url;
    var base = url.split('?')[0];
    var parts = base.split('/');
    console.log(parts)
    if(parts[2]=='edit'){
        var doc_id = Base62.decode(parts[1]);
        console.log('Connection! (Document: '+doc_id+')');
        var authenticated = false;
        var redis_sock, client_id;
        ws.on('message', function(message) {
            data = JSON.parse(message);
            console.log('JSON: '+message);
            if(data.type=='auth'){
                client_id = data.id;
                redis.get('websocket:key:'+data.id, function(err, reply){
                    console.log(reply);
                    if(reply==data.key){
                        console.log('Client['+data.id+'] Authed!');
                        authenticated = true;
                        // TODO: Implement socket verification.
                        redis_sock = redisLib.createClient();
                        redis_sock.on('message',function(channel, msg){
                            console.log('DocMsg['+channel+'] '+msg);
                        });
                        redis_sock.subscribe('doc:'+parts[1]);
                        redis.expire('websocket:id:'+client_id,60*60*24*7);
                        redis.expire('websocket:key:'+client_id,60*60*24*7);
                        
                        redis.get('doc:'+data.id+':users',function(err,reply){
                            var users = {};
                            if(reply){
                                users = JSON.parse(reply);
                            }
                            // TODO: Finish reimplementing the rest o' this shiz.
                        });

                    }
                    else {
                        ws.close();
                    }
                });
            }
        });
    }
});
console.log('WebSync WebSocket server is ready to receive connections.');
console.log('Listening on: 0.0.0.0:'+config.port);
