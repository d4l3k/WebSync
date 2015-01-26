/*global define, $, document, WebSyncAuth*/
define(['websync'], function(WS) {
  'use strict';

  /**
   * The object resizing plugin.
   *
   * @export resize
   * @module resize
   */

  var exports = {
    /**
     * Activate the resize handles on a specified element.
     * @param elem {Element} the element to resize
     */
    resizeOn: function(elem) {
      exports.resizeOff();
      exports.active = elem;
      // Add handle DIVs
      $('.content').append('<div class="Resize handle top left' + ($(elem).css('position') === 'absolute' ? " dragable\"><i class='fa fa-arrows'></i><i class='fa fa-trash-o'></i>" : '\">') + '</div>');
      $('.content').append('<div class="Resize handle top middle"></div>');
      $('.content').append('<div class="Resize handle top right"></div>');
      $('.content').append('<div class="Resize handle right middle"></div>');
      $('.content').append('<div class="Resize handle right bottom"></div>');
      $('.content').append('<div class="Resize handle bottom middle"></div>');
      $('.content').append('<div class="Resize handle bottom left"></div>');
      $('.content').append('<div class="Resize handle left middle"></div>');
      exports.updateHandles();
      exports.active.addEventListener('DOMSubtreeModified', exports.observer);
    },

    /** Updates the position of the handles. */
    updateHandles: function() {
      if (!exports.active) {
        return;
      }
      var offset = $(exports.active).offset();
      if (exports.active.getBoundingClientRect) {
        var rect = exports.active.getBoundingClientRect();
        var width = rect.width;
        var height = rect.height;
        $('.Resize.handle.top').offset({
          top: offset.top - 4
        });
        $('.Resize.handle.left').offset({
          left: offset.left - 4
        });
        $('.Resize.handle.right').offset({
          left: offset.left + width - 3
        });
        $('.Resize.handle.bottom').offset({
          top: offset.top + height - 3
        });
        $('.Resize.handle.right.middle, .Resize.handle.left.middle').offset({
          top: offset.top + height / 2 - 4
        });
        $('.Resize.handle.top.middle, .Resize.handle.bottom.middle').offset({
          left: offset.left + width / 2 - 4
        });
        $('.Resize.handle.top.left.dragable').offset({
          left: offset.left - 8,
          top: offset.top - 8
        });
        // Fallback method. TODO: Remove.
      } else {
        $('.Resize.handle.top').offset({
          top: offset.top - 4
        });
        $('.Resize.handle.left').offset({
          left: offset.left - 4
        });
        $('.Resize.handle.right').offset({
          left: offset.left + $(exports.active).outerWidth() * WS.zoom - 3
        });
        $('.Resize.handle.bottom').offset({
          top: offset.top + $(exports.active).outerHeight() * WS.zoom - 3
        });
        $('.Resize.handle.right.middle, .Resize.handle.left.middle').offset({
          top: offset.top + $(exports.active).outerHeight() * WS.zoom / 2 - 4
        });
        $('.Resize.handle.top.middle, .Resize.handle.bottom.middle').offset({
          left: offset.left + $(exports.active).outerWidth() * WS.zoom / 2 - 4
        });
        $('.Resize.handle.top.left.dragable').offset({
          left: offset.left - 8,
          top: offset.top - 8
        });
      }
    },

    /** A polling observer that checks for changes in size of the target element. */
    observer: function() {
      var boundingData = JSON.stringify(exports.active.getBoundingClientRect());
      if (boundingData !== exports.lastSize) {
        setTimeout(function() {
          exports.updateHandles();
        }, 1);
        exports.lasttSize = boundingData;
      }
    },

    /** Hides the resizing handles. */
    resizeOff: function() {
      exports.drag = false;
      exports.origX = null;
      exports.origY = null;
      exports.origWidth = null;
      exports.origHeight = null;
      $('.Resize.handle').remove();
      if (exports.active) {
        exports.active.removeEventListener('DOMSubtreeModified', exports.observer);
      }
      exports.active = null;
    },

    /** Deactivates the resizing plugin. */
    disable: function() {
      exports.resizeOff();
      $('*').unbind('.Resize');
      $('*').undelegate('.Resize');
    }
  };

  $('#Text').append('<button id="floatElement" title="Toggle Float" class="btn btn-default"><i class="fa fa-arrows"></i></button>');
  $('#floatElement').click(function() {
    if (exports.active) {
      $(exports.active).toggleClass('float').trigger('resize');
      var tmp = exports.active;
      tmp.style.top = null;
      tmp.style.left = null;
      exports.resizeOff();
      exports.resizeOn(tmp);
    }
  });

  // Bind mouse to the content container. This waits to make sure that the .content_container has been added (happens in the layout plugin).
  $(document).on('modules_loaded', function() {
    $('.content_container').delegate('img:not(.noresize), iframe:not(.noresize), table:not(.noresize), .note-page section:not(.noresize), canvas:not(.noresize), .resizable', 'click.Resize', function(e) {
      if (WebSyncAuth.viewOp === 'edit' && WebSyncAuth.access !== 'viewer') {
        exports.resizeOn(this);
        e.stopPropagation();
      }
    });
  });
  $('.content').bind('click.Resize', function() {
    exports.resizeOff();
  });
  $(document).bind('clear_select.Resize', function() {
    exports.resizeOff();
  });
  $('.content').delegate('.Resize.handle', 'click.Resize', function(e) {
    e.stopPropagation();
  });
  $('.content').delegate('.Resize.handle.dragable i.fa-arrows', 'mousedown.Resize', function(e) {
    exports.drag = true;
    exports.origMove = $(exports.active).position();
    exports.origMouse = {
      left: e.pageX,
      top: e.pageY
    };
    e.preventDefault();
  });
  $('.content').delegate('.Resize.handle.dragable i.fa-trash-o', 'mousedown.Resize', function(e) {
    $(exports.active).remove();
    exports.resizeOff();
    e.preventDefault();
  });
  $('.content').delegate('.Resize.handle.bottom', 'mousedown.Resize', function(e) {
    exports.drag = true;
    exports.origY = e.pageY;
    exports.origHeight = $(exports.active).outerHeight();
    e.preventDefault();
  });
  $('.content').delegate('.Resize.handle.right', 'mousedown.Resize', function(e) {
    exports.drag = true;
    exports.origX = e.pageX;
    exports.origWidth = $(exports.active).outerWidth();
    e.preventDefault();
  });
  $(document).bind('mousemove.Resize', function(e) {
    if (exports.drag) {
      if (exports.origY) {
        $(exports.active).outerHeight((e.pageY - exports.origY) / WS.zoom + exports.origHeight);
      }
      if (exports.origX) {
        $(exports.active).outerWidth((e.pageX - exports.origX) / WS.zoom + exports.origWidth);
      }
      if (exports.origMove) {
        var xOffset = e.pageX - exports.origMouse.left;
        var yOffset = e.pageY - exports.origMouse.top;
        var newPosition = {
          left: exports.origMove.left + xOffset,
          top: exports.origMove.top + yOffset
        };
        $(exports.active).css(newPosition);
      }
      $(exports.active).trigger('resize');
      exports.updateHandles();
      e.preventDefault();
    }
  });
  $(document).bind('mouseup.Resize', function(e) {
    if (exports.drag) {
      e.preventDefault();
      exports.origX = null;
      exports.origY = null;
      exports.origMove = null;
      exports.origMouse = null;
      exports.origWidth = null;
      exports.origHeight = null;
      exports.drag = false;
    }
  });
  $(document).on('zoom.Resize', exports.updateHandles);
  $(document).on('resize.Resize', exports.updateHandles);

  // Return exports so other modules can hook into this one.
  return exports;
});