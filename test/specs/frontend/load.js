'use strict';

describe('File Creation', function () {
  it('should create a presentation', function (done) {
    helper.newDoc(function() {
      done();
    }, 2);
  });
  it('should create a spreadsheet', function (done) {
    helper.newDoc(function() {
      done();
    }, 3);
  });
  it('should create a notebook', function (done) {
    helper.newDoc(function() {
      done();
    }, 4);
  });
  it('should create a awe', function (done) {
    helper.newDoc(function() {
      done();
    }, 5);
  });
});
