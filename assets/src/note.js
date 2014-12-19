/*global define, $, _, document, WebSyncData, WebSyncAuth, JST, NProgress*/

//= require templates/note-nav-inner
//= require templates/note-nav-sidebar

define('/assets/note.js', ['websync'], function(WebSync) {
  'use strict';
  /**
   * WebSync: Notebook layout handler
   *
   * @exports note
   * @module note
   */
  var exports = {
    /** Trigger an update for the nav. */
    updateNav: function() {
      var activeSection = $('.note-section:visible')[0];
      var activePage = $('.note-page:visible')[0];

      var sections = _.map($('.note-section'), function(section) {
        var name = section.dataset.name || 'Unnamed Section';
        var pages = _.map($(section).children(), function(page) {
          var $children = $(page).children();
          var pageName = $children.filter('.note-title').text() ||
            $children.filter(":not('.note-title')").first().text() ||
            'Unnamed Page';

          return {
            active: page === activePage,
            name: pageName.trim()
          };
        });

        return {
          name: name,
          active: section === activeSection,
          pages: pages
        };
      });
      $('#notesView').html(JST['templates/note-nav-inner']({
        sections: sections
      }));
      var selectedElem = null;

      var dragElem = null;
      var secondLevel = false;
      $('#notesView li').on('dragstart', function(e) {
        secondLevel = $(this).parents('ul > li > ul').length !== 0;
        e.originalEvent.dataTransfer.effectAllowed = 'move';
        e.originalEvent.dataTransfer.setData('text/plain', $(this).data().index);
        dragElem = this;
        e.stopPropagation();
      }).on('dragenter', function(e) {
        e.preventDefault();
      }).on('dragover', function(e) {
        var c2 = $(e.target).parents('ul > li > ul').length !== 0;
        if (secondLevel && c2) {
          $(this).addClass('over');
        } else if (!secondLevel) {
          $(e.target).parents('#notesView > ul > li').addClass('over');
        }
        e.stopPropagation();
        e.preventDefault();
      }).on('dragleave', function() {
        $(this).removeClass('over');
      }).on('drop', function(e) {
        $('li.over').removeClass('over');
        var origSection, targetSection;
        if (secondLevel) {
          var origPage = $(dragElem).children('a').data().index;
          origSection = $(dragElem).
          parents('#notesView > ul > li').children('a').
          data().index;

          var targetPage = $(e.target).data().index;
          targetSection = $(e.target).
          parents('#notesView > ul > li').children('a').
          data().index;

          var page = $('.note-section').eq(origSection).children().eq(origPage);
          if ($(e.target).parents('#notesView > ul > li > ul').length !== 0) {
            $('.note-section').eq(targetSection).children().eq(targetPage).after(page);
          } else {
            $('.note-section').eq(targetSection).prepend(page);
          }
        } else {
          origSection = $(dragElem).children('a').data().index;
          targetSection = $(e.target).parents('#notesView > ul > li').
          children('a').data().index;
          var section = $('.note-section').eq(origSection);
          $('.note-section').eq(targetSection).after(section);
        }
        e.preventDefault();
        e.stopPropagation();
        exports.updateNav();
      });
      $('#notesView a').contextmenu({
        target: '#context-menu',
        before: function(element) {
          if ($(element).hasClass('page')) {
            $("#context-menu li:contains('Rename')").hide();
          } else {
            $("#context-menu li:contains('Rename')").show();
          }
          selectedElem = element[0];
          return true;
        },
        onItem: function(element) {
          var op = element[0].innerText;
          var target, section;
          if ($(selectedElem).hasClass('page')) {
            var page = $(selectedElem).data().index;
            section = $(selectedElem).parent().parent().parent().children().first().data().index;
            target = $('.note-section').eq(section).children().eq(page);
          } else if ($(selectedElem).hasClass('section')) {
            section = $(selectedElem).data().index;
            target = $('.note-section').eq(section);
          }
          if (op === 'Delete') {
            target.remove();
            exports.updateNav();
          } else if (op === 'Rename') {
            var finishRename = function(e) {
              // Enter or Escape
              if (!e.keyCode || e.keyCode === 13 || e.keyCode === 27) {
                e.preventDefault();
                $(selectedElem).unbind('blur.Note').unbind('keydown.Note');
                target[0].dataset.name = $(selectedElem).text();
                exports.updateNav();
              }
            };
            $(selectedElem).attr('contenteditable', true).focus().bind('blur.Note', finishRename).bind('keydown', finishRename);
          }
        }
      });
    },

    /** Check for empty notes to remove. */
    deselectNoteBubble: function() {
      $('#note-well .note-page section').attr('contenteditable', null).filter(":not('.note-title')").each(function(index, section) {
        if ($(section).text().trim() === '' && $(section).find('img, canvas').length === 0) {
          $(section).remove();
        }
      });
      exports.updateNav();
    },

    /**
     * Switches to the section with the corresponding index.
     *
     * @param section {Number} the section index
     */
    switchToSection: function(section) {
      $('.note-section').hide();
      $('.note-section').eq(section).show();
      $(document).trigger('clear_select');
    },

    /**
     * Switches to the page with the corresponding section and page indexes.
     *
     * @param section {Number} the section index
     * @param page {Number} the page index
     */
    switchToPage: function(section, page) {
      exports.switchToSection(section);
      $('.note-page').hide();
      $('.note-section').eq(section).children().eq(page).show();
      exports.updateNav();
    }
  };
  $('.content').hide().addClass('content-note').fadeIn();
  $('body').addClass('layout-note');
  $('.content').append($('<div id="note-well" class="content_container"></div>'));
  $('body').append(JST['templates/note-nav-sidebar']({}));

  var hidden = false;
  $('#note-nav .toggle-sidebar, .return_edit .menu').click(function() {
    var pos = -250;
    if (hidden) {
      pos = 0;
    }
    $('#note-nav').toggleClass('offscreen');
    $('.content_well').css({
      left: pos + 250
    });
    _.delay(function() {
      $(document).trigger('resize');
    }, 200);
    hidden = !hidden;
  });
  // Data storage
  if (!WebSyncData.body) {
    WebSyncData.body = [];
  }
  WebSync.toJSON = function() {
    WebSyncData.body = WebSync.DOMToJSON($('#note-well').get(0).childNodes);
  };
  WebSync.fromJSON = function(patch) {
    if (patch) {
      WebSync.applyPatch(patch, '/body/', $('#note-well').get(0));
    } else {
      $('.content #note-well').get(0).innerHTML = WebSync.JSONToDOM(WebSyncData.body);
    }
    exports.updateNav();
  };
  $(document).on('modules_loaded', function() {
    if (_.isEmpty(WebSyncData.body)) {
      $('#note-well').append("<div class='note-section'><div class='note-page'><section class='note-title frozen'></section></div>");
      exports.updateNav();
    } else {
      WebSync.fromJSON();
    }
    NProgress.done();
  });
  $('.content_well').children().bind('mousedown selectstart', function(e) {
    e.stopPropagation();
  });
  $('#note-well').on('click', '.note-page section', function(e) {
    exports.deselectNoteBubble();
    if (WebSyncAuth.access !== 'viewer') {
      $(e.currentTarget).attr('contenteditable', true);
      e.stopPropagation();
    }
  });
  $('#addSection').on('click', function() {
    exports.deselectNoteBubble();
    $('.note-section').hide();
    $('#note-well').append("<div class='note-section'><div class='note-page'><section class='note-title frozen'></section></div>");
    exports.updateNav();
  });
  $('#addPage').on('click', function() {
    exports.deselectNoteBubble();
    $('.note-page').hide();
    $('.note-section:visible').eq(0).append("<div class='note-page'><section class='note-title frozen'></section>");
    exports.updateNav();
  });
  $('#note-well').on('click', '.note-page', function(e) {
    exports.deselectNoteBubble();
    if (WebSyncAuth.access !== 'viewer') {
      var page = e.currentTarget;
      var note = $('<section></section');
      $(page).append(note);
      note.attr('contenteditable', true).focus();
      note.css({
        left: e.offsetX,
        top: e.offsetY
      });
    }
  });
  $('#notesView').on('click', '.section > a', function() {
    var section = parseInt($(this).parent().data().index, 10);
    exports.switchToPage(section, 0);
  }).on('click', '.page > a', function() {
    var section = parseInt($(this).parents('.section').data().index, 10);
    var page = parseInt($(this).parent().data().index, 10);
    exports.switchToPage(section, page);
  });
  return exports;
});
