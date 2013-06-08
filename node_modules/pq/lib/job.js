var util = require("util");
var async = require("async");
var connection = require("./connection");

var callbacks = null;

function handleFinish(channel, message, data){
	var results = message.match(/^pq:(.*):finish:([0-9]+)$/);
	if(results && results.length == 3){
		var queueName = results[1];
		var jobID = results[2];
		if(callbacks && callbacks[queueName] && callbacks[queueName][jobID]){
			data = JSON.parse(data);
			callbacks[queueName][jobID](data.error, data.result, data.request);
			delete callbacks[queueName][jobID];
			callbacks[queueName][jobID] = undefined;
		}
	}
}

var job = module.exports = function(name, args, opts, cb){
	if(arguments.length == 3 && arguments[2] instanceof Function){
		cb = opts;
		opts = undefined;
	}

	if(!opts){
		opts = {};
	}

	if(!opts.priority){
		opts.priority = job.PRIORITY.NORMAL;
	}

	var conn = connection.getConnection();
	var pubConn = connection.getPublishConnection();
	var subConn = connection.getSubscribeConnection();

	var baseName = "pq:" + name;

	async.waterfall([
		function createJobID(cb){
			conn.multi()
				.hsetnx(baseName, "pending", 0)
				.hsetnx(baseName, "total",   0)
				.hincrby(baseName, "pending", 1)
				.hincrby(baseName, "total", 1)
				.exec(function(err, response){
					if(err){
						cb(err, null);
					}else{
						var jobID = response[3];
						cb(null, jobID);
					}
				});
		},
		function createJob(jobID, callback){
			if(cb){
				if(!callbacks){
					callbacks = {};

					subConn.on("pmessage", handleFinish);
					subConn.psubscribe("pq:*:finish:*");
				}

				if(!callbacks[name]){
					callbacks[name] = {};
				}

				callbacks[name][jobID] = cb;
			}

			conn.multi()
				.hmset(baseName + ":" + jobID, {
					name: name,
					priority: opts.priority,
					args: JSON.stringify(args)
				})
				.zadd(baseName + ":pending", opts.priority, jobID)
				.exec(function(err, results){
					pubConn.publish(baseName + ":enqueue", jobID);
					callback(null, jobID);
				});
		}
	])
};

module.exports.PRIORITY = {
	VERY_HIGH:  100,
	HIGH:       10,
	NORMAL:     1,
	LOW:        0
};