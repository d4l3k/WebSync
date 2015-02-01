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

  if (WebSyncAuth.viewOp === 'edit' && WebSyncAuth.access !== 'viewer') {
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
    WS.info('Exporting document to file. Please wait...');
    return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1 plus MathML 2.0//EN" "http://www.w3.org/Math/DTD/mathml2/xhtml-math11-f.dtd"><html><head><style>' +
      (WebSyncData.custom_css || []).join('\n') +
      '</style></head><body>' +
      WS.exportElements($('.page')) +
      //WS.JSONToDOM(WebSyncData.body) +
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
