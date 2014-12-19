/*global define, $, _, window, document, WebSyncData, WebSyncAuth, NProgress*/

define('/assets/presentation.js', ['websync'], function(WS) {
  'use strict';
  /**
   * WebSync: Page layout handler
   *
   * @module page
   * @exports page
   */
  var exports = {

    /** Whether the presentation nav is hidden or not */
    hidden: false,

    /** Updates the visiblity of the presentation nav when the view mode changes. */
    updateViewmode: function() {
      if (WS.viewMode === 'Presentation') {
        $('#presentation-nav').removeClass('offscreen');
        exports.hidden = false;
        $('#presentation-nav .toggle-sidebar').click();
      } else {
        $('#presentation-nav').addClass('offscreen');
        exports.hidden = true;
        $('#presentation-nav .toggle-sidebar').click();
      }
    },

    /** Updates whether the slides are editable when the view mode changes. */
    updateEditable: function() {
      $('#slides .slide-content').attr('contenteditable', WebSyncAuth.view_op === 'edit');
    },

    /** Updates the presentation menu. */
    updateMenu: function() {
      $('#slideView').html('');
      $('.slide').each(function(index, slide) {
        var preview = $("<div draggable='true' class='slidePreview " + ($(slide).hasClass('active') ? 'active' : '') + "'><div class='slide'>" + $(slide).html() + '</div></div>');
        preview.find('.slide-content').attr('contenteditable', null);
        preview.appendTo($('#slideView')).data({
          index: index
        });
        var ratio = $(preview).outerWidth() / $(slide).outerWidth();
        var scale = 'scale(' + ratio.toFixed(7) + ')';
        preview.find('.slide').css({
          'transform': scale,
          '-webkit-transform': scale
        });
        preview.height(ratio * $(slide).outerHeight());
      });
    },

    /** Updates the scale of the slides */
    updateScale: function() {
      var wellRect = $('.content_well').get(0).getBoundingClientRect();
      var contentRect = $('.content_container .slide.active');
      var widthScale = wellRect.width / (contentRect.width() + 80);
      var heightScale = wellRect.height / (contentRect.height() + 65);
      var zoom = (widthScale > heightScale) * heightScale + (widthScale <= heightScale) * widthScale;
      WS.setZoom(zoom);
    }
  };

  $('.content').hide().fadeIn();
  $('body').addClass('layout-presentation');
  $('.content').append($('<div id="slides" class="content_container"></div>'));
  $('body').append($('<div id="presentation-nav" class="sidebar"><button id="addSlide" class="btn btn-default" type="button"><i class="fa fa-plus fa-lg"></i></button> <button id="remSlide" class="btn btn-danger" type="button"><i class="fa fa-lg fa-trash-o"></i></button> <button class="btn btn-default toggle-sidebar"><i class="fa fa-bars fa-lg"></i></button><div id="slideView" class="slideWell panel panel-default"></div></div>'));
  $('#presentation-nav').css({
    left: 0
  });
  $('#addSlide').click(function() {
    $('.slide.active').removeClass('active');
    $("<div class='slide active'><div class='slide-content' contenteditable='true'></div></div>").appendTo($('#slides'));
    exports.updateMenu();
    exports.updateScale();
  });
  $('#presentation-nav .toggle-sidebar, .return_edit .menu').click(function() {
    $('#presentation-nav').toggleClass('offscreen');
    var pos = -250;
    if (exports.hidden) {
      pos = 0;
    }
    exports.hidden = !exports.hidden;
    $('.content_well').css({
      left: pos + 250
    });
    exports.updateEditable();
    _.delay(function() {
      $(window).trigger('resize');
    }, 200);
  });
  $(document).on('viewmode', exports.updateViewmode);
  $('#remSlide').click(function() {
    var prev = $('.slide.active').prev();
    if (_.isEmpty(prev)) {
      prev = $('.slide.active').next();
    }
    $('.slide.active').remove();
    prev.addClass('active');
    exports.updateMenu();
  });
  if (!WebSyncData.body) {
    WebSyncData.body = [];
  }
  WS.toJSON = function() {
    WebSyncData.body = WS.DOMToJSON($('#slides').get(0).childNodes);
  };
  WS.fromJSON = function(patch) {
    if (patch) {
      WS.applyPatch(patch, '/body/', $('.content_well #slides').get(0));
    } else {
      $('.content_well #slides').get(0).innerHTML = WS.JSONToDOM(WebSyncData.body);
      setTimeout(exports.updateScale, 200);
    }
    exports.updateEditable();
    exports.updateMenu();
  };
  $('#presentation-nav #slideView').delegate('.slidePreview', 'click', function() {
    $('.slide.active').removeClass('active');
    $('.slidePreview.active').removeClass('active');
    $(this).addClass('active');
    $($('.slide').get($(this).data().index)).addClass('active');
  });
  $(document).on('diffed', function() {
    exports.updateMenu();
  });
  $('.content_well').children().bind('mousedown selectstart', function(e) {
    e.stopPropagation();
  });
  $(document).keydown(function(e) {
    if (WebSyncAuth.view_op === 'view') {
      var curSlide, nextSlide;
      if (e.keyCode === 39 || e.keyCode === 32 || e.keyCode === 40) {
        // Move forward a slide
        curSlide = $('.slidePreview.active').data().index;
        nextSlide = curSlide + 1;
        var slideNum = $('#slides .slide').length;
        if (nextSlide < slideNum) {
          $('.slide.active').removeClass('active');
          $('.slidePreview.active').removeClass('active');
          $($('#slides .slide').get(nextSlide)).addClass('active');
          $($('.slidePreview').get(nextSlide)).addClass('active');
        }
        e.preventDefault();
      } else if (e.keyCode === 37 || e.keyCode === 38) {
        // Move back a slide
        curSlide = $('.slidePreview.active').data().index;
        nextSlide = curSlide - 1;
        if (nextSlide >= 0) {
          $('.slide.active').removeClass('active');
          $('.slidePreview.active').removeClass('active');
          $($('#slides .slide').get(nextSlide)).addClass('active');
          $($('.slidePreview').get(nextSlide)).addClass('active');
        }
        e.preventDefault();
      }
    }
  });
  $(window).bind('resize', exports.updateScale);
  $(document).on('modules_loaded', function() {
    WS.fromJSON();
    $(window).resize();
    NProgress.done();
  });
  return exports;
});
