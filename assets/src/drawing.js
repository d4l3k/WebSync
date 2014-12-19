/*global define, document, $, _*/

define(['websync'], function(WebSync) {
  'use strict';

  /**
   * WebSync: Free form drawing/note taking functionality.
   *
   * @module drawing
   * @exports drawing
   */

  var exports = {
    /** The interval is how often the points are taken. This is probably going to be removed. */
    interval: 50,

    /** If the pen is active. */
    active: false,

    /** Holds the lines */
    points: {},

    /**
     * Add a point to a line based on event.
     *
     * @param e {Event} the event
     */
    savePoint: function(e) {
      var relativeTo = $(exports.parent);
      var position = relativeTo.css('position');
      if (position !== 'absolute' && position !== 'relative') {
        relativeTo = $('.content_container');
      }
      var corner = relativeTo.offset();
      var point = [e.pageX - corner.left, e.pageY - corner.top];
      exports.points[exports.activeId].push(point);
      exports.drawPoints(exports.activeId, exports.canvas);
      e.preventDefault();
    },

    /**
     * Draw a line to a canvas based on a series of [x,y] coordinate pairs.
     *
     * @param id {String} name of the line
     * @param canvas {Canvas} the canvas element to draw on
     */
    drawPoints: function(id, canvas) {
      var points = exports.points[id];
      // Find corners of the drawing
      var top, left, bottom, right;
      _.each(points, function(point) {
        if (point[0] - 5 < left || !left) {
          left = point[0] - 5;
        }
        if (point[0] + 5 > right || !right) {
          right = point[0] + 5;
        }
        if (point[1] - 5 < top || !top) {
          top = point[1] - 5;
        }
        if (point[1] + 5 > bottom || !bottom) {
          bottom = point[1] + 5;
        }
      });
      // This is a hack to clear canvas.
      canvas.width = 100;
      $(canvas).css({
        position: 'absolute',
        left: left,
        top: top
      }).attr('width', right - left).attr('height', bottom - top);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      _.each(points, function(point, index) {
        if (points[index + 1]) {
          if (index === 0) {
            ctx.moveTo(point[0] - left, point[1] - top);
          }
          ctx.lineTo(points[index + 1][0] - left, points[index + 1][1] - top);
        }
      });
      ctx.stroke();
    },

    /** Code to disable the function. */
    disable: function() {
      $('*').unbind('.Drawing');
      $('*').undelegate('.Drawing');
      $('.Drawing').remove();
      WebSync.unregisterDOMException('.drawing');
    }
  };

  // Toggle button to enable drawing mode. Might be moved under the text editing tab.
  $('#Insert').append(" <button id='drawing_mode' class='btn btn-default Drawing' title='Draw'><i class='fa fa-pencil'></i></button>");
  $('#drawing_mode').click(function() {
    $(this).toggleClass('active');
    exports.active = !exports.active;
  });

  // Bind mouse to the content container. This waits to make sure that the .content_container has been added (happens in the layout plugin).
  $(document).on('modules_loaded', function() {
    $('.content_container').bind('mousedown.Drawing', function(e) {
      if (exports.active) {
        exports.drag = true;
        exports.lastTime = new Date();
        // The activeId is the identifier used for each line.
        exports.activeId = (new Date()).getTime().toString();
        exports.points[exports.activeId] = [];
        if ($(e.target).attr('contenteditable') === 'true') {
          exports.parent = e.target;
        } else {
          exports.parent = $(e.target).parents('[contenteditable=true]');
        }
        exports.canvas = document.createElement('canvas');
        $(exports.canvas).addClass('Drawing').data('drawid', exports.activeId).prependTo(exports.parent);
        exports.savePoint(e);
      }
    }).bind('mousemove.Drawing', function(e) {
      if (exports.active && exports.drag) {
        var date = new Date();
        exports.savePoint(e);
        exports.lastTime = date;
        //}
      }
    }).bind('mouseup.Drawing', function(e) {
      if (exports.active && exports.drag) {
        exports.drag = false;
        exports.savePoint(e);
      }
    });
  });

  // Register a DOM serialization exception. This allows us to store custom JSON instead of JSONized HTML.
  WebSync.registerDOMException('.Drawing', function(obj) {
    var id = $(obj).data('drawid');
    var position = $(obj).position();
    return {
      id: id,
      points: exports.points[id],
      left: position.left,
      top: position.top
    };
  }, function(json) {
    exports.points[json.id] = json.points;
    setTimeout(function() {
      var canvas = $("[data-drawid='" + json.id + "']");
      // Draw the points.
      exports.drawPoints(json.id, canvas[0]);
      // Set the position of the line.
      canvas.css({
        left: json.left,
        top: json.top
      });
    }, 1);
    return '<canvas class="Drawing" data-drawid="' + json.id + '"></canvas>';
  });

  // Return exports so other modules can hook into this one.
  return exports;
});
