var fs = require('fs'),
    redis = require('redis'),
    pg = require('pg'),
    _ = require('lodash'),
    stripJsonComments = require('strip-json-comments');

var config = {};

var buffer = fs.readFileSync('./config/config.json');
// Modified JSON format that allows comments.
var configLines = '{\n' + buffer.toString() + '\n}';
config = JSON.parse(stripJsonComments(configLines));

// Configure Databases
config.postgres = new pg.Client('tcp://' + config.postgres);
config.postgres.connect();
config.redis = _.extend(redis.createClient(config.redis.port, config.redis.host), config.redis);
if (config.redis.password) {
  config.redis.auth(config.redis.password, function (error) {
    if (error) {
      console.error('Redis auth failed:', error);
    }
  });
}

var p = process.argv.indexOf('-p');
if (p !== -1) {
  config.port = process.argv[p + 1];
} else {
  config.port = config.websocket.port;
}

module.exports = config;

