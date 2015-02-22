var config = require('../config.js');
var postgres = config.postgres;

module.exports = function(ws, data) {
  var ids = [];
  postgres.query('SELECT asset_id FROM asset_ws_files WHERE file_id = $1', [ws.docId]).
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
};
