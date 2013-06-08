var pq = require("../../index");

pq.worker("add values", function(args, cb){
	var num1 = args.num1;
	var num2 = args.num2;
	console.log("Adding values: " + num1 + " + " + num2 + " = " + (num1 + num2));
	cb(null, num1 + num2);
});