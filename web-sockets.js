var jsondiffpatch = require('jsondiffpatch');
// load google diff_match_patch library for text diff/patch
jsondiffpatch.config.diff_match_patch = require('./diff_match_patch_uncompressed.js');
Base62 = require('base62');
redisLib = require('redis');
redis = redisLib.createClient();
var pg = require('pg');
md5 = require('MD5');

dm = new function DataMapper(){

}
postgres = new pg.Client("tcp://postgres:@localhost/websync");
postgres.connect();
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
            var data = JSON.parse(message);
            console.log('JSON: '+message);
            if(data.type=='auth'){
                client_id = data.id;
                redis.get('websocket:key:'+data.id, function(err, reply){
                    //console.log(["Keys!", reply,data.key]);
                    if(reply==data.key){
                        console.log('Client['+data.id+'] Authed!');
                        authenticated = true;
                        // TODO: Implement socket verification.
                        redis_sock = redisLib.createClient();
                        redis_sock.on('message',function(channel, msg){
                            console.log('DocMsg['+channel+'] '+msg);
                            var mdata = JSON.parse(msg);
                            if(mdata.client!=client_id){
                                if(mdata.type=='client_bounce'){
                                    ws.send(mdata.data);
                                }
                            }
                        });
                        redis_sock.subscribe('doc:'+parts[1]);
                        ws.on('close',function(ws) {
                            redis_sock.quit();
                            redis.get('doc:'+doc_id+':users',function(err,reply){
                                var users = JSON.parse(reply);
                                delete users[client_id];
                                redis.set('doc:'+doc_id+':users',JSON.stringify(users));
                                redis.publish("doc:"+doc_id, JSON.stringify({type:"client_bounce",client:client_id,data:JSON.stringify({type:"exit_user",id:client_id})}));
                            });
                        });
                        redis.expire('websocket:id:'+client_id,60*60*24*7);
                        redis.expire('websocket:key:'+client_id,60*60*24*7);
                        redis.get('websocket:id:'+data.id, function(err,email){
                            redis.get('doc:'+doc_id+':users',function(err,reply){
                                var users = {};
                                if(reply){
                                    users = JSON.parse(reply);
                                }
                                user_id = md5(email.trim().toLowerCase());
                                users[client_id]={id:user_id,email:email.trim()};
                                // TODO: Finish reimplementing the rest o' this shiz.
                                redis.set('doc:'+doc_id+':users',JSON.stringify(users));
                                redis.publish("doc:"+doc_id, JSON.stringify({type:"client_bounce",client:client_id,data:JSON.stringify({type:"new_user",id:client_id,user:{id:user_id,email:email.strip}})}));
                                ws.send(JSON.stringify({type:'info',user_id:user_id,users:users}))
                                console.log("[Websocket Client Authed] ID: "+client_id+", Email: "+email);
                            });
                        });
                    }
                    else {
                        console.log("INVALID KEY!!! CLOSING!!! WTF BOOM!!!");
                        ws.close();
                    }
                });
            } else if(authenticated) {
                //console.log("AUTHED");
                if(data.type=='load_scripts'){
                    //console.log("LOADING SCRIPTS");
                    var ids = [];
                    postgres.query("SELECT asset_id FROM asset_documents WHERE document_id = $1",[doc_id])
                    .on('row',function(row){
                        ids.push(row.asset_id);
                    })
                    .on('end',function(){
                        var js = [];
                        var css = [];
                        ids.forEach(function(value,index,arr){
                            postgres.query("SELECT url, type FROM assets WHERE id = $1",[value])
                            .on('row',function(row){
                                if(row.type=="Javascript"){
                                    js.push(row.url);
                                } else {
                                    css.push(row.url);
                                }
                                //console.log("Lengths: "+js.length+", "+css.length+", "+ids.length+". url = "+row.url);
                                if((js.length+css.length)==ids.length){
                                    var msg = JSON.stringify({type:'scripts', js:js,css:css});
                                    //console.log("[MSG] "+msg);
                                    ws.send(msg);
                                }
                            });
                        });
                    });
                } else if(data.type=='config'){
                    if(data.action=="get"){
                        postgres.query("SELECT config, public FROM documents WHERE id = $1",[doc_id])
                        .on('row',function(row){
                            if(data.property=="public"){
                                ws.send(JSON.stringify({type:'config', action:'get',property:'public', value: row.public}));
                            } else if(data.space=='document'){
                                var doc_data = JSON.parse(row.config);
                                ws.send(JSON.stringify({type:'config',action:'get',space:data.space, value: doc_data[data.property], id:data.id}));

                            }
                            //TODO: Implement user config
                        });
                    } else if(data.action=="set"){
                        if(data.property=='public'){
                            postgres.query("UPDATE documents SET public=$2 WHERE id = $1",[doc_id,data.value]);
                        }
                    }
                } else if(data.type=="data_patch"){
                    postgres.query("SELECT body FROM documents WHERE id = $1", [doc_id])
                    .on("row", function(row){
                        var body = JSON.parse(row.body);
                        var n_body = jsondiffpatch.patch(body,data.patch);
                        postgres.query("UPDATE documents SET body=$2,last_edit_time=$3 WHERE id = $1",[doc_id,JSON.stringify(n_body), new Date()]);
                        // TODO: Update last modified!
                        redis.publish("doc:"+doc_id,JSON.stringify({type:'client_bounce',client:client_id,data:message}));
                    });
                } else if(data.type=='name_update'){
                    postgres.query("UPDATE documents SET name=$2,last_edit_time=$3 WHERE id = $1",[doc_id,data.name, new Date()]);
                    // TODO: Update last modified
                    redis.publish("doc:"+doc_id,JSON.stringify({type:'client_bounce',client:client_id,data:message}));
                } else if(data.type=='client_event'){
                    redis.publish('doc:'+doc_id,JSON.stringify({type:'client_bounce',client:client_id, data:JSON.stringify({type:'client_event',event:data.event, from:client_id, data:data.data})}));
                }
            }
        });
    }
});
console.log('WebSync WebSocket server is ready to receive connections.');
console.log('Listening on: 0.0.0.0:'+config.port);
