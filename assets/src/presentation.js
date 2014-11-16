// WebSync: Page layout handler
define('/assets/presentation.js', ['websync'], function(WS) {
  var self = {};
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
    self.updateMenu();
    self.updateScale();
  });
  var hidden = false;
  $('#presentation-nav .toggle-sidebar, .return_edit .menu').click(function() {
    $('#presentation-nav').toggleClass('offscreen');
    var pos = -250;
    if (hidden) {
      pos = 0;
    }
    hidden = !hidden;
    $('.content_well').css({
      left: pos + 250
    });
    self.updateEditable();
    _.delay(function() {
      $(window).trigger('resize');
    }, 200);
  });
  self.updateViewmode = function(e) {
    if (WS.viewMode == 'Presentation') {
      $('#presentation-nav').removeClass('offscreen');
      hidden = false;
      $('#presentation-nav .toggle-sidebar').click();
    } else {
      $('#presentation-nav').addClass('offscreen');
      hidden = true;
      $('#presentation-nav .toggle-sidebar').click();
    }
  }
  $(document).on('viewmode', self.updateViewmode);
  $('#remSlide').click(function() {
    var prev = $('.slide.active').prev();
    if (_.isEmpty(prev)) {
      prev = $('.slide.active').next();
    }
    $('.slide.active').remove();
    prev.addClass('active');
    self.updateMenu();
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
      setTimeout(self.updateScale, 200);
    }
    self.updateEditable();
    self.updateMenu();
  };
  self.updateEditable = function() {
    $('#slides .slide-content').attr('contenteditable', WebSyncAuth.view_op == 'edit');
  }
  $('#presentation-nav #slideView').delegate('.slidePreview', 'click', function() {
    $('.slide.active').removeClass('active');
    $('.slidePreview.active').removeClass('active');
    $(this).addClass('active');
    $($('.slide').get($(this).data().index)).addClass('active');
  });
  $(document).on('diffed', function() {
    self.updateMenu();
  });
  self.updateMenu = function() {
    $('#slideView').html('');
    $('.slide').each(function(index, slide) {
      var preview = $("<div draggable='true' class='slidePreview " + ($(slide).hasClass('active') ? 'active' : '') + "'><div class='slide'>" + $(slide).html() + '</div></div>');
      preview.find('.slide-content').attr('contenteditable', null);
      preview.appendTo($('#slideView'))
        .data({
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
  };
  $('.content_well').children().bind('mousedown selectstart', function(e) {
    e.stopPropagation();
  });
  $(document).keydown(function(e) {
    if (WebSyncAuth.view_op == 'view') {
      if (e.keyCode == 39 || e.keyCode == 32 || e.keyCode == 40) {
        // Move forward a slide
        var cur_slide = $('.slidePreview.active').data().index;
        var next_slide = cur_slide + 1;
        var slide_num = $('#slides .slide').length;
        if (next_slide < slide_num) {
          $('.slide.active').removeClass('active');
          $('.slidePreview.active').removeClass('active');
          $($('#slides .slide').get(next_slide)).addClass('active');
          $($('.slidePreview').get(next_slide)).addClass('active');
        }
        e.preventDefault();
      } else if (e.keyCode == 37 || e.keyCode == 38) {
        // Move back a slide
        var cur_slide = $('.slidePreview.active').data().index;
        var next_slide = cur_slide - 1;
        if (next_slide >= 0) {
          $('.slide.active').removeClass('active');
          $('.slidePreview.active').removeClass('active');
          $($('#slides .slide').get(next_slide)).addClass('active');
          $($('.slidePreview').get(next_slide)).addClass('active');
        }
        e.preventDefault();
      }
    }
  });
  self.updateScale = function() {
    var well_rect = $('.content_well').get(0).getBoundingClientRect();
    var content_rect = $('.content_container .slide.active');
    var width_scale = well_rect.width / (content_rect.width() + 80);
    var height_scale = well_rect.height / (content_rect.height() + 65);
    var zoom = (width_scale > height_scale) * height_scale + (width_scale <= height_scale) * width_scale;
    WS.setZoom(zoom);
  };
  $(window).bind('resize', self.updateScale);
  $(document).on('modules_loaded', function() {
    WS.fromJSON();
    $(window).resize();
    NProgress.done();
  });
  return self;
});
