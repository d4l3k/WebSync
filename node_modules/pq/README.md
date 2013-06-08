`pq` is a lightweight priority job queue in node.js. It's meant to be easy to read and use. Once you start a worker, it runs for as long as the process runs. Jobs are queued and run asynchronously, and can have optional priorities, which are arbitrary integers. Workers can run one (by default) or many jobs at the same time (although node.js by itself can only run on one thread, so it's more for I/O than true concurrency). Workers can optionally return results back to the caller, even if they're in separate processes.

Dependencies
============

- [redis](https://github.com/mranney/node_redis) >= 0.8.2
- [async](https://github.com/caolan/async) >= 0.1.22

Installation
============

`npm install pq` or add `pq` to your package.json's dependencies.

Usage
=====

Here's a demo of using `pq` to create a simple addition calculator.

To create a worker:

```javascript
pq.worker("add", function(args, cb){
	var num1 = args.num1;
	var num2 = args.num2;
	cb(null, num1 + num2);
});
```

To create a normal-priority job that you don't need a callback to:

```javascript
pq.job("add", {
	num1: 42,
	num2: 7
});
```

To create a normal-priority job and get the result:

```javascript
pq.job("add", {
	num1: 42,
	num2: 7
}, function(err, result, request){
	console.log("Result should be 49: " + result);
});
```

To create a job with a different priority:

```javascript
pq.job("add", {
	num1: 42,
	num2: 7
}, {
	priority: pq.job.PRIORITY.HIGH
});
```

To create a job with a different priority and get the result:

```javascript
pq.job("add", {
	num1: 42,
	num2: 7
}, {
	priority: pq.job.PRIORITY.HIGH
}, function(err, result, request){
	console.log("Result should be 49: " + result);
});
```

License
=======

**tl;dr: MIT License, do what you want, just attribute for it**

Copyright (c) 2012 Steve Streza.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
