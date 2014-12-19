// WebSync: Charts for Spreadsheets
/*global define, $, _, FileReader, JST, document*/

//= require templates/chart

define(['websync', '/assets/tables.js', '/assets/Chart.js'], function(WS, tables, Chart) {
  'use strict';

  /**
   * The WebSync chart plugin.
   *
   * @exports charts
   * @module charts
   */

  var exports = {

    /**
     * Create a palette of colors in hsla format. Opacities can be undefined or in the format of [1, 0.5, 0].
     *
     * @param {Number} number - the number of colors
     * @param {Array<Number>} opacities - an optional array of opacities to generate colors with.
     * @return {Array<String>}
     */
    colorWheel: function(number, opacities) {
      var colors = [];

      function makeHSLA(h, s, l, a) {
        return 'hsla(' +
          Math.floor(h) + ',' +
          Math.floor(s) + '%,' +
          Math.floor(l) + '%,' +
          a + ')';
      }

      _.times(number, function(i) {
        var h = i / number * 360;
        var s = 100;
        var l = 60;
        var color;
        if (opacities) {
          color = _.map(opacities, function(opacity) {
            return makeHSLA(h, s, l, opacity);
          });
        } else {
          color = makeHSLA(h, s, l, 1);
        }
        colors.push(color);
      });
      return colors;
    },

    /**
     * Create a chart in a container with options and size.
     * @param {Element} container - the container to attach to.
     * @param {Collection} options - a object with options
     * @param {Collection} size - an object with width & height values.
     */
    makeChart: function(container, options, size) {
      var chart = $('<div class="Chart resizable" contenteditable="false">' +
        (options.chartTitle ? '<h2>' + _.escape(options.chartTitle) + '</h2>' : '') +
        '<h3 class="y">' + _.escape(options.chartYTitle) + '</h3>' +
        '<canvas class="noresize"></canvas>' +
        '<h3>' + _.escape(options.chartXTitle) + '</h3>' +
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

      var timeout = -1;

      function resize() {
        var height = chart.height();
        var width = chart.width();
        var canvasWidth = (width - (options.chartYTitle ? 30 : 0));
        var canvasHeight = height - chart.find('h3:not(.y)').height() -
          (options.legend ? 20 : 0) -
          chart.find('h2').height();
        $canvas[0].width = chartObj.chart.width = canvasWidth;
        $canvas[0].height = chartObj.chart.height = canvasHeight;
        $canvas.width(canvasWidth).height(canvasHeight);
        chart.find('h3.y').width(canvasHeight);
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          chartObj.reflow();
          chartObj.render();
        }, 100);
      }

      chart.on('resize.Chart', function() {
        resize();
      });

      var cellData = tables.getCellData(options.dataRange);
      var data, colors;
      if (_.include(['PolarArea', 'Pie', 'Doughnut'], options.type)) {
        data = [];
        colors = exports.colorWheel(cellData[0].length, [1, 0.5]);
        _.each(cellData[0], function(v, i) {
          data.push({
            label: v,
            value: cellData[1][i],
            color: colors[i][0],
            highlight: colors[i][1]
          });
        });
      } else {
        data = {
          labels: cellData[0].slice(options.firstRowAsTitles ? 1 : 0),
          datasets: []
        };
        colors = exports.colorWheel(cellData.length);
        _.each(cellData.slice(1), function(column, i) {
          var color = colors[i];
          var datum = {
            fillColor: 'rgba(0,0,0,0)',
            strokeColor: color,
            pointColor: color,
            pointStrokeColor: '#fff',
            pointHighlightFill: '#fff',
            pointHighlightStroke: color
          };
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
      chartObj = new Chart(ctx)[options.type](data, options);
      if (options.legend) {
        options.legendTemplate = '<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>';
        setTimeout(function() {
          chart.find('.legend').html(chartObj.generateLegend());
        }, 100);
      }
      resize();
      return [chart, chartObj];
    },

    /**
     * Reset the chart insertion modal.
     */
    clearModal: function() {
      $('#chartType').val('Line');

      var tableCount = $('.content_container table').index(tables.primaryTable()) + 1;
      var name = $(tables.table).attr('name') || ('Table ' + tableCount);
      var start = tables.selectedPos();
      var end = tables.selectedPos(tables.selectionEnd);
      var queryString = name + '.' +
        tables.columnLabel(start[0]) + (start[1] + 1) + ':' +
        tables.columnLabel(end[0]) + (end[1] + 1);
      $('#dataRange').val(queryString);
      tables.clearSelect();
    },

    /**
     * Redraw the preview chart.
     */
    updateModal: function() {
      var chartType = $('#chartType').val().replace(/ /g, '');
      $('.ChartContainer .Chart').remove();
      $('#insertChartModal .options:not(.All)').hide();
      $('#insertChartModal .options.' + chartType).show();

      var options = {
        type: chartType
      };
      _.each($('#insertChartModal').find('.options.All, .options.' + chartType).find('input, select'), function(elem) {
        var inputType = $(elem).attr('type');
        if (inputType === 'checkbox') {
          options[elem.id] = elem.checked;
        } else {
          options[elem.id] = $(elem).val();
        }
      });

      exports.makeChart($('.ChartContainer'), options, {
        width: 558,
        height: 300
      });
    },

    /**
     * Code to disable the function.
     */
    disable: function() {
      $('*').unbind('.Chart');
      $('*').undelegate('.Chart');
      $('.Chart').remove();
      WS.unregisterDOMException('.Chart');
    }
  };


  // Button to insert chart. Might be moved under Table tab instead.
  $('#Insert').append(" <button id='insert_chart' class='btn btn-default Chart' title='Insert Chart'><i class='fa fa-picture-o'></i></button>");

  // Insert Modal
  $(document.body).append(JST.get('templates/chart')());
  $('#insertChartModal').find('input, select').change(function() {
    exports.updateModal();
  });
  var insertChart = false;
  $('#insertChartModal #insertChartBtn').on('click.Chart', function() {
    WS.info('Click to insert the chart.');
    insertChart = true;
  });
  $('.content').delegate('td', 'mouseup.Chart', function(e) {
    if (insertChart) {
      $('#insertChartModal .Chart').appendTo(e.currentTarget);
      insertChart = false;
    }
  });
  $('.content_container').on('click.Chart', function() {
    if (insertChart) {
      var sel = WS.selectionSave();
      $('#insertChartModal .Chart').appendTo(sel.endContainer);
      insertChart = false;
    }
  });

  // Insert Chart
  $('#insert_chart').click(function() {
    exports.clearModal();
    exports.updateModal();
    $('#insertChartModal').modal('show');
  });
  WS.registerDOMException('.Chart', function(obj) {
    return {
      'options': $(obj).data('chartOptions'),
      'style': $(obj).attr('style'),
      'class': $(obj).attr('class')
    };
  }, function(json) {
    var id = 'tmp' + Math.floor(Math.random() * 10000000);
    setTimeout(function() {
      var chart = exports.makeChart(null, json.options, {
        width: 558,
        height: 300
      });
      $('#' + id).replaceWith(chart[0]);
      chart[0].attr('style', json.style);
      chart[0].resize();
      chart[0].attr('class', json['class']);
    }, 1);
    return '<div id="' + id + '"></div>';
  });
  // Return exports so other modules can hook into this one.
  return exports;
});
