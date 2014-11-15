// WebSync: Charts for Spreadsheets
define(['websync', '/assets/tables.js', '/assets/Chart.js'], function(websync, tables, charts) {
  var self = {};

  // Toggle button to enable drawing mode. Might be moved under the text editing tab.
  $('#Insert').append(" <button id='insert_chart' class='btn btn-default Chart' title='Insert Chart'><i class='fa fa-picture-o'></i></button>");

  // Insert Chart
  $("#insert_chart").click(function(e) {
    var start = tables.selectedPos();
    var end = tables.selectedPos(tables.selectionEnd);
    var name = $(tables.table).attr('name');
    var canvas = $('<canvas class="Chart" width="640" height="480"></canvas>');
    var pos = $(tables.selectedElem).position();
    canvas.css({
      backgroundColor: 'white',
      position: 'absolute',
      top: pos.top,
      left: pos.left
    });
    $('.content_container').append(canvas);
    var ctx = canvas[0].getContext('2d');
    var queryString = name + "." +
      tables.columnLabel(start[0]) + (start[1] + 1) + ":" +
      tables.columnLabel(end[0]) + (end[1] + 1)
    var cellData = tables.getCellData(queryString);
    var data = {
      labels: cellData[0],
      datasets: []
    };
    _.each(cellData.slice(1), function(column) {
      data.datasets.push({
        data: column,
        fillColor: "rgba(220,220,220,0.2)",
        strokeColor: "rgba(220,220,220,1)",
        pointColor: "rgba(220,220,220,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(220,220,220,1)"
      });
    });
    new Chart(ctx).Line(data, {
      bezierCurve: false
    });
  });

  // Code to disable the function.
  self.disable = function() {
    $('*').unbind('.Chart');
    $('*').undelegate('.Chart');
    $('.Chart').remove();
    WebSync.unregisterDOMException('.drawing');
  };
  // Return self so other modules can hook into this one.
  return self;
});
