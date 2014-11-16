// WebSync: Charts for Spreadsheets
define(['websync', '/assets/tables.js', '/assets/Chart.js'], function(WS, tables, charts) {
  'use strict';
  var self = {};

  // Toggle button to enable drawing mode. Might be moved under the text editing tab.
  $('#Insert').append(" <button id='insert_chart' class='btn btn-default Chart' title='Insert Chart'><i class='fa fa-picture-o'></i></button>");

  $(document.body).append('<div class="modal fade" id="insertChartModal" tabindex="-1" role="dialog" aria-labelledby="insertModalLabel" aria-hidden="true">' +
  '<div class="modal-dialog">' +
    '<div class="modal-content">' +
      '<div class="modal-header">' +
        '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
        '<h4 class="modal-title" id="insertModalLabel">Insert a Chart</h4>' +
      '</div>' +
      '<div class="modal-body">' +
        '<label for="chartType">Chart Type</label>' +
        '<select id="chartType" class="form-control">' +
          _.map(['Line', 'Bar', 'Radar', 'Polar Area', 'Pie', 'Doughnut'], function(type) {
            return '<option>' + type + '</option>';
          }).join('') +
        '</select>' +
        '<div class="ChartContainer"></div>' +
        '<div class="options All">' +
          '<label for="chartTitle">Chart Title</label>' +
          '<input type="text" id="chartTitle" class="form-control">' +
          '<label for="chartXTitle">X-Axis Title</label>' +
          '<input type="text" id="chartXTitle" class="form-control">' +
          '<label for="chartYTitle">Y-Axis Title</label>' +
          '<input type="text" id="chartYTitle" class="form-control">' +
          '<label for="dataRange">Data Range</label>' +
          '<input type="text" id="dataRange" class="form-control">' +
          '<label>' +
            '<input type="checkbox" id="legend" checked> Legend' +
          '</label>' +
        '</div>' +
        '<div class="options Line Bar Radar">' +
          '<label>' +
            '<input type="checkbox" id="firstRowAsTitles" checked> Use first row as titles' +
          '</label>' +
        '</div>' +
        '<div class="options Line">' +
          '<label>' +
            '<input type="checkbox" id="bezierCurve"> Smooth Curve (Bezier)' +
          '</label>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
        '<button type="button" class="btn btn-primary" id="insertChartBtn">Insert</button>' +
      '</div>' +
    '</div>' +
  '</div>' +
'</div>');
  $('#insertChartModal').find('input, select').change(function(e) {
    updateModal();
  });
  $('#insertChartModal #insertChartBtn').click(function(e) {
    WS.info('Click to insert the chart.');
  });
  function makeChart(container, options, size) {
    var chart = $('<div class="Chart">' +
        (chartTitle ? '<h2>' + options.chartTitle + '</h2>' : '')+
        '<h3 class="y" style="width:' + size.height + 'px">' + options.chartYTitle + '</h3>' +
        '<canvas width=' + (size.width-(options.chartYTitle ? 30 : 0)) +
        ' height=' + size.height +' ></canvas>' +
        '<h3>' + options.chartXTitle + '</h3>' +
        '<div class="legend"></div>' +
        '</div>');

    var cellData = tables.getCellData(options.dataRange);
    if (_.include(['PolarArea', 'Pie', 'Doughnut'], options.type)) {
      var data = [];
      var colors = self.colorWheel(cellData[0].length, [1, 0.5]);
      _.each(cellData[0], function(v, i) {
        data.push({
          label: v,
          value: cellData[1][i],
          color: colors[i][0],
          highlight: colors[i][1]
        });
      });
    } else {
      var data = {
        labels: cellData[0],
        datasets: []
      };
      var colors = self.colorWheel(cellData.length);
      _.each(cellData.slice(1), function(column, i) {
        var color = colors[i];
        var datum = {
          fillColor: 'rgba(0,0,0,0)',
          strokeColor: color,
          pointColor: color,
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: color
        }
        if (options.firstRowAsTitles) {
          datum.data = column.slice(1);
          datum.label = column[0];
        } else {
          datum.data = column;
        }
        if (options.type === 'Bar') {
          datum.strokeColor = 'rgba(0,0,0,0)';
          datum.fillColor = color;
        }
        data.datasets.push(datum);
      });
    }
    if (container) {
      $(container).append(chart);
    }
    var ctx = chart.find('canvas')[0].getContext('2d');
    var chartObj =  new Chart(ctx)[options.type](data, options);
    if (options.legend) {
      options.legendTemplate = "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>";
      chart.find('.legend').html(chartObj.generateLegend());
    }
    return [chart, chartObj];
  }
  function clearModal() {
    $('#chartType').val('Line');

    var table_count = $('.content_container table').index(tables.primaryTable()) + 1;
    var name = $(tables.table).attr('name') || ('Table ' + table_count);
    var start = tables.selectedPos();
    var end = tables.selectedPos(tables.selectionEnd);
    var queryString = name + "." +
      tables.columnLabel(start[0]) + (start[1] + 1) + ":" +
      tables.columnLabel(end[0]) + (end[1] + 1)
    $('#dataRange').val(queryString);
    tables.clearSelect();
  }
  function updateModal() {
    var chartType = $('#chartType').val().replace(/ /g, '');
    $('.ChartContainer .Chart').remove();
    $('#insertChartModal .options:not(.All)').hide();
    $('#insertChartModal .options.'+chartType).show();

    var options = {
      type: chartType
    };
    _.each($('#insertChartModal').find('.options.All, .options.'+chartType).find('input, select'), function(elem) {
      var inputType = $(elem).attr('type');
      if (inputType === 'checkbox') {
        options[elem.id] = elem.checked;
      } else {
        options[elem.id] = $(elem).val();
      }
    });

    console.log(options);
    makeChart($('.ChartContainer'), options, {
      width: 558,
      height: 300
    });
  }

  // Insert Chart
  $("#insert_chart").click(function(e) {
    clearModal();
    updateModal();
    $('#insertChartModal').modal('show');
    /*
    var start = tables.selectedPos();
    var end = tables.selectedPos(tables.selectionEnd);
    var name = $(tables.table).attr('name');
    var canvas = $('<canvas class="Chart" width="640" height="480"></canvas>');
    $('.content_container').append(canvas);
    var pos = $(tables.selectedElem).position();
    canvas.css({
      backgroundColor: 'white',
      position: 'absolute',
      top: pos.top,
      left: pos.left
    });
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
      var color = self.randomColor();
      data.datasets.push({
        data: column,
        fillColor: 'rgba(0,0,0,0)',
        strokeColor: color,
        pointColor: color,
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: color
      });
    });
    var chart = new Chart(ctx).Line(data, {
      bezierCurve: false
    });
    var timeout = -1;
    canvas.on('resize', function(e) {
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        canvas[0].width = chart.chart.width = canvas.width();
        canvas[0].height = chart.chart.height = canvas.height();
        chart.reflow();
        chart.render();
      }, 100);
    });
    */
  });
  WS.registerDOMException('.Chart', function(obj) {
    return {
      options: $(obj).data('chartOptions')
    };
  }, function(json) {
    var id = 'tmp' + (Math.random()*10000000 | 0);
    setTimeout(function() {
      var chart = makeChart(null, json.options, {
        width: 558,
        height: 300
      });
      $('#' + id).replaceWith(chart[0]);
    }, 1);
    return '<div id="'+id+'"></div>';
  });
  self.colorWheel = function(number, opacities) {
    var colors = [];
    function makeHSLA(h, s, l, a) {
      return 'hsla(' +
          (h|0) + ',' +
          (s|0) + '%,' +
          (l|0) + '%,' +
          a + ')';
    };
    _.times(number, function(i) {
      var h = i/number * 360;
      var s = 100;
      var l = 60;
      if (opacities) {
        var color = _.map(opacities, function(opacity) {
          return makeHSLA(h, s, l, opacity);
        });
      } else {
        var color = makeHSLA(h, s, l, 1);
      }
      colors.push(color);
    });
    return colors;
  };
  self.randomColor = function() {
    var r = Math.random();
    var g = Math.random();
    var b = Math.random();
    var scale = 255/Math.max(r, g, b);
    r *= scale;
    g *= scale;
    b *= scale;
    return 'rgba(' +
        (r|0) + ',' +
        (g|0) + ',' +
        (b|0) + ',1)';
  }

  // Code to disable the function.
  self.disable = function() {
    $('*').unbind('.Chart');
    $('*').undelegate('.Chart');
    $('.Chart').remove();
    WS.unregisterDOMException('.Chart');
  };
  // Return self so other modules can hook into this one.
  return self;
});
