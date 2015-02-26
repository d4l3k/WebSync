/*jslint browser: true*/
/*global $, define, rangy, prompt, alert, Detector, WebSyncData, ace, _*/

// WebSync LaTeX equation editing plugin.
define(['websync'], function(WS) {
  var self = {};
  // Load the MathQuill javascript library.
  $('body').append('<script type="text/javascript" class="Equations" src="/assets/mathquill.js"></script><link rel="stylesheet" type="text/css" href="/mathquill.css">');

  // Append the new equation button to the File menu and make it do stuff.
  $('#Insert').append(" <button id='insert_equation' class='btn btn-default Equations' title='Insert Equation (Ctrl-Shift-F)'>Equation</button>");
  $('#insert_equation').click(function() {
    self.insertEquation();
  });
  self.insertEquation = function() {
    var elem = $('<span class="Equations Equation-Editable" contenteditable="false"></span>')[0];
    rangy.getSelection().getAllRanges()[0].surroundContents(elem);
    elem.dataset.latex = $(elem).text();
    elem.dataset.searchChildren = false;
    self.makeEditable(elem);
    setTimeout(function() {
      $(elem).find('textarea').focus();
    }, 1);
  };
  self.makeEditable = function(elem) {
    $(elem).mathquill('editable');
    $(elem).prepend('<a class="wolfram" target="_blank" style="display: none">=</a>');
  };
  $(document).bind('keydown.Equations', function(e) {
    if (e.keyCode === 70 && e.shiftKey && e.ctrlKey) {
      self.insertEquation();
    }
  });
  var queries = {};
  self.getEqn = function(elem) {
    var eqns = $('.mathquill-editable');
    var eqn1 = eqns.eq(eqns.index(elem)-1).mathquill('latex');
    var eqn2 = $(elem).mathquill('latex');
    return '(' + eqn1 + ') === (' + eqn2 + ')';
  };
  self.updateHref = function(elem) {
    $(elem).find('.wolfram').attr('href', 'http://www.wolframalpha.com/input/?i=' + window.escape($(elem).mathquill('latex')));
  };
  self.checkMath = function(elem) {
    var eqn = self.getEqn(elem);
    console.log(eqn);

    var token = window.btoa(Math.random());
    queries[token] = elem;
    WS.connection.sendJSON({
      type: 'wolfram',
      reqId: token,
      query: eqn
    });
    $(elem).find('.wolfram').removeClass('valid').removeClass('invalid').show();
  };
  self.selectionInEquation = false;
  $(document).on('selectionchange', function() {
    var elem = $(rangy.getSelection().anchorNode).parents('.mathquill-editable');
    if (elem.length === 0 && self.selectionInEquation.length > 0) {
      self.checkMath(self.selectionInEquation);
    }
    self.selectionInEquation = elem;
  });
  $('.content').on('keydown', '.mathquill-editable', function(e) {
    self.updateHref(this);
    if (e.keyCode === 13) {
      self.checkMath(this);
    }
  }).on('click', '.mathquill-editable', function() {
    $(this).find('.wolfram').show();
    self.updateHref(this);
  });
  // Custom handler for equations since MathQuill doesn't export clean HTML.
  WS.registerDOMException('.mathquill-rendered-math', function(obj) {
    return $(obj).mathquill('latex');
  }, function(json) {
    setTimeout(function() {
      self.makeEditable($('.make-editable').removeClass('make-editable'));
    }, 1);
    return '<span class="Equations Equation-Editable make-editable" contenteditable="false">' + json + '</span>';
  });
  // Code to disable the plugin.
  self.disable = function() {
    $('*').unbind('.Equations');
    $('*').undelegate('.Equations');
    $('.Equations').remove();
    WS.unregisterDOMException('.mathquill-rendered-math');

  };
  WS.registerMessageEvent('wolfram', function(data) {
    var elem = queries[data.reqId];
    var color;
    if (data.result.queryresult.tips) {
      color = '';
    } else {
      var equal = _.last(data.result.queryresult.pod).subpod[0].plaintext[0] === 'True';
      color = equal ? 'valid' : 'invalid';
    }
    $(elem).find('.wolfram').removeClass('valid').removeClass('invalid').addClass(color).show();

    delete queries[data.reqId];
  });

  // Return self so other modules can hook into this one.
  return self;
});
