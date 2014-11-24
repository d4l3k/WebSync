/*jslint browser: true*/
/*global $, define, rangy, _, prompt, alert, Detector, WebSyncData, ace, JST*/

//= require templates/edit-ribbon
//= require templates/edit-body
//= require templates/edit-wordcount

// WebSync: Text Editing Plugin
define('edit', ['websync'], function(WS) {
  'use strict';
  var self = {};
  // Plugins should use a jQuery namespace for ease of use.
  // Bind Example: $(document).bind("click.Tables", clickHandler);
  // Unbind Example: $("*").unbind(".Tables");

  // Add Text menu to the ribbon.
  $('.ribbon').append(JST['templates/edit-ribbon']({}));
  $('body').append(JST['templates/edit-body']({}));
  // List of buttons that can be clicked in the Text menu.
  self.text_buttons = ['bold', 'italic', 'strikethrough', 'underline', 'justifyleft', 'justifycenter', 'justifyright', 'justifyfull', 'removeFormat', 'insertorderedlist', 'insertunorderedlist', 'superscript', 'subscript', 'insertHorizontalRule', 'indent', 'outdent'];
  // Bind the basic text editing commands to the buttons.
  self.text_buttons.forEach(function(elem) {
    $('button#' + elem).bind('click.TextEdit', function() {
      document.execCommand(elem);
      //$(this).toggleClass("active");
      $(document).trigger('selectionchange');
    });
  });
  // Button and code to handle word/character counting.
  $('#view_mode').after(' <button id="word_count" class="Text btn btn-default"><i class="fa fa-eye"></i> Word Count</button>');
  var updateText = function() {
    var table = $('#word_count_info');
    table.parents('.popover').css({
      'max-width': 500,
      'z-index': 10000
    });
    var text = $('.content_container').text();
    var seltext = rangy.getSelection().toString();
    table.parents('.popover-content').css({
      padding: 0
    }).html(JST['templates/edit-wordcount']({
      wordsDocument: text.split(/\s+/).length,
      wordsSelection: seltext === '' ? 0 : seltext.split(/\s+/).length,
      characterDocument: text.length,
      characterSelection: seltext.length,
      characterDocumentNoSpaces: text.replace(/\s+/g, '').length,
      characterSelectionNoSpaces: seltext.replace(/\s+/g, '').length
    }));
  };
  var live_update = false;
  $(document).on('selectionchange.Text', function() {
    if (live_update) {
      updateText();
    }
  });
  $('#word_count').on('shown.bs.popover', function() {
    updateText();
    live_update = true;
  }).on('hide.bs.popover', function() {
    live_update = false;
  }).popover({
    placement: 'bottom',
    html: true,
    container: 'body',
    content: JST['templates/edit-wordcount']({
      wordsDocument: 0,
      wordsSelection: 0,
      characterDocument: 0,
      characterSelection: 0,
      characterDocumentNoSpaces: 0,
      characterSelectionNoSpaces: 0
    })
  }).popover('show').popover('hide');

  // Text styling handlers
  $('#fontColor').change(function() {
    document.execCommand('foreColor', false, this.value);
  });
  $('#hilightColor').change(function() {
    document.execCommand('hiliteColor', false, this.value);
  });
  // Reflects text in menu at top
  $(document).bind('selectionchange.TextEdit', function() {
    if (!self._selectTimeout) {
      self._selectTimeout = setTimeout(self.selectHandler, 200);
    }
  });
  // List indentation
  $('.content_well').bind('keydown.TextEdit', function(e) {
    if (e.keyCode === 9) {
      var node = $(document.getSelection().anchorNode);
      var parent = node.parent();
      if ($(document.getSelection().baseNode).closest('li').length === 1) {
        if (e.shiftKey) {
          document.execCommand('outdent');
        } else {
          document.execCommand('indent');
        }
      } else {
        if (e.shiftKey) {
          if (parent.css('text-indent') !== '0px') {
            parent.css({
              'text-indent': ''
            });
          } else {
            document.execCommand('outdent');
          }
          // No indentation inside a table.
        } else if (!parent.is('td, th')) {
          if (parent.css('text-indent') === '0px') {
            if (parent.attr('contenteditable') === 'true') {
              node.wrap("<div style='text-indent: 40px'></div>");
            } else {
              parent.css({
                'text-indent': 40
              });
            }
          } else {
            document.execCommand('indent');
          }
        }
      }
      e.preventDefault();
    }
    if (e.shiftKey && e.ctrlKey) {
      var command = true;
      if (e.keyCode === 54) { // Key 6
        document.execCommand('superscript');
      } else if (e.keyCode === 55) { // Key 7
        document.execCommand('insertunorderedlist');
      } else if (e.keyCode === 56) { // Key 8
        document.execCommand('insertorderedlist');
      } else if (e.keyCode === 69) { // E
        document.execCommand('justifycenter');
      } else if (e.keyCode === 74) { // J
        document.execCommand('justifyfull');
      } else if (e.keyCode === 76) { // L
        document.execCommand('justifyleft');
      } else if (e.keyCode === 82) { // R
        document.execCommand('justifyright');
      } else if (e.keyCode === 189) { // -
        document.execCommand('subscript');
      } else if (e.keyCode === 220) { // \
        document.execCommand('removeFormat');
      } else {
        command = false;
      }
      if (command) {
        e.preventDefault();
      }
    }
    if (e.ctrlKey && e.keyCode === 83) { // S
      WS.info('<b>Saved</b> WebSync automatically saves your changes.');
      $('#ribbon_buttons a:contains(File)').click();
      $('#File .btn-group button').click();
      e.preventDefault();
    }
  });
  $('#font ul').on('click.TextEdit', 'a', function(e) {
    var font = $(e.currentTarget).find('.fname').text();
    console.log(e, font);
    document.execCommand('fontname', false, font);
  });
  $('#font_size').change(function() {
    var size = $('#font_size').val();
    console.log(size);
    WS.applyCssToSelection({
      'font-size': size
    });
  });
  // Picture, video and link insertion.
  $('#picture').click(function() {
    self.selection = WS.selectionSave();
    console.log(self.selection);
    $('#image_modal').modal();
  });
  $('#insert_image').click(function() {
    var url = $('#image_modal input[type=text]').val();
    if (url.length > 0) {
      $('#image_modal').modal('hide');
      WS.selectionRestore(self.selection);
      delete self.selection;
      $('#image_modal input[type=text]').val('');
      document.execCommand('insertImage', false, url);
    } else {
      var files = $('#image_modal input[type=file]')[0].files;
      if (files.length > 0) {
        $('#image_modal .progress').slideDown();
        var name = files[0].name;
        WS.uploadResource(files[0], function(e) {
          var pc = parseInt(100 - (e.loaded / e.total * 100), 10);
          $('#image_modal .progress-bar').css('width', pc + '%');
        }, function(xhr) {
          if (xhr.readyState === 4) {
            $('#image_modal .progress-bar').css('width', '100%');
            $('#image_modal .progress').slideUp();
            if (xhr.status === 200) {
              WS.success('<strong>Success!</strong> File uploaded successfully.');
            } else {
              WS.error('<strong>Error!</strong> File failed to upload.');
            }
            $('#image_modal input[type=file]').val('');
            $('#image_modal').modal('hide');
            WS.selectionRestore(self.selection);
            document.execCommand('insertImage', false, 'assets/' + name);
          }
        });
      } else {
        WS.error('<strong>Error!</strong> You need to input a file or URL.');
      }
    }
  });
  $('#createLink').click(function() {
    var url = prompt('Hyperlink URL');
    document.execCommand('createLink', false, url);
  });
  $('#line_spacing a').click(function() {
    var width = $(this).text();
    WS.applyCssToSelection({
      'line-height': width + 'em'
    });
  });
  $('#video').click(function() {
    self.selection = WS.selectionSave();
    $('#youtube_modal').modal();
    /*var url = prompt("Video URL (Youtube)");
        if (url.indexOf("youtu") !== -1) {
            var youtube_id = self.youtube_parser(url);
            console.log("Youtube id", youtube_id);
            var html = '<iframe class="resizable" type="text/html" src="https://www.youtube.com/embed/' + youtube_id + '?origin=http://websyn.ca" height=480 width=640 frameborder="0"/>'
            document.execCommand("insertHTML", false, html);
        }*/
  });
  $('#youtube_modal input').change(function() {
    var url = $('#youtube_modal input').val();
    var youtube_id = self.youtube_parser(url);
    var html = '<iframe class="resizable" type="text/html" src="https://www.youtube.com/embed/' + youtube_id + '?origin=http://websyn.ca" height=420 width=560 frameborder="0"/>';
    $('#youtube_modal #youtube-preview').html(html);
  });
  $('#insert_video').click(function() {
    $('#youtube_modal').modal('hide');
    var url = $('#youtube_modal input').val();
    $('#youtube_modal input').val('');
    var youtube_id = self.youtube_parser(url);
    var html = '<iframe class="resizable" type="text/html" src="https://www.youtube.com/embed/' + youtube_id + '?origin=http://websyn.ca" height=480 width=640 frameborder="0"/>';
    WS.selectionRestore(self.selection);
    delete self.selection;
    document.execCommand('insertHTML', false, html);
  });
  // Youtube REGEX from http://stackoverflow.com/a/8260383 by Lasnv
  self.youtube_parser = function(url) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    alert('Invalid URL');
    return '';
  };
  // Helper function to convert rgba(r, g, b, a) to #RRGGBB
  self.rgb_to_hex = function(rgb) {
    if (rgb === 'rgba(0, 0, 0, 0)') {
      return '#FFFFFF';
    }
    var parts = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(1|0|0?\.d+))?\)$/);
    if (!parts) {
      return '#000000';
    }
    var i;
    for (i = 1; i <= 3; ++i) {
      if (parts[i]) {
        parts[i] = parseInt(parts[i], 10).toString(16);
        if (parts[i].length === 1) {
          parts[i] = '0' + parts[i];
        }
      }
    }
    return '#' + parts.slice(1, 4).join('').toUpperCase();
  };
  // Disables the TextEdit plugin.
  self.disable = function() {
    $('.Text').remove();
    WS.updateRibbon();
    $('*').unbind('.TextEdit');
    $('*').undelegate('.TextEdit');
  };
  // Handling function for displaying accurate information about text in ribbon.
  self.selectHandler = function() {
    var style = WS.getCss();
    $('#fontColor')[0].value = self.rgb_to_hex(style.color);
    $('#hilightColor')[0].value = self.rgb_to_hex(style.backgroundColor);
    var fontSizePt = parseInt(style.fontSize, 10) * 0.75 | 0;
    $('#font_size').val(fontSizePt + 'pt');

    self.text_buttons.forEach(function(elem) {
      var button = $('button#' + elem);
      if (document.queryCommandState(elem)) {
        button.addClass('active');
      } else {
        button.removeClass('active');
      }
    });
    var font = document.queryCommandValue('fontname').
    split(',')[0].split("'").join('').capitalize();
    $('#font .name').text(font).css({
      'font-family': font
    });
    clearTimeout(self._selectTimeout);
    self._selectTimeout = null;
  };
  // Sets up the list of fonts
  var fonts = ['Cursive', 'Monospace', 'Serif', 'Sans-serif', 'Fantasy', 'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold', 'Bookman Old Style', 'Bradley Hand ITC', 'Century', 'Century Gothic', 'Comic Sans MS', 'Droid Sans', 'Courier', 'Courier New', 'Georgia', 'Gentium', 'Impact', 'King', 'Lucida Console', 'Lalit', 'Modena', 'Monotype Corsiva', 'Papyrus', 'TeX', 'Times', 'Times New Roman', 'Trebuchet MS', 'Tahoma', 'Verdana', 'Verona', 'Helvetica', 'Segoe', 'Open Sans'];
  var d = new Detector();
  var font_list = [];
  fonts = fonts.sort(function(a, b) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });
  self.available_fonts = [];
  var i, result;
  for (i = 0; i < fonts.length; i++) {
    result = d.detect(fonts[i]);
    if (result) {
      self.available_fonts.push({
        name: fonts[i],
        source: 'local'
      });
    }
  }
  var webfonts = ['Ubuntu', 'Ubuntu Mono', 'Roboto', 'Oswald', 'Lato', 'Droid Sans', 'Droid Serif'];
  $('head').append("<link href='https://fonts.googleapis.com/css?family=" +
    webfonts.join('|').replace(/\s+/g, '+') + "' rel='stylesheet' type='text/css'>");
  _.each(webfonts, function(font) {
    if (self.available_fonts.indexOf(font) === -1) {
      self.available_fonts.push({
        name: font,
        source: 'google'
      });
    }
  });

  _.each(self.available_fonts, function(font) {
    var font_entry = '<li>';
    font_entry += '<a href="#">';
    font_entry += '<span class="fname" style="font-family: \'' + font.name + '"\'">' + font.name + '</span>';
    if (font.source === 'google') {
      //font_entry += '<i class="fa fa-google-plus"></i>';
      font_entry += '<span class="pull-right" title="From Google Web Fonts">G</span>';
    }
    font_entry += '</a></li>';
    font_list.push(font_entry);
  });
  // TODO: Not sure if this should be here.
  self.updateStyles = function() {
    self.stylesheet.innerHTML = (WebSyncData.custom_css || []).join('\n');
  };

  // Create the <style> tag
  self.stylesheet = document.createElement('style');
  // WebKit hack :(
  self.stylesheet.appendChild(document.createTextNode(''));
  // Add the <style> element to the page
  document.head.appendChild(self.stylesheet);

  self.updateStyles();
  $('.settings-popup .tab-content').append('<div class="tab-pane active" id="css"><h3>Custom CSS Styling</h3><div id="css-editor"></div></div>');
  $('<li><a href="#css" data-toggle="tab">Custom CSS</a></li>').prependTo($('.settings-popup ul.nav-pills'));
  var tag = document.createElement('script');
  tag.src = '/ace/ace.js';
  document.body.appendChild(tag);
  $("a[href='#css']").click();
  var check = function() {
    if (typeof ace !== 'undefined') {
      self.editor = window.ace.edit('css-editor');
      self.editor.getSession().setMode('ace/mode/css');
      self.editor.setValue((WebSyncData.custom_css || []).join('\n'));
      // Could look at "changes"
      self.editor.on('change', function() {
        // We split it into lines so we can do easier diffs.
        WebSyncData.custom_css = self.editor.getValue().split('\n');
        self.updateStyles();
      });
    } else {
      setTimeout(check, 100);
    }
  };
  check();
  $(document).on('patched', function() {
    self.editor.setValue((WebSyncData.custom_css || []).join('\n'));
    self.updateStyles();
  });
  $('#font .dropdown-menu').html(font_list.join('\n'));
  WS.updateRibbon();
  return self;
});
