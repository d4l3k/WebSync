// WebSync: Charts for Spreadsheets
define(['websync', '/assets/tables.js', '/assets/Chart.js'], function(WS, tables, charts) {
  'use strict';
  var self = {};

  // Button to insert chart. Might be moved under Table tab instead.
  $('#Insert').append(" <button id='insert_chart' class='btn btn-default Chart' title='Insert Chart'><i class='fa fa-picture-o'></i></button>");

  // Insert Modal
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
        '<button type="button" class="btn btn-primary" data-dismiss="modal" id="insertChartBtn">Insert</button>' +
      '</div>' +
    '</div>' +
  '</div>' +
'</div>');
  $('#insertChartModal').find('input, select').change(function(e) {
    updateModal();
  });
  var insertChart = false;
  $('#insertChartModal #insertChartBtn').on('click.Chart', function(e) {
    WS.info('Click to insert the chart.');
    insertChart = true;
  });
  $('.content_container').on('click.Chart', function(e) {
    var sel = WS.selectionSave();
    console.log("CONTAINER FUCKERS!", sel, e);
    if (insertChart) {
      $('#insertChartModal .Chart').appendTo(sel.endContainer);
      insertChart = false;
    }
  });
  // Create a chart in a container with options and size.
  function makeChart(container, options, size) {
    var chart = $('<div class="Chart resizable" contenteditable="false">' +
        (chartTitle ? '<h2>' + options.chartTitle + '</h2>' : '')+
        '<h3 class="y">' + options.chartYTitle + '</h3>' +
        '<canvas class="noresize"></canvas>' +
        '<h3>' + options.chartXTitle + '</h3>' +
        '<div class="legend"></div>' +
        '</div>');
    var chartObj;
    chart.data('chartOptions', options);
    chart.appendTo(document.body);
    chart.css({
      height: size.height,
      width: size.width
    });
    var $canvas = chart.find('canvas');


    function resize() {
      var height = chart.height();
      var width = chart.width();
      var canvasWidth = (width-(options.chartYTitle ? 30 : 0));
      var canvasHeight = height - chart.find('h3:not(.y)').height() -
        (options.legend ? 20 : 0) -
        chart.find('h2').height();
      console.log(height, width, canvasHeight);
      $canvas[0].width = canvasWidth;
      $canvas[0].height = canvasHeight;
      chart.find('h3.y').width(canvasHeight);
    }

    resize();

    var timeout = -1;
    chart.on('resize.Chart', function(e) {
      resize();
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        chartObj.stop();
        chartObj.reflow();
        chartObj.render();
      }, 100);
    });

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
        labels: cellData[0].slice(options.firstRowAsTitles ? 1 : 0),
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
    chartObj =  new Chart(ctx)[options.type](data, options);
    if (options.legend) {
      options.legendTemplate = "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>";
      setTimeout(function() {
        chart.find('.legend').html(chartObj.generateLegend());
      }, 100);
    }
    return [chart, chartObj];
  }
  // Reset the chart insertion modal.
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
  // Redraw the preview chart.
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
  });
  WS.registerDOMException('.Chart', function(obj) {
    return {
      options: $(obj).data('chartOptions'),
      style: $(obj).attr('style')
    };
  }, function(json) {
    var id = 'tmp' + (Math.random()*10000000 | 0);
    setTimeout(function() {
      var chart = makeChart(null, json.options, {
        width: 558,
        height: 300
      });
      $('#' + id).replaceWith(chart[0]);
      chart[0].attr('style', json.style);
      chart[0].resize();
    }, 1);
    return '<div id="'+id+'"></div>';
  });

  // Create a palette of colors. Opacities can be undefined or in the format of [1, 0.5, 0].
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
