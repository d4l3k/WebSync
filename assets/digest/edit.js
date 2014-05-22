// WebSync: Text Editing Plugin
define('edit', ['websync'], function(websync) {
    var self = {};
    // Plugins should use a jQuery namespace for ease of use.
    // Bind Example: $(document).bind("click.Tables", clickHandler);
    // Unbind Example: $("*").unbind(".Tables");

    // Add Text menu to the ribbon.
    $('.ribbon').append('<div id="Text" class="Text container"> \
            <button id="bold" title="Bold (Ctrl-B)" class="btn btn-default"><i class="fa fa-bold"></i></button> \
            <button id="italic" title="Italic (Ctrl-I)" class="btn btn-default"><i class="fa fa-italic"></i></button> \
            <button id="strikethrough" title="Strikethrough" class="btn btn-default"><i class="fa fa-strikethrough"></i></button> \
            <button id="underline" title="Underline (Ctrl-U)" class="btn btn-default"><i class="fa fa-underline"></i></button> \
            <button id="createLink" title="Hyperlink" class="btn btn-default"><i class="fa fa-link"></i></button> \
            <div id="font" class="dropdown btn-group"> \
                <button data-toggle="dropdown" class="btn btn-default dropdown-toggle"><span class="name">Font</span> <i class="fa fa-caret-down"></i></button> \
                <ul class="dropdown-menu" role="menu"> \
                </ul>\
            </div> \
            <select id="font_size" title="Font Size" class="form-control ribbon_button"> \
                <option>8pt</option> \
                <option>9pt</option> \
                <option>10pt</option> \
                <option>11pt</option> \
                <option>12pt</option> \
                <option>13pt</option> \
                <option>14pt</option> \
                <option>15pt</option> \
                <option>16pt</option> \
                <option>17pt</option> \
                <option>18pt</option> \
                <option>19pt</option> \
                <option>20pt</option> \
                <option>21pt</option> \
                <option>22pt</option> \
                <option>23pt</option> \
                <option>24pt</option> \
                <option>25pt</option> \
                <option>26pt</option> \
                <option>27pt</option> \
                <option>28pt</option> \
                <option>29pt</option> \
                <option>30pt</option> \
                <option>31pt</option> \
                <option>32pt</option> \
                <option>33pt</option> \
                <option>34pt</option> \
                <option>35pt</option> \
                <option>36pt</option> \
                <option>37pt</option> \
                <option>38pt</option> \
                <option>39pt</option> \
                <option>40pt</option> \
                <option>41pt</option> \
                <option>42pt</option> \
                <option>43pt</option> \
                <option>44pt</option> \
                <option>45pt</option> \
                <option>46pt</option> \
                <option>47pt</option> \
                <option>48pt</option> \
                <option>72pt</option> \
            </select> \
            <div class="btn-group"> \
                <button id="justifyleft" title="Justify Left (Ctrl-Shift-L)" class="btn btn-default"><i class="fa fa-align-left"></i></button> \
                <button id="justifycenter" title="Justify Center (Ctrl-Shift-E)" class="btn btn-default"><i class="fa fa-align-center"></i></button> \
                <button id="justifyright" title="Justify Right (Ctrl-Shift-R)" class="btn btn-default"><i class="fa fa-align-right"></i></button> \
                <button id="justifyfull" title="Justify Full (Ctrl-Shift-J)" class="btn btn-default"><i class="fa fa-align-justify"></i></button> \
            </div> \
            <div class="btn-group" id="line_spacing"> \
                <button  title="Line Spacing" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><i class="fa fa-text-height"></i></button> \
                <ul class="dropdown-menu" role="menu">\
                    <li role="presentation" class="dropdown-header">Line Spacing</li> \
                    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">1</a></li>\
                    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">1.15</a></li>\
                    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">1.5</a></li>\
                    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">2</a></li>\
                </ul> \
            </div> \
            <button id="insertunorderedlist" title="Unordered List (Ctrl-Shift-7)" class="btn btn-default"><i class="fa fa-list-ul"></i></button> \
            <button id="insertorderedlist" title="Ordered List (Ctrl-Shift-8)" class="btn btn-default"><i class="fa fa-list-ol"></i></button> \
            <button id="outdent" title="Outdent (Shift-Tab)" class="btn btn-default"><i class="fa fa-outdent"></i></button> \
            <button id="indent" title="Indent (Tab)" class="btn btn-default"><i class="fa fa-indent"></i></button> \
            <button id="superscript" title="Superscript (Ctrl-Shift-^)" class="btn btn-default"><i class="fa fa-superscript"></i></button> \
            <button id="subscript" title="Subscript (Ctrl-Shift-_)" class="btn btn-default"><i class="fa fa-subscript"></i></button> \
            <input id="fontColor" title="Font Color" class="form-control" type="color"></input> \
            <input id="hilightColor" title="Text Background Color" class="form-control" type="color" value="#FFFFFF"></input> \
            <button id="insertHorizontalRule" title="Insert Horizontal Rule" class="btn btn-default">&mdash;</button> \
            <button id="removeFormat" title="Clear Formatting (Ctrl-Shift-\\)" class="btn btn-default"><i class="fa fa-unlink"></i></button> \
        </div>');
    $('body').append('<div class="modal fade" id="image_modal" tabindex="-1" role="dialog" aria-hidden="true"> \
  <div class="modal-dialog"> \
    <div class="modal-content"> \
      <div class="modal-header"> \
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> \
        <h4 class="modal-title">Insert Image</h4> \
      </div> \
      <div class="modal-body"> \
        <h3>Insert Image from URL</h3> \
        <p>This does not upload the file to the server. Viewers will pull it directly from the specified URL.</p> \
        <input type="text" id="image_url" class="form-control"/> \
        <h3>Upload Image</h3> \
        <input type="file" name="files[]" accept="image/*" id="file_input" class="form-control" /> \
<div class="progress progress-striped active" style="display: none;">\
  <div class="progress-bar"  role="progressbar" style="width: 1%">\
  </div>\
</div>\
      </div> \
      <div class="modal-footer"> \
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button> \
        <button type="button" id="insert_image" class="btn btn-primary">Insert</button> \
      </div> \
    </div> \
  </div> \
</div><div class="modal fade" id="youtube_modal" tabindex="-1" role="dialog" aria-hidden="true"> \
  <div class="modal-dialog"> \
    <div class="modal-content"> \
      <div class="modal-header"> \
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> \
        <h4 class="modal-title">Insert YouTube Video</h4> \
      </div> \
      <div class="modal-body"> \
        <p>Enter the youtube URL:</p> \
        <input type="text" id="youtube_url" class="form-control"/> <br>\
        <div id="youtube-preview"></div> \
      </div> \
      <div class="modal-footer"> \
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button> \
        <button type="button" id="insert_video" class="btn btn-primary">Insert</button> \
      </div> \
    </div> \
  </div> \
</div>');
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
        var popover = table.parent().parent();
        popover.css({
            'max-width': 500,
            'z-index': 10000
        });
        table.parent().css({
            padding: 0
        });
        popover.children('.popover-content').html();
        var text = $('.content_container').text();
        var seltext = rangy.getSelection().toString();
        table.find('tr').eq(1).find('td').eq(0).text(text.split(/\s+/).length);
        table.find('tr').eq(1).find('td').eq(1).text(seltext == '' ? 0 : seltext.split(/\s+/).length);
        table.find('tr').eq(2).find('td').eq(0).text(text.length);
        table.find('tr').eq(2).find('td').eq(1).text(seltext.length);
        table.find('tr').eq(3).find('td').eq(0).text(text.split(' ').join('').length);
        table.find('tr').eq(3).find('td').eq(1).text(seltext.split(' ').join('').length);
    };
    var live_update = false;
    $(document).on('selectionchange.Text', function(e) {
        if (live_update) {
            updateText();
        }
    });
    $('#word_count').on('shown.bs.popover', function(e) {
        updateText();
        live_update = true;
    }).on('hide.bs.popover', function(e) {
        live_update = false;
    }).popover({
        placement: 'bottom',
        html: true,
        container: 'body',
        content: "<table id='word_count_info' class='table' style='margin: 0'><thead><tr><th></th><th>Document</th><th>Selection</th></tr></thead><tbody><tr><th>Words</th><td></td><td></td></tr><tr><th>Characters</th><td></td><td></td></tr><tr><th>... (no spaces)</th><td></td><td></td></tr></tbody></table>"
    }).popover('show').popover('hide');

    // Text styling handlers
    $('#fontColor').change(function(e) {
        document.execCommand('foreColor', false, this.value);
    });
    $('#hilightColor').change(function(e) {
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
        if (e.keyCode == 9) {
            var node = $(getSelection().anchorNode);
            var parent = node.parent();
            if ($(getSelection().baseNode).closest('li').length == 1) {
                if (e.shiftKey) {
                    document.execCommand('outdent');
                } else {
                    document.execCommand('indent');
                }
            } else {
                if (e.shiftKey) {
                    if (parent.css('text-indent') != '0px') {
                        parent.css({
                            'text-indent': ''
                        });
                    } else {
                        document.execCommand('outdent');
                    }
                    // No indentation inside a table.
                } else if (!parent.is('td, th')) {
                    if (parent.css('text-indent') == '0px') {
                        if (parent.attr('contenteditable') == 'true') {
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
            if (e.keyCode == 54) { // Key 6
                document.execCommand('superscript');
            } else if (e.keyCode == 55) { // Key 7
                document.execCommand('insertunorderedlist');
            } else if (e.keyCode == 56) { // Key 8
                document.execCommand('insertorderedlist');
            } else if (e.keyCode == 69) { // E
                document.execCommand('justifycenter');
            } else if (e.keyCode == 74) { // J
                document.execCommand('justifyfull');
            } else if (e.keyCode == 76) { // L
                document.execCommand('justifyleft');
            } else if (e.keyCode == 82) { // R
                document.execCommand('justifyright');
            } else if (e.keyCode == 189) { // -
                document.execCommand('subscript');
            } else if (e.keyCode == 220) { // \
                document.execCommand('removeFormat');
            } else {
                command = false;
            }
            if (command) e.preventDefault();
        }
        if (e.ctrlKey && e.keyCode == 83) { // S
            WebSync.info('<b>Saved</b> WebSync automatically saves your changes.');
            $('#ribbon_buttons a:contains(File)').click();
            $('#File .btn-group button').click();
            e.preventDefault();
        }
    });
    $('#font ul').on('click.TextEdit', 'a', function(e) {
        var font = $(e.currentTarget).text();
        console.log(e, font);
        document.execCommand('fontname', false, font);
    });
    $('#font_size').change(function() {
        var size = $('#font_size').val();
        console.log(size);
        WebSync.applyCssToSelection({
            'font-size': size
        });
    });
    // Picture, video and link insertion.
    $('#picture').click(function() {
        self.selection = WebSync.selectionSave();
        console.log(self.selection);
        $('#image_modal').modal();
    });
    $('#insert_image').click(function() {
        var url = $('#image_modal input[type=text]').val();
        if (url.length > 0) {
            $('#image_modal').modal('hide');
            WebSync.selectionRestore(self.selection);
            delete self.selection;
            $('#image_modal input[type=text]').val('');
            document.execCommand('insertImage', false, url);
        } else {
            var files = $('#image_modal input[type=file]')[0].files;
            if (files.length > 0) {
                $('#image_modal .progress').slideDown();
                var name = files[0].name;
                WebSync.uploadResource(files[0], function(e) {
                    var pc = parseInt(100 - (e.loaded / e.total * 100));
                    $('#image_modal .progress-bar').css('width', pc + '%');
                }, function(xhr) {
                    if (xhr.readyState == 4) {
                        $('#image_modal .progress-bar').css('width', '100%');
                        $('#image_modal .progress').slideUp();
                        if (xhr.status == 200)
                            WebSync.success('<strong>Success!</strong> File uploaded successfully.');
                        else
                            WebSync.error('<strong>Error!</strong> File failed to upload.');
                        $('#image_modal input[type=file]').val('');
                        $('#image_modal').modal('hide');
                        WebSync.selectionRestore(self.selection);
                        document.execCommand('insertImage', false, 'assets/' + name);
                    }
                });
            } else {
                WebSync.error('<strong>Error!</strong> You need to input a file or URL.');
            }
        }
    });
    $('#createLink').click(function() {
        var url = prompt('Hyperlink URL');
        document.execCommand('createLink', false, url);
    });
    $('#line_spacing a').click(function(e) {
        var width = $(this).text();
        WebSync.applyCssToSelection({
            'line-height': width + 'em'
        });
    });
    $('#video').click(function() {
        self.selection = WebSync.selectionSave();
        $('#youtube_modal').modal();
        /*var url = prompt("Video URL (Youtube)");
        if (url.indexOf("youtu") != -1) {
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
        WebSync.selectionRestore(self.selection);
        delete self.selection;
        document.execCommand('insertHTML', false, html);
    });
    // Youtube REGEX from http://stackoverflow.com/a/8260383 by Lasnv
    self.youtube_parser = function(url) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match && match[2].length == 11) {
            return match[2];
        } else {
            alert('Invalid URL');
        }
    };
    // Helper function to convert rgba(r, g, b, a) to #RRGGBB
    self.rgb_to_hex = function(rgb) {
        if (rgb == 'rgba(0, 0, 0, 0)') return '#FFFFFF';
        if (rgb.indexOf('rgba') != -1) {
            //return '#000000';
        }
        var parts = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(1|0|0?\.d+))?\)$/);
        for (var i = 1; i <= 3; ++i) {
            parts[i] = parseInt(parts[i]).toString(16);
            if (parts[i].length == 1) parts[i] = '0' + parts[i];
        }
        return '#' + parts.slice(1, 4).join('').toUpperCase();
    };
    // Disables the TextEdit plugin.
    self.disable = function() {
        var elem = $('.Text').remove();
        WebSync.updateRibbon();
        $('*').unbind('.TextEdit');
        $('*').undelegate('.TextEdit');
    };
    // Handling function for displaying accurate information about text in ribbon.
    self.selectHandler = function() {
        var style = WebSync.getCss();
        $('#fontColor')[0].value = self.rgb_to_hex(style.color);
        $('#hilightColor')[0].value = self.rgb_to_hex(style.backgroundColor);
        $('#font_size').val(Math.round(parseInt(style.fontSize) * (0.75)) + 'pt');

        self.text_buttons.forEach(function(elem) {
            var button = $('button#' + elem);
            if (document.queryCommandState(elem)) {
                button.addClass('active');
            } else {
                button.removeClass('active');
            }
        });
        var font = document.queryCommandValue('fontname').split(',')[0]
            .split("'").join('').capitalize();
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
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });
    self.available_fonts = [];
    for (i = 0; i < fonts.length; i++) {
        var result = d.detect(fonts[i]);
        if (result) {
            self.available_fonts.push(fonts[i]);
        }
    }
    var webfonts = ['Ubuntu', 'Ubuntu Mono', 'Roboto', 'Oswald', 'Lato', 'Droid Sans', 'Droid Serif'];
    $('head').append("<link href='https://fonts.googleapis.com/css?family=" +
        webfonts.join('|').replace(/\s+/g, '+') + "' rel='stylesheet' type='text/css'>");
    _.each(webfonts, function(font) {
        if (self.available_fonts.indexOf(font) == -1) {
            self.available_fonts.push(font);
        }
    });

    _.each(self.available_fonts, function(font) {
        font_list.push('<li><a href="#" style="font-family: \'' + font + '"\'">' + font + '</a></li>');
    });
    // TODO: Not sure if this should be here.
    self.updateStyles = function() {
        self.stylesheet.innerHTML = (WebSyncData.custom_css || []).join('\n');
    };
    self.stylesheet = (function() {
        // Create the <style> tag
        var style = document.createElement('style');

        // WebKit hack :(
        style.appendChild(document.createTextNode(''));

        // Add the <style> element to the page
        document.head.appendChild(style);
        return style;
    })();
    self.updateStyles();
    $('.settings-popup .tab-content').append('<div class="tab-pane active" id="css"><h3>Custom CSS Styling</h3><div id="css-editor"></div></div>');
    $('<li><a href="#css" data-toggle="tab">Custom CSS</a></li>').prependTo($('.settings-popup ul.nav-pills'));
    var tag = document.createElement('script');
    tag.src = '/ace/ace.js';
    document.body.appendChild(tag);
    $("a[href='#css']").click();
    var check = function() {
        if (typeof ace != 'undefined') {
            self.editor = window.ace.edit('css-editor');
            //self.editor.setTheme("ace/theme/monokai");
            self.editor.getSession().setMode('ace/mode/css');
            self.editor.setValue((WebSyncData.custom_css || []).join('\n'));
            self.editor.on('change', function(changes) {
                // We split it into lines so we can do easier diffs.
                WebSyncData.custom_css = self.editor.getValue().split('\n');
                self.updateStyles();
            });
        } else {
            setTimeout(check, 100);
        }
    };
    check();
    $(document).on('patched', function(e) {
        self.editor.setValue((WebSyncData.custom_css || []).join('\n'));
        self.updateStyles();
    });
    $('#font .dropdown-menu').html(font_list.join('\n'));
    WebSync.updateRibbon();
    return self;
});
