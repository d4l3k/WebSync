/*global define, $, WebSyncData, WebSyncAuth, document, NProgress*/

define('/assets/page.js', ['websync'], function(WS) {
  'use strict';

  /**
   * WebSync: Page layout handler
   * @module page
   * @exports page
   */
  var exports = {};
  $('.content').hide().
    append($('<div class="content_container"><div class="page"></div></div>')).
    addClass('content-page').fadeIn();

  if (!WebSyncData.body) {
    WebSyncData.body = [];
  }

  if (WebSyncAuth.view_op === 'edit' && WebSyncAuth.access !== 'viewer') {
    $('.page').attr('contenteditable', true);
  }
  WS.toJSON = function() {
    WebSyncData.body = WS.DOMToJSON($('.content .page').get(0).childNodes);
  };
  WS.fromJSON = function(patch) {
    if (patch) {
      WS.applyPatch(patch, '/body/', $('.content .page').get(0));
    } else {
      $('.content .page').get(0).innerHTML = WS.JSONToDOM(WebSyncData.body);
    }
  };
  WS.setupDownloads('document', function() {
    return '<html><head><style>' +
      (WebSyncData.custom_css || []).join('\n') +
      '</style></head><body>' +
      WS.JSONToDOM(WebSyncData.body) +
      '</body></html>';
  });
  $(document).on('modules_loaded', function() {
    WS.fromJSON();
    if (WebSyncData.html) {
      $('.content .page').first().append(WebSyncData.html);
      delete WebSyncData.html;
    }
    NProgress.done();
  });
  $('.content_well').children().bind('mousedown selectstart', function(e) {
    e.stopPropagation();
  });
  return exports;
});
