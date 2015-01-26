#!/usr/bin/env node

var fs = require('fs'),
  jsonpatch = require('fast-json-patch'),
  Base62 = require('base62'),
  redisLib = require('redis'),
  pg = require('pg'),
  md5 = require('MD5'),
  _ = require('underscore'),
  unoconv = require('unoconv'),
  tmp = require('tmp'),
  crypto = require('crypto'),
  stripJsonComments = require('strip-json-comments');


var config = {},
  redis, postgres;


function userAuth(docId, userEmail, callback) {
  var info;
  postgres.query('SELECT level FROM permissions WHERE file_id = $1 AND user_email = $2', [docId, userEmail]).on('row', function(row) {
    info = row;
  }).on('end', function() {
    if (info) {
      callback(info.level);
    } else {
      postgres.query('SELECT visibility, default_level FROM ws_files WHERE id = $1', [docId]).
      on('row', function(row) {
        if (row.visibility === 'private') {
          callback('none');
        } else {
          callback(row.default_level);
        }
      });
    }
  });
}

function wsConnection(ws) {
  console.log('Connection: ', ws.upgradeReq.url);
  var url = ws.upgradeReq.url;
  var base = url.split('?')[0];
  var parts = base.split('/');
  ws.sendJSON = function(json) {
    this.send(JSON.stringify(json), function(err) {
      if (err) {
        console.error('WS ERROR', err);
      }
    });
  };
  console.log(parts);
  if (parts[2] === 'edit' || parts[2] === 'view') {
    var docId = Base62.decode(parts[1]);
    console.log('Connection! (Document: ' + docId + ')');
    var authenticated = false;
    var responded = true;
    var redisSock, clientId, userEmail, userId;

    ws.sendJSON({
      type: 'connected'
    });
    ws.on('close', function() {
      if (redisSock) {
        redisSock.quit();
      }
    });
    ws.on('message', function(message) {
      var data = JSON.parse(message);
      console.log('JSON: ' + message);
      if (data.type === 'auth') {
        clientId = data.id;
        redis.get('websocket:key:' + data.id, function(err, reply) {
          //console.log(["Keys!", reply,data.key]);
          if (reply === data.key + ':' + docId) {
            console.log('Client[' + data.id + '] Authed!');
            authenticated = true;
            // TODO: Implement socket verification.
            redisSock = redisLib.createClient(config.redis.port, config.redis.host);
            redisSock.on('message', function(channel, msg) {
              console.log('DocMsg[' + channel + '] ' + msg);
              var mdata = JSON.parse(msg);
              if (mdata.client !== clientId) {
                if (mdata.type === 'client_bounce') {
                  try {
                    ws.send(mdata.data);
                  } catch (err) {
                    // Socket isn't open. :(
                  }
                }
              }
            });
            redisSock.subscribe('doc:' + docId);
            var interval;
            var close = function() {
              clearInterval(interval);
              ws.close();
              redisSock.quit();
              redis.get('doc:' + docId + ':users', function(err, reply) {
                // TODO: Handle error
                var users = JSON.parse(reply);
                delete users[clientId];
                redis.set('doc:' + docId + ':users', JSON.stringify(users));
                redis.publish('doc:' + docId, JSON.stringify({
                  type: 'client_bounce',
                  client: clientId,
                  data: JSON.stringify({
                    type: 'exit_user',
                    id: clientId
                  })
                }));
              });
            };
            interval = setInterval(function() {
              if (!responded) {
                close();
              } else {
                responded = false;
                ws.sendJSON({
                  type: 'ping'
                });
              }
            }, 30 * 1000);
            ws.on('close', close);
            redis.expire('websocket:id:' + clientId, 60 * 60 * 24 * 7);
            redis.expire('websocket:key:' + clientId, 60 * 60 * 24 * 7);
            // Get the users email. This is used for Gravatar and chat.
            redis.get('websocket:id:' + data.id, function(err, email) {
              // Update document currently connected user list. The list is stored in Redis because it doesn't need to persist.
              redis.get('doc:' + docId + ':users', function(err, reply) {
                var users = {};
                if (reply) {
                  users = JSON.parse(reply);
                }
                userId = md5(email.trim().toLowerCase());
                userEmail = email.trim();
                users[clientId] = {
                  id: userId,
                  email: email.trim(),
                  time: new Date()
                };
                // Check for expired users (> 60 sec).
                _.each(users, function(data, id) {
                  if ((new Date() - data.time) > 60) {
                    delete users[id];
                    redis.publish('doc:' + docId, JSON.stringify({
                      type: 'client_bounce',
                      client: clientId,
                      data: JSON.stringify({
                        type: 'exit_user',
                        id: id
                      })
                    }));
                  }
                });
                redis.set('doc:' + docId + ':users', JSON.stringify(users));
                redis.publish('doc:' + docId, JSON.stringify({
                  type: 'client_bounce',
                  client: clientId,
                  data: JSON.stringify({
                    type: 'new_user',
                    id: clientId,
                    user: users[clientId]
                  })
                }));
                ws.sendJSON({
                  type: 'info',
                  user_id: userId,
                  users: users
                });
                console.log('[Websocket Client Authed] ID: ' + clientId + ', Email: ' + email);
              });
            });
          } else {
            console.log('INVALID KEY!!! CLOSING!!! WTF BOOM!!!');
            ws.sendJSON({
              type: 'error',
              reason: 'Invalid Session. Please refresh the page.'
            });
            ws.close();
          }
        });
      } else if (authenticated) {
        userAuth(docId, userEmail, function(authLevel) {
          var editor = authLevel === 'editor' || authLevel === 'owner';
          if (data.type === 'load_scripts') {
            //console.log("LOADING SCRIPTS");
            var ids = [];
            postgres.query('SELECT asset_id FROM asset_ws_files WHERE file_id = $1', [docId]).
            on('row', function(row) {
              ids.push(row.asset_id);
            }).
            on('end', function() {
              var js = [];
              var css = [];
              ids.forEach(function(value) {
                postgres.query('SELECT url, type FROM assets WHERE id = $1', [value]).
                on('row', function(row) {
                  if (row.type === 'Javascript') {
                    js.push(row.url);
                  } else {
                    css.push(row.url);
                  }
                  //console.log("Lengths: "+js.length+", "+css.length+", "+ids.length+". url = "+row.url);
                  if ((js.length + css.length) === ids.length) {
                    var msg = JSON.stringify({
                      type: 'scripts',
                      js: js,
                      css: css
                    });
                    //console.log("[MSG] "+msg);
                    ws.send(msg);
                  }
                });
              });
            });
          } else if (data.type === 'share') {
            if (authLevel === 'owner') {
              postgres.query('DELETE FROM permissions WHERE file_id = $1 AND user_email = $2', [docId, data.email]).
                //.on('error', function(err) {})
              on('end', function() {
                if (data.level !== 'delete') {
                  postgres.query('INSERT INTO permissions (user_email, file_id, level) VALUES ($2, $1, $3)', [docId, data.email, data.level]);
                }
              });
            } else {
              ws.sendJSON({
                type: 'error',
                reason: 'You don\'t have permission to do that.'
              });
            }
          } else if (data.type === 'permission_info') {
            if (authLevel === 'editor' || authLevel === 'owner') {
              var perms;
              postgres.query('SELECT visibility, default_level FROM ws_files WHERE id = $1', [docId]).
              on('row', function(row) {
                perms = row;
              }).
              on('end', function() {
                // Check to so if it successfully got the permission level.
                if (perms) {
                  perms.users = [];
                  postgres.query('SELECT user_email, level FROM permissions WHERE file_id = $1', [docId]).
                  on('row', function(row) {
                    perms.users.push(row);
                  }).
                  on('end', function() {
                    ws.sendJSON(_.extend({
                      type: 'permissions'
                    }, perms));
                  });
                }
              });
            } else {
              ws.sendJSON({
                type: 'error',
                reason: 'You don\'t have permission to do that..'
              });
            }
          } else if (data.type === 'export_html') {
            // TODO: Take into account data.docType
            tmp.file({
              mode: 0x644,
              prefix: 'websync-backend-export-',
              postfix: '.html'
            }, function _tempFileCreated(err, path, fd) {
              if (err) {
                throw err;
              }
              console.log('File: ', path);
              console.log('Filedescriptor: ', fd);
              fs.write(fd, data.data, function(err) {
                fs.close(fd, function(err) {
                  console.log('Extension:', data.extension);
                  unoconv.convert(path, data.extension, function(err, result) {
                    if (err) {
                      console.log('UNOCONV ERROR', err);
                    } else {
                      crypto.randomBytes(16, function(ex, buf) {
                        var token = buf.toString('hex');
                        var address = 'websync:document_export:' + docId + ':' + token;
                        redis.setex(address, 15 * 60, result, function(err) {
                          if (err) {
                            console.log('REDIS ERROR SETEX:', err);
                          }
                        });
                        redis.setex(address + ':extension', 15 * 60, data.extension, function(err) {
                          if (err) {
                            console.log('REDIS ERROR SETEX:', err);
                          }
                        });
                        console.log('EXPORT Address:', address, result.length);
                        ws.sendJSON({
                          type: 'download_token',
                          token: token
                        });
                      });
                    }
                  });
                });
              });
            });
          } else if (data.type === 'blob_info') {
            if (editor) {
              var resources = [];
              postgres.query('SELECT name, edit_time, create_time, content_type, octet_length(data) FROM ws_files WHERE parent_id = $1', [docId]).
              on('row', function(row) {
                resources.push(row);
              }).
              on('end', function() {
                ws.sendJSON({
                  type: 'blobs',
                  resources: resources
                });
              });
            } else {
              ws.sendJSON({
                type: 'error',
                reason: 'invalid permissions.'
              });
            }
          } else if (data.type === 'default_permissions') {
            userAuth(docId, userEmail, function(auth) {
              if (auth === 'owner') {
                // TODO: Sanitize inputs. But whateva.
                postgres.query('UPDATE ws_files SET visibility=$1, default_level=$2 WHERE id = $3', [data.visibility, data.default_level, docId]);
              } else {
                ws.sendJSON({
                  type: 'error',
                  reason: 'Invalid permissions.'
                });
              }
            });
          } else if (data.type === 'ping') {
            responded = true;
            redis.get('doc:' + docId + ':users', function(err, reply) {
              var users = {};
              if (reply) {
                users = JSON.parse(reply);
              }
              users[clientId] = {
                id: userId,
                email: userEmail,
                time: new Date()
              };
              _.each(users, function(data, id) {
                if ((new Date() - data.time) > 60) {
                  delete users[id];
                  redis.publish('doc:' + docId, JSON.stringify({
                    type: 'client_bounce',
                    client: clientId,
                    data: JSON.stringify({
                      type: 'exit_user',
                      id: id
                    })
                  }));
                }
              });
              redis.set('doc:' + docId + ':users', JSON.stringify(users));
            });
          } else if (data.type === 'config') {
            if (data.action === 'get') {
              postgres.query('SELECT config FROM ws_files WHERE id = $1', [docId]).
              on('row', function(row) {
                if (data.space === 'document') {
                  var docData = JSON.parse(row.config);
                  ws.sendJSON({
                    type: 'config',
                    action: 'get',
                    space: data.space,
                    value: docData[data.property],
                    id: data.id
                  });

                }
                //TODO: Implement user config
              });
            } // else if (data.action == 'set') {}
          } else if (data.type === 'data_patch' && editor) {
            postgres.query('SELECT body FROM ws_files WHERE id = $1', [docId]).
            on('row', function(row) {
              var body = JSON.parse(row.body);
              try {
                if (data.encrypted) {
                  postgres.query('UPDATE ws_files SET edit_time=$2 WHERE id = $1', [docId, new Date()]);
                } else {
                  // Apply the patch directly if not encrypted.
                  jsonpatch.apply(body, data.patch);
                  postgres.query('UPDATE ws_files SET body=$2,edit_time=$3 WHERE id = $1', [docId, JSON.stringify(body), new Date()]);
                }
                var id = -1;
                postgres.query('SELECT id FROM changes WHERE file_id=$1 ORDER BY time DESC LIMIT 1;', [docId]).on('row', function(row) {
                  id = row.id;
                }).on('end', function() {
                  var patch = data.patch;
                  if (!_.isString(patch)) {
                    patch = JSON.stringify(data.patch);
                  }
                  postgres.query('INSERT INTO changes (time, patch, file_id, user_email, parent) VALUES ($3, $2, $1, $4, $5)', [docId, patch, new Date(), userEmail, id]);
                });
                redis.publish('doc:' + docId, JSON.stringify({
                  type: 'client_bounce',
                  client: clientId,
                  data: message
                }));
              } catch (e) {
                console.log('[data_patch] Error:', e);
                ws.sendJSON({
                  type: 'error',
                  reason: 'Bad patch'
                });
              }
            });
          } else if (data.type === 'name_update' && editor) {
            console.log('Update', docId, data.name);
            postgres.query('UPDATE ws_files SET name=$2,edit_time=$3 WHERE id = $1', [docId, data.name, new Date()], function(err) {
              if (err) {
                throw err;
              }
            });
            redis.publish('doc:' + docId, JSON.stringify({
              type: 'client_bounce',
              client: clientId,
              data: message
            }));
          } else if (data.type === 'client_event') {
            data.from = clientId;
            redis.publish('doc:' + docId, JSON.stringify({
              type: 'client_bounce',
              client: clientId,
              data: JSON.stringify(data)
            }));
          } else if (data.type === 'assets') {
            if (data.action === 'list') {
              postgres.query('SELECT * FROM assets ORDER BY name').
              on('row', function(row) {
                ws.sendJSON({
                  type: 'asset_list',
                  id: row.id,
                  name: row.name,
                  description: row.description,
                  url: row.url,
                  atype: row.type
                });
              });
            } else if (data.action === 'add' && editor) {
              postgres.query('INSERT INTO asset_ws_files (file_id, asset_id) VALUES ($1, $2)', [docId, data.id]);
            } else if (data.action === 'delete' && editor) {
              postgres.query('DELETE FROM asset_ws_files WHERE file_id = $1 AND asset_id = $2', [docId, data.id]);
            }
          } else if (data.type === 'diffs') {
            if (data.action === 'list') {
              var patches = [];
              postgres.query('SELECT time, patch, user_email, id, parent FROM changes WHERE file_id=$1 AND time>$2 ORDER BY time ASC', [docId, new Date(data.after || 0)]).on('row', function(row) {
                patches.push(row);
              }).on('end', function() {
                ws.sendJSON({
                  type: 'diff_list',
                  reqId: data.reqId,
                  patches: patches
                });
              });
            }
          } else if (data.type === 'keys') {
            if (data.action === 'add') {
              _.each(data.keys, function(keys, type) {
                _.each(keys, function(key) {
                  postgres.query('INSERT INTO keys (type, body, user_email, created) VALUES ($1, $2, $3, $4)', [type, key, userEmail, new Date()]);
                });
              });
            } else if (data.action === 'get') {
              var keys = {
                public: [],
                private: []
              };
              postgres.query('SELECT type, body, created FROM keys WHERE user_email=$1', [userEmail]).
              on('row', function(key) {
                keys[key.type].push(key);
              }).on('end', function() {
                ws.sendJSON({
                  type: 'keys',
                  keys: keys
                });
              });
            }
          } else if (data.type === 'encrypt_document') {
            postgres.query('INSERT INTO symmetric_keys (body, created, user_email, ws_file_id) VALUES ($1, $2, $3, $4)', [data.symmetricKey.key, new Date(), userEmail, docId]);
            postgres.query('UPDATE ws_files SET body=$2,edit_time=$3,encrypted=true WHERE id = $1', [docId, JSON.stringify(data.body), new Date()]);
            // TODO: encrypt patches
          }
        });
      }
    });
  }
}

fs.readFile('./config/config.json', function(err, buffer) {
  // Modified JSON format that allows comments.
  var configLines = '{\n' + buffer.toString() + '\n}';
  config = JSON.parse(stripJsonComments(configLines));
  postgres = new pg.Client('tcp://' + config.postgres);
  postgres.connect();
  redis = redisLib.createClient(config.redis.port, config.redis.host);
  var port;
  var p = process.argv.indexOf('-p');
  if (p !== -1) {
    port = process.argv[p + 1];
  } else {
    port = config.websocket.port;
  }
  var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
      port: port
    });
  wss.on('connection', wsConnection);
  console.log('WebSync WebSocket server is ready to receive connections.');
  console.log('Listening on: 0.0.0.0:' + port);
});