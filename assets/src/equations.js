// WebSync LaTeX equation editing plugin.
define(['websync'], function() {
  var self = {};
  // Load the MathQuill javascript library.
  $('body').append('<script type="text/javascript" class="Equations" src="/assets/mathquill.js"></script><link rel="stylesheet" type="text/css" href="/mathquill.css">');

  // Append the new equation button to the File menu and make it do stuff.
  $('#Insert').append(" <button id='insert_equation' class='btn btn-default Equations' title='Insert Equation (Ctrl-Shift-F)'>Equation</button>");
  $('#insert_equation').click(self.insertEquation);
  self.insertEquation = function() {
    var elem = $('<span class="Equations Equation-Editable" contenteditable="false"></span>')[0];
    rangy.getSelection().getAllRanges()[0].surroundContents(elem);
    elem.dataset.latex = $(elem).text();
    elem.dataset.search_children = false;
    $(elem).mathquill('editable');
    setTimeout(function() {
      $(elem).find('textarea').focus();
    }, 1);
  };
  $(document).bind('keydown.Equations', function(e) {
    if (e.keyCode == 70 && e.shiftKey && e.ctrlKey) {
      self.insertEquation();
    }
  });
  // Custom handler for equations since MathQuill doesn't export clean HTML.
  WebSync.registerDOMException('.mathquill-rendered-math', function(obj) {
    return $(obj).mathquill('latex');
  }, function(json) {
    setTimeout(function() {
      $('.make-editable').removeClass('make-editable').mathquill('editable');
    }, 1);
    return '<span class="Equations Equation-Editable make-editable" contenteditable="false">' + json + '</span>';
  });
  // Code to disable the plugin.
  self.disable = function() {
    $('*').unbind('.Equations');
    $('*').undelegate('.Equations');
    $('.Equations').remove();
    WebSync.unregisterDOMException('.mathquill-rendered-math');

  };
  // Return self so other modules can hook into this one.
  return self;
});
