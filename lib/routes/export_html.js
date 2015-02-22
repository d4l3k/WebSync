var crypto = require('crypto'),
    fs = require('fs');

var unoconv = require('unoconv'),
    pdf = require('html-pdf'),
    tmp = require('tmp');

var redis = require('../config.js').redis;

module.exports = function(ws, data) {
  var sendFile = function(result) {
    crypto.randomBytes(16, function(err, buf) {
      var token = buf.toString('hex');
      var address = 'websync:document_export:' + ws.docId + ':' + token;
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
  };
  // TODO: Take into account data.docType
  if (data.extension === 'pdf') {
    var options = {
      format: 'Letter',
      border: '1in'
    };
    console.log('exporting!');
    fs.writeFile('/tmp/blah.html', data.data, function(err) {});
    pdf.create(data.data, options).toBuffer(function(err, res) {
      if (err) {
        console.log('Node-pdf', err);
        ws.error('Node-pdf failed to convert. Please try again.');
      }
      sendFile(res);
    });
  } else {
    tmp.file({
      mode: 0644,
      prefix: 'websync-backend-export-',
      postfix: '.html'
    }, function _tempFileCreated(err, path, fd) {
      if (err) {
        throw err;
      }
      console.log('File: ', path);
      console.log('Filedescriptor: ', fd);
      fs.writeFile(path, data.data, function(err) {
        fs.close(fd, function(err) {
          console.log('Extension:', data.extension);
          unoconv.convert(path, data.extension, function(err, result) {
            if (err) {
              console.log('UNOCONV ERROR', err);
              ws.error('Unoconv failed to convert. Please try again.');
            } else {
              sendFile(result);
            }
          });
        });
      });
    });
  }
};
