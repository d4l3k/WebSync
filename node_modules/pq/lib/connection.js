var redis = require("redis");
var connection = module.exports;

connection.host = "localhost";
connection.port = 6379;
connection.auth = undefined;

connection.createClient = function(){
	var client = redis.createClient(connection.port, connection.host);
	if(connection.auth){
		client.auth(connection.auth);
	}
	return client;
};

var publishConnection = null;
var subscribeConnection = null;
var normalConnection = null;

connection.getPublishConnection = function(){
	if(!publishConnection){
		publishConnection = connection.createClient();
	}
	return publishConnection;
}

connection.getSubscribeConnection = function(){
	if(!subscribeConnection){
		subscribeConnection = connection.createClient();
	}
	return subscribeConnection;
}

connection.getConnection = function(){
	if(!normalConnection){
		normalConnection = connection.createClient();
	}
	return normalConnection;
}