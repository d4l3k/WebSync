#!/usr/bin/node

var config = {};
var fs = require('fs');
var jsonpatch = require('fast-json-patch')
Base62 = require('base62');
redisLib = require('redis');
var pg = require('pg');
md5 = require('MD5');
var _ = require("underscore");


fs.readFile('./config.json', function(err, buffer){
    config = JSON.parse(buffer.toString());
    postgres = new pg.Client("tcp://"+config.postgres);
    postgres.connect();
redis = redisLib.createClient(config.redis.port,config.redis.host);
var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: config.websocket.port});
wss.on('connection', function(ws) {
    console.log("Connection: ",ws.upgradeReq.url);
    var url = ws.upgradeReq.url;
    var base = url.split('?')[0];
    var parts = base.split('/');
    ws.sendJSON = function(json){
        this.send(JSON.stringify(json));
    }
    console.log(parts)
    if(parts[2]=='edit'||parts[2]=='view'){
        var doc_id = Base62.decode(parts[1]);
        console.log('Connection! (Document: '+doc_id+')');
        var authenticated = false;
        var responded = true;
        var redis_sock, client_id, user_email;
        function userAuth(callback){
            var info;
            postgres.query("SELECT level FROM permissions WHERE document_id = $1 AND user_email = $2", [doc_id, user_email]).on("row", function(row){
                info = row;
            }).on("end", function(){
                if(info){
                    callback(info.level);
                } else {
                    postgres.query("SELECT visiblity, default_level FROM documents WHERE id = $1", [doc_id])
                    .on("row", function(row){
                        if(row.visibility=="private"){
                            callback("none");
                        } else {
                            callback(row.default_level);
                        }
                    });
                }
            });
        }
        function needAuth(level, callback){
            var levels = ["none", "viewer", "editor", "owner"]
            userAuth(function(auth){
                if(levels.indexOf(auth)>=levels.indexOf(level)){
                    callback(auth);
                } else {
                    ws.sendJSON({type: 'error', reason: 'Invalid permissions.'});
                }
            });
        }
        ws.sendJSON({type:'connected'});
        ws.on('message', function(message) {
            var data = JSON.parse(message);
            console.log('JSON: '+message);
            if(data.type=='auth'){
                client_id = data.id;
                redis.get('websocket:key:'+data.id, function(err, reply){
                    //console.log(["Keys!", reply,data.key]);
                    if(reply==data.key+":"+doc_id){
                        console.log('Client['+data.id+'] Authed!');
                        authenticated = true;
                        // TODO: Implement socket verification.
                        redis_sock = redisLib.createClient(config.redis.port,config.redis.host);
                        redis_sock.on('message',function(channel, msg){
                            console.log('DocMsg['+channel+'] '+msg);
                            var mdata = JSON.parse(msg);
                            if(mdata.client!=client_id){
                                if(mdata.type=='client_bounce'){
                                    ws.send(mdata.data);
                                }
                            }
                        });
                        redis_sock.subscribe('doc:'+doc_id);
                        var close = function(){
                            clearInterval(interval);
                            ws.close();
                            redis_sock.quit();
                            redis.get('doc:'+doc_id+':users',function(err,reply){
                                var users = JSON.parse(reply);
                                delete users[client_id];
                                redis.set('doc:'+doc_id+':users',JSON.stringify(users));
                                redis.publish("doc:"+doc_id, JSON.stringify({type:"client_bounce",client:client_id,data:JSON.stringify({type:"exit_user",id:client_id})}));
                            });
                        }
                        var interval = setInterval(function(){
                            if(!responded)
                                close();
                            else {
                                responded = false;
                                ws.sendJSON({type: 'ping'});
                            }
                        }, 30*1000);
                        ws.on('close', close);
                        redis.expire('websocket:id:'+client_id,60*60*24*7);
                        redis.expire('websocket:key:'+client_id,60*60*24*7);
                        redis.get('websocket:id:'+data.id, function(err,email){
                            redis.get('doc:'+doc_id+':users',function(err,reply){
                                var users = {};
                                if(reply){
                                    users = JSON.parse(reply);
                                }
                                user_id = md5(email.trim().toLowerCase());
                                user_email = email;
                                users[client_id]={id:user_id,email:email.trim()};
                                // TODO: Finish reimplementing the rest o' this shiz.
                                redis.set('doc:'+doc_id+':users',JSON.stringify(users));
                                redis.publish("doc:"+doc_id, JSON.stringify({type:"client_bounce",client:client_id,data:JSON.stringify({type:"new_user",id:client_id,user:users[client_id]})}));
                                ws.send(JSON.stringify({type:'info',user_id:user_id,users:users}))
                                console.log("[Websocket Client Authed] ID: "+client_id+", Email: "+email);
                            });
                        });
                    }
                    else {
                        console.log("INVALID KEY!!! CLOSING!!! WTF BOOM!!!");
                        ws.sendJSON({type:"error", reason:"Invalid Session. Please refresh the page."});
                        ws.close();
                    }
                });
            } else if(authenticated) {
                userAuth(function(auth_level){
                    var editor = auth_level=="editor" || auth_level=="owner";
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
                    } else if(data.type=="share"){
                        userAuth(function(auth){
                            if(auth=="owner"){
                                postgres.query("DELETE FROM permissions WHERE document_id = $1 AND user_email = $2", [doc_id, data.email])
                                .on("end", function(){
                                    if(data.level!="delete") {
                                        postgres.query("INSERT INTO permissions (user_email, document_id, level) VALUES ('rice@outerearth.net', 1, 'editor')", [doc_id, data.email, data.level]);
                                    }
                                });
                            } else {
                                ws.sendJSON({type: "error", reason: "Invalid permissions."});
                            }
                        });
                    } else if(data.type=="permission_info"){
                        if(auth_level=="editor"||auth_level=="owner"){
                            var perms;
                            postgres.query("SELECT visibility, default_level FROM documents WHERE id = $1", [doc_id])
                            .on("row", function(row){
                                perms = row;
                            })
                            .on("end", function(){
                                perms.users = []
                                postgres.query("SELECT user_email, level FROM permissions WHERE document_id = $1", [doc_id])
                                .on("row", function(row){
                                    perms.users.push(row);
                                })
                                .on("end", function(){
                                    ws.sendJSON(_.extend({type: "permissions"}, perms));
                                });
                            });
                        } else {
                            ws.sendJSON({type: "error", reason: "invalid permissions."});
                        }
                    } else if(data.type=="default_permissions"){
                        userAuth(function(auth){
                            if(auth=="owner"){
                                // TODO: Sanitize inputs. But whateva.
                                postgres.query("UPDATE documents SET visibility=$1, default_level=$2 WHERE id = $3", [data.visibility, data.default_level, doc_id]);
                            } else {
                                ws.sendJSON({type: "error", reason: "Invalid permissions."});
                            }
                        });
                    } else if(data.type=='ping'){
                        responded = true;
                    } else if(data.type=='config'){
                        if(data.action=="get"){
                            postgres.query("SELECT config, public FROM documents WHERE id = $1",[doc_id])
                            .on('row',function(row){
                                if(data.space=='document'){
                                    var doc_data = JSON.parse(row.config);
                                    ws.send(JSON.stringify({type:'config',action:'get',space:data.space, value: doc_data[data.property], id:data.id}));

                                }
                                //TODO: Implement user config
                            });
                        } else if(data.action=="set"){
                        }
                    } else if(data.type=="data_patch"&&editor){
                        postgres.query("SELECT body FROM documents WHERE id = $1", [doc_id])
                        .on("row", function(row){
                            var body = JSON.parse(row.body);
                            try {
                                jsonpatch.apply(body, data.patch);
                                postgres.query("UPDATE documents SET body=$2,last_edit_time=$3 WHERE id = $1",[doc_id,JSON.stringify(body), new Date()]);
                                var id = -1;
                                postgres.query("SELECT id FROM changes WHERE document_id=$1 ORDER BY time DESC LIMIT 1;",[doc_id]).on("row",function(row){
                                    id = row.id;
                                }).on('end',function(){
                                    postgres.query("INSERT INTO changes (time, patch, document_id, user_email, parent) VALUES ($3, $2, $1, $4, $5)",[doc_id,data.patch,new Date(),user_email, id]);
                                });
                                redis.publish("doc:"+doc_id,JSON.stringify({type:'client_bounce',client:client_id,data:message}));
                            } catch (e) {
                                console.log("[data_patch] Error:",e);
                                ws.send(JSON.stringify({type:'error',msg:'Bad patch'}));
                            }
                        });
                    } else if(data.type=='name_update'&&editor){
                        console.log("Update",doc_id,data.name);
                        postgres.query("UPDATE documents SET name=$2,last_edit_time=$3 WHERE id = $1",[doc_id,data.name, new Date()], function(err){
                            if(err) throw err;
                        });
                        redis.publish("doc:"+doc_id,JSON.stringify({type:'client_bounce',client:client_id,data:message}));
                    } else if(data.type=='client_event'){
                        redis.publish('doc:'+doc_id,JSON.stringify({type:'client_bounce',client:client_id, data:JSON.stringify({type:'client_event',event:data.event, from:client_id, data:data.data})}));
                    } else if(data.type=='assets') {
                        if(data.action=='list'){
                            postgres.query("SELECT * FROM assets ORDER BY name")
                            .on('row',function(row){
                                ws.send(JSON.stringify({type:'asset_list',id:row.id,name:row.name,description:row.description,url:row.url,atype:row.type}));
                            });
                        } else if(data.action=='add'&&editor){
                            postgres.query("INSERT INTO asset_documents (document_id, asset_id) VALUES ($1, $2)",[doc_id,data.id]);
                        } else if(data.action=='delete'&&editor){
                            postgres.query("DELETE FROM asset_documents WHERE document_id = $1 AND asset_id = $2",[doc_id,data.id]);
                        }
                    } else if(data.type=='diffs') {
                        if(data.action=='list'){
                            var patches = [];
                            postgres.query("SELECT time, patch, user_email, id, parent FROM changes WHERE document_id=$1 ORDER BY time ASC",[doc_id])
                            .on('row',function(row){
                                patches.push(row);
                            }).on('end',function(){
                                ws.send(JSON.stringify({type:'diff_list', patches: patches}));
                            });
                        }
                    }
                });
            }
        });
    }
});
console.log('WebSync WebSocket server is ready to receive connections.');
console.log('Listening on: 0.0.0.0:'+config.websocket.port);
});
