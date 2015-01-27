/*global define, $, WebSyncData, document, _, NProgress*/
define('/assets/spreadsheet.js', ['websync', '/assets/tables.js'], function(WebSync, tables) {
  'use strict';

  /**
   * WebSync: Spreadsheet layout handler
   *
   * @module spreadsheet
   * @exports spreadsheet
   */

  var WS = WebSync;
  var exports = {
    /** Updates the headers of the spreadsheet. */
    updateHeaders: function() {
      tables.axisPosition();
      $('.axis#y').offset({
        left: -1
      });
      $('.axis#x').offset({
        top: $('.content_well').offset().top - 1
      });
      if ($('.axis#x').length > 0) {
        var xRect = $('.axis#x').outerHeight();
        var yRect = $('.axis#y').outerWidth();
        $('.content-spreadsheet #spreadsheetWell').css({
          'padding-top': xRect - 2,
          'padding-left': yRect - 2
        });
      }
    }
  };

  $('.content').hide().addClass('content-spreadsheet').fadeIn();
  $('.content').append($('<div id="spreadsheetWell" class="content_container"><div class="table_content"></div></div>'));
  if (!WebSyncData.body) {
    WebSyncData.body = [];
  }
  WebSync.toJSON = function() {
    WebSyncData.body = [WS.domExceptions.TABLE.dump($('.table_content table')[0])];
    //WebSyncData.body = DOMToJSON($("#tableInner").get(0).childNodes);
  };
  WebSync.fromJSON = function() {
    $('.table_content').html(WS.domExceptions.TABLE.load(WebSyncData.body[0]));
  };

  $(document).on('modules_loaded', function() {
    if (_.isEmpty(WebSyncData.body)) {
      console.log('Appending!!!');
      $('.table_content').html('<table><tbody></tbody></table>');
      var r, c, row;
      for (r = 0; r < 50; r++) {
        row = $('<tr></tr>').appendTo($('.table_content > table > tbody'));
        for (c = 0; c < 50; c++) {
          $('<td></td>').appendTo(row);
        }
      }
    } else {
      WebSync.fromJSON();
    }
    NProgress.done();
  });
  $('.content_well').children().bind('mousedown selectstart', function(e) {
    e.stopPropagation();
  });
  exports.updateHeaders();
  $('.content_well').scroll(exports.updateHeaders);
  $('.navbar-fixed-top').css({
    'border-bottom': '1px solid #aaa'
  });
  setTimeout(function() {
    $('#spreadsheetWell tr:first-child td:first-child').trigger('mousedown').trigger('mouseup');
    exports.updateHeaders();
  }, 100);
  tables.disableAxisPositioning = true;

  return exports;
});
