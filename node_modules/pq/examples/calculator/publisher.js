var pq = require("../../index");

var success = 0;
var fail = 0;
var left = 0;
var total = 0;

function finish(err, result, request){
	var num1 = request.num1;
	var num2 = request.num2;
	if((num1 + num2) != result){
		fail++;
		console.log("Job " + idx + " done, expected " + (num1 + num2) + ", got " + result + ": " + ((num1 + num2) == result ? "success!" : "FAIL"));
	}else{
		success++;
	}

	if(--left == 0){
		console.log("Finished running " + total + " jobs: " + success + " succeeded, " + fail + " failed, " + (fail / total * 100.) + "% failure rate");
		process.exit(0);
	}
}

function postJob(idx, num1, num2){
	console.log("Posting job " + idx + ": " + num1 + " + " + num2);
	left++;
	total++;
	pq.job("add values", {
		num1: num1,
		num2: num2
	}, {
		priority: ((idx % 7 == 0) ? pq.job.PRIORITY.HIGH : pq.job.PRIORITY.NORMAL)
	}, finish);
};

for(var idx = 0; idx < 500; idx++){
	var num1 = Math.floor(Math.random()*1000)
	var num2 = Math.floor(Math.random()*1000)
	postJob(idx, num1, num2);
}