var redisLib = require('redis'),
    _ = require('lodash'),
    md5 = require('MD5');
var config = require('../config.js');
var postgres = config.postgres,
    redis = config.redis;

module.exports = function(ws, data) {
  ws.clientId = data.id;
  redis.get('websocket:key:' + data.id, function(err, reply) {
    //console.log(["Keys!", reply,data.key]);
    if (reply === data.key + ':' + ws.docId) {
      console.log('Client[' + data.id + '] Authed!');
      ws.authenticated = true;
      // TODO: Implement socket verification.
      ws.redisSock = redisLib.createClient(config.redis.port, config.redis.host);
      ws.redisSock.on('message', function(channel, msg) {
        console.log('DocMsg[' + channel + '] ' + msg);
        var mdata = JSON.parse(msg);
        if (mdata.client !== ws.clientId) {
          if (mdata.type === 'client_bounce') {
            try {
              ws.send(mdata.data);
            } catch (err) {
              // Socket isn't open. :(
            }
          }
        }
      });
      ws.redisSock.subscribe('doc:' + ws.docId);
      var interval;
      var close = function() {
        clearInterval(interval);
        ws.close();
        ws.redisSock.quit();
        redis.get('doc:' + ws.docId + ':users', function(err, reply) {
          // TODO: Handle error
          var users = JSON.parse(reply);
          delete users[ws.clientId];
          redis.set('doc:' + ws.docId + ':users', JSON.stringify(users));
          redis.publish('doc:' + ws.docId, JSON.stringify({
            type: 'client_bounce',
            client: ws.clientId,
            data: JSON.stringify({
              type: 'exit_user',
              id: ws.clientId
            })
          }));
        });
      };
      interval = setInterval(function() {
        if (!ws.responded) {
          close();
        } else {
          ws.responded = false;
          ws.sendJSON({
            type: 'ping'
          });
        }
      }, 30 * 1000);
      ws.on('close', close);
      redis.expire('websocket:id:' + ws.clientId, 60 * 60 * 24 * 7);
      redis.expire('websocket:key:' + ws.clientId, 60 * 60 * 24 * 7);
      // Get the users email. This is used for Gravatar and chat.
      redis.get('websocket:id:' + data.id, function(err, email) {
        // Update document currently connected user list. The list is stored in Redis because it doesn't need to persist.
        redis.get('doc:' + ws.docId + ':users', function(err, reply) {
          var users = {};
          if (reply) {
            users = JSON.parse(reply);
          }
          ws.userId = md5(email.trim().toLowerCase());
          ws.userEmail = email.trim();
          users[ws.clientId] = {
            id: ws.userId,
            email: email.trim(),
            time: new Date()
          };
          // Check for expired users (> 60 sec).
          _.each(users, function(data, id) {
            if ((new Date() - new Date(data.time)) > 60) {
              delete users[id];
              redis.publish('doc:' + ws.docId, JSON.stringify({
                type: 'client_bounce',
                client: ws.clientId,
                data: JSON.stringify({
                  type: 'exit_user',
                  id: id
                })
              }));
            }
          });
          redis.set('doc:' + ws.docId + ':users', JSON.stringify(users));
          redis.publish('doc:' + ws.docId, JSON.stringify({
            type: 'client_bounce',
            client: ws.clientId,
            data: JSON.stringify({
              type: 'new_user',
              id: ws.clientId,
              user: users[ws.clientId]
            })
          }));
          ws.sendJSON({
            type: 'info',
            user_id: ws.userId,
            users: users
          });
          console.log('[Websocket Client Authed] ID: ' + ws.clientId + ', Email: ' + email);
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
};
