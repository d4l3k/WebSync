// WebSync: Tables Plugin
// WebSync uses RequireJS for modules.
// define( [pluginName], [requiredModules], definition);
// pluginName is an optional argument that should only be used if the module is being bundled/loaded without RequireJS. It should match the path it's being required as.
define('/assets/tables.js', ['websync'], function(WS) {
  'use strict';
  var self = {};
  // Save all variables and information to the self object.

  // Plugins should use a jQuery namespace for ease of use.
  // Bind Example: $(document).bind("click.Tables", clickHandler);
  // Unbind Example: $("*").unbind(".Tables");
  $('.ribbon').append($('<div id="Table" class="Table container" style="display: none;"><button class="btn btn-default" title="Delete Table"><i class="fa fa-trash-o"></i> Table</button> <div class="btn-group"><button class="btn btn-default" type="button" title="Insert Row Above"><i class="fa fa-plus"></i></button></span><button class="btn btn-default" type="button" title="Delete Row"><i class="fa fa-trash"></i> Row</button><button class="btn btn-default" type="button" title="Insert Row Below"><i class="fa fa-plus"></i></button></div>     <div class="btn-group"><button class="btn btn-default" type="button" title="Insert Column Left"><i class="fa fa-plus"></i></button></span><button class="btn btn-default" type="button" title="Delete Column"><i class="fa fa-trash"></i> Column</button><button class="btn btn-default" type="button" title="Insert Column Right"><i class="fa fa-plus"></i></button></div></div>'));
  $('.content').append($('<div id="table_cursor" class="Table"></div><div id="table_selection" class="Table"></div><div id="table_clip" style="position:absolute; left:-1000px;top:-1000px;"></div>'));
  $('#Insert').append($('<button id="table" title="Table" class="btn btn-default Table"><i class="fa fa-table"></i></button>'));
  $('#table').bind('click.Tables', function(e) {
    var new_table = $('<table><tbody><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody></table>');
    WS.insertAtCursor(new_table);
  });
  $('.Table [title="Insert Row Above"]').bind('click.Tables', function(e) {
    if (self.selected) {
      var html = '<tr>';
      var size = self.tableSize();
      for (var i = 0; i < size[0]; i++) {
        html += '<td></td>';
      }
      html += '</tr>';
      $(html).insertBefore(self.selectedElem.parentElement);
      self.redrawTitles();
      self.cursorMove(0, -1);
    }
  });
  $('.Table [title="Insert Row Below"]').bind('click.Tables', function(e) {
    if (self.selected) {
      var html = '<tr>';
      var size = self.tableSize();
      for (var i = 0; i < size[0]; i++) {
        html += '<td></td>';
      }
      html += '</tr>';
      $(html).insertAfter(self.selectedElem.parentElement);
      self.redrawTitles();
      self.cursorMove(0, 1);
    }
  });
  $('.Table [title="Delete Row"]').bind('click.Tables', function(e) {
    if (self.selected) {
      var size = self.tableSize();
      if (size[1] > 1) {
        var pos = self.selectedPos();
        var n_y = pos[1] + 1;
        if (n_y >= size[1]) n_y -= 2;
        var n_selected = self.posToElem(pos[0], n_y);
        $(self.selectedElem).closest('tr').remove();
        self.clearSelect();
        self.cursorSelect(n_selected);
        self.redrawTitles();
      }
    }
  });
  $('.Table [title="Insert Column Left"]').bind('click.Tables', function(e) {
    if (self.selected) {
      var size = self.tableSize();
      var pos = self.selectedPos();
      for (var i = 0; i < size[1]; i++) {
        $('<td></td>').insertBefore(self.selectedElem.parentElement.parentElement.children[i].children[pos[0]]);
      }
      self.redrawTitles();
      self.cursorMove(-1, 0);
    }
  });
  $('.Table [title="Insert Column Right"]').bind('click.Tables', function(e) {
    if (self.selected) {
      var size = self.tableSize();
      var pos = self.selectedPos();
      for (var i = 0; i < size[1]; i++) {
        $('<td></td>').insertAfter(self.selectedElem.parentElement.parentElement.children[i].children[pos[0]]);
      }
      self.redrawTitles();
      self.cursorMove(1, 0);
    }
  });
  $('.Table [title="Delete Column"]').bind('click.Tables', function(e) {
    if (self.selected) {
      var size = self.tableSize();
      var pos = self.selectedPos();
      var parentElem = $(self.selectedElem).parent().parent();
      if (size[0] > 1) {
        var pos = self.selectedPos();
        var n_x = pos[0] + 1;
        if (n_x >= size[0]) n_x -= 2;
        var n_selected = self.posToElem(n_x, pos[1]);
        for (var i = 0; i < size[1]; i++) {
          $(parentElem).children('tr').eq(i).children('td').eq(pos[0]).remove();
        }
        self.clearSelect();
        self.cursorSelect(n_selected);
        self.redrawTitles();
      }
    }
  });
  $('.Table [title="Delete Table"]').bind('click.Tables', function(e) {
    if (self.selected) {
      $(self.selectedElem).parents('table').first().remove();
      self.clearSelect();
    }
  });
  self.lastSize = '';
  self.observer = function() {
    var bounding_data = JSON.stringify(self.selectedElem.getBoundingClientRect());
    if (bounding_data !== self.lastSize) {
      setTimeout(function() {
        self.cursorUpdate();
      }, 1);
      setTimeout(function() {
        self.headerUpdate();
      }, 2);
      self.lastSize = bounding_data;
    }
  };
  $('.content').delegate('table', 'click.Tables', function(e) {
    if (!self.selectedElem || self.selectedElem.contentEditable !== 'true') {
      $('a:contains("Table")').click();
    }
    e.stopPropagation();
  });
  $('.content').delegate('td', 'mouseenter.Tables', function(e) {
    if (self.selectionActive && self.primaryTable() === self.primaryTable(this)) {
      self.selectionEnd = this;
      self.updateSelectedArea();
    }
  });
  $('.content').delegate('td', 'mouseleave.Tables', function(e) {});
  $('.content').delegate('.Table.axis#x th', 'mousemove.Tables', function(e) {
    var position = $(this).offset();
    $('.Table.axis th.resize').removeClass('resize');
    if (Math.abs(e.pageX - position.left) < 5 || Math.abs(e.pageX - (position.left + $(this).width())) < 5) {
      $(this).addClass('resize');
    }
  });
  $('.content').delegate('.Table.axis#y th', 'mousemove.Tables', function(e) {
    var position = $(this).offset();
    $('.Table.axis th.resize').removeClass('resize');
    if (Math.abs(e.pageY - position.top) < 5 || Math.abs(e.pageY - (position.top + $(this).height())) < 5) {
      $(this).addClass('resize');
    }
  });
  $('.content').delegate('td', 'mousedown.Tables', function(e) {
    if (this !== self.selectedElem) {
      self.cursorSelect(this);
      self.selectedElem.contentEditable = true;
      self.setEndOfContenteditable(self.selectedElem);
      self.selectedElem.contentEditable = 'inherit';
    }
    self.selectionActive = true;
    self.selectionEnd = null;
    self.updateSelectedArea();
    //e.preventDefault();
  });
  $('.content').bind('mousemove.Tables', function(e) {
    if (self.selectionActive && self.selectedElem && self.selectedElem.contentEditable !== 'true') {
      e.preventDefault();
    }
  });
  $('.content').delegate('td', 'mouseup.Tables', function(e) {
    self.selectionActive = false;
  });
  self.selectionActive = false;
  $('.content').bind('click.Tables', function(e) {
    self.clearSelect();
  });
  $(document).bind('clear_select.Tables', function(e) {
    self.clearSelect();
  });
  $('.content').delegate('td', 'contextmenu.Tables', function(e) {
    if (this !== self.selectedElem) {
      self.cursorSelect(this);
    }
    if (self.selectedElem.contentEditable !== 'true') {
      //e.preventDefault();
      //$(this).contextmenu();
    }
  });
  $('.content').delegate('td', 'dblclick.Tables', function(e) {
    if (self.selectedElem.contentEditable !== 'true') {
      self.selectedEditable(true);
    }
  });
  $('.content').delegate('.Table.axis#x th.resize', 'mousedown.Tables', function(e) {
    self.drag = true;
    if (Math.abs(e.pageX - $(this).offset().left) < 5) {
      self.active = $(this).prev()[0];
    } else {
      self.active = this;
    }
    self.origX = e.pageX;
    self.origWidth = $(self.active).width();
  });
  $('.content').delegate('.Table.axis#y th.resize', 'mousedown.Tables', function(e) {
    self.drag = true;
    if (Math.abs(e.pageY - $(this).offset().top) < 5) {
      self.active = $(this).prev()[0];
    } else {
      self.active = this;
    }
    self.origY = e.pageY;
    self.origHeight = $(self.active).height();
  });
  $(document).bind('mousemove.Tables', function(e) {
    if (self.drag) {
      var table = $(self.primaryTable());
      if (self.origX) {
        $(self.active).width(e.pageX - self.origX + self.origWidth);
        var pos = self.selectedPos(self.active);
        $(self.posToElem(pos[0], 0)).width(e.pageX - self.origX + self.origWidth);
      }
      if (self.origY) {
        $(self.active).height(e.pageY - self.origY + self.origHeight);
        var pos = self.selectedPos(self.active);
        $(self.posToElem(0, pos[1]).parentElement).height(e.pageY - self.origY + self.origHeight);
      }
      self.cursorUpdate();
    }
  });
  self.disableAxisPositioning = false;
  $(document).bind('mouseup.Tables', function(e) {
    if (self.drag) {
      e.preventDefault();
      self.origX = null;
      self.origY = null;
      self.origWidth = null;
      self.origHeight = null;
      self.drag = false;
    }
  });
  $('.content').delegate(".Table.axis#x th:not('resize')", 'click.Tables', function(e) {
    var pos = self.selectedPos(this);
    var size = self.tableSize();
    self.cursorSelect(self.posToElem(pos[0], 0));
    if (!e.shiftKey) {
      self.selectionEnd = self.posToElem(pos[0], size[1] - 1);
    }
    self.updateSelectedArea();
  });
  $('.content').delegate(".Table.axis#y th:not('resize')", 'click.Tables', function(e) {
    var pos = self.selectedPos(this);
    var size = self.tableSize();
    self.cursorSelect(self.posToElem(0, pos[1] - 1));
    if (!e.shiftKey) {
      self.selectionEnd = self.posToElem(size[0] - 1, pos[1] - 1);
    }
    self.updateSelectedArea();
  });
  $(document).bind('paste.Tables', function(e) {
    if (self.selected) {
      var nodes = $(e.originalEvent.clipboardData.getData('text/html'));
      nodes.find('script').remove();
      if (nodes.filter('table').length > 0) {
        rows = nodes.filter('table').find('tr');
        var pos = self.selectedPos();
        _.each(rows, function(row, i) {
          _.each($(row).children(), function(element, j) {
            // TODO: Finish up pasting.
            var html = $(element).html();
            var elem = self.posToElem(pos[0] + j, pos[1] + i);
            $(elem).html(html);
          });
        });
        e.preventDefault();
      }
    }
  });
  self.keypressHandler = function(e) {
    if (self.selectedElem) {
      if (self.selected) { //&&!e.shiftKey){
        var editting = false;
        if (self.selectedElem.contentEditable) {
          editting = self.selectedElem.contentEditable === 'true';
        }
        if (e.keyCode === 13 && !e.shiftKey) {
          self.cursorMove(0, 1);
        } else if (e.keyCode === 9) {
          // Tab key
          self.selectedEditable(false);
          self.cursorMove(1 - 2 * e.shiftKey, 0);
          e.preventDefault();
        } else if (e.keyCode === 27) {
          // Escape
          self.selectedEditable(false);
        } else if (e.keyCode === 37 && !editting) {
          // Left arrow
          self.cursorMove(-1, 0);
          e.preventDefault();
        } else if (e.keyCode === 39 && !editting) {
          // Right arrow
          self.cursorMove(1, 0);
          e.preventDefault();
        } else if (e.keyCode === 38 && !editting) {
          // Up arrow
          self.cursorMove(0, -1);
          e.preventDefault();
        } else if (e.keyCode === 40 && !editting) {
          // Down a1rrow
          self.cursorMove(0, 1);
          e.preventDefault();
        } else if (e.keyCode === 46 && !editting) { // Delete key
          self.emptySelection();
          e.preventDefault();
        } else {
          if ((!self.selectedElem.contentEditable || self.selectedElem.contentEditable === 'inherit') && _.indexOf([16, 17, 18, 91, 92], e.keyCode) === -1 && !(e.keyCode === 67 && e.ctrlKey)) {
            self.selectedEditable(true);

            $(self.selectedElem).focus();
            //WebSync.setCaretPosition(self.selectedElem,0);
          }
          setTimeout(self.cursorUpdate, 1);
        }
      } else {
        if (!self.selectedElem.contentEditable || self.selectedElem.contentEditable === 'false') {
          self.selectedEditable(true);

          $(self.selectedElem).focus();
          //WebSync.setCaretPosition(self.selectedElem,0);
        }
      }
    }
  };
  WS.registerDOMException('TABLE', function(obj) {
    var out = {
      data: [],
      heights: [],
      widths: []
    };
    for (var attr, i = 0, attrs = obj.attributes, l = attrs.length; i < l; i++) {
      attr = attrs.item(i);
      if (!out.attrs)
        out.attrs = {};
      out.attrs[attr.nodeName] = attr.nodeValue;
    }
    var rows = $(obj).find(':not(table) tr');
    _.each(rows, function(row, i) {
      var height = $(row)[0].style.height;
      if (height) {
        out.heights[i] = height;
      }
      var columns = $(row).children('td');
      var row_out = [];
      _.each(columns, function(cell, j) {
        var width = $(row)[0].style.width;
        if (width) {
          out.widths[j] = width;
        }
        // Potential JS code.
        var data;
        var content = $(cell).data().content;
        if (content) {
          data = [document.createTextNode(content)];
        } else {
          data = cell.childNodes;
        }
        var cell_out = {};
        var content_json = WS.DOMToJSON(data);
        if (!_.isEmpty(content_json)) {
          cell_out.content = content_json;
        }
        for (var attr, i = 0, attrs = cell.attributes, l = attrs.length; i < l; i++) {
          attr = attrs.item(i);
          // Ignore attribute if it's set by the table.
          if (attr.nodeName !== 'data-content' &&
            attr.nodeName !== 'contenteditable') {
            if (!cell_out.attrs)
              cell_out.attrs = {};
            cell_out.attrs[attr.nodeName] = attr.nodeValue;
          }
        }
        row_out.push(cell_out);
      });
      out.data.push(row_out);
    });
    return out;
  }, function(json) {
    var html = '<table';
    _.each(json.attrs, function(v, k) {
      html += ' ' + k + '=\"' + v + '\"';
    });
    html += '><tbody>';
    _.each(json.data, function(row, i) {
      html += '<tr>';
      _.each(row, function(cell, j) {
        html += '<td>';
        if (cell.content) {
          if (cell.content[0] === '=') {
            html += cell.content;
          } else {
            html += WS.JSONToDOM(cell.content);
          }
        }
        html += '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    _.defer(self.checkForJS);
    return html;
  });
  self.checkForJS = function() {
    var elems = $(".content table td:contains('=')");
    _.each(elems, function(cell) {
      var data = $(cell).data().content;
      if (!data) {
        var text = $(cell).text();
        if (text[0] === '=') {
          $(cell).data('content', text);
          self.updateJS(cell);
        }
      } else if (data[0] === '=') {
        self.updateJS(cell);
      }
    });
  };
  WS.updateRibbon();
  $("#ribbon_buttons a:contains('Table')").parent().hide();
  // Function: void [plugin=edit].disable();
  // Disables the plugin. This has to be set for possible plugin unloading.
  self.disable = function() {
    var elem = $('.Table').remove();
    WS.updateRibbon();
    $('*').unbind('.Tables');
    $('*').undelegate('.Tables');
  };
  self.redrawTitles = function() {
    $('.Table.axis').remove();
    if (self.selectedElem) {
      self.cursorSelect(self.selectedElem, true);
    }
    self.headerUpdate();
  };
  // Helper methods:
  self.cursorSelect = function(td, noanim) {
    $("#ribbon_buttons a:contains('Table')").parent().fadeIn(200);
    // Cleanup last elem.
    if (self.selectedElem) {
      self.selectedEditable(false);
    }
    document.getSelection().removeAllRanges();
    self.selected = true;
    self.selectedElem = td;
    $(self.selectedElem).focus();
    self.selectedEditable(false);
    //self.observer.observe(self.selectedElem,{characterData:true});
    self.selectedElem.addEventListener('DOMSubtreeModified', self.observer);
    if ($('.Table.axis').length === 0) {
      var size = self.tableSize();
      var nodes = '<table class="Table axis" id="x"><thead><tr>';
      for (var i = 0; i < size[0]; i++) {
        var elem = self.posToElem(i, 0);
        var bounding = elem.getBoundingClientRect();
        nodes += '<th style="width: ' + (bounding.width - 1).toFixed(0) + 'px">' + self.columnLabel(i) + '</th>';
      }
      var table_count = $('.content_container table').index(self.primaryTable()) + 1;
      var name = 'Table ' + table_count;
      nodes += '</tr></thead></table><table class="Table axis" id="y"><thead><tr><th>' + name + '</th></tr>';
      for (var i = 0; i < size[1]; i++) {
        var elem = self.posToElem(0, i);
        nodes += '<tr><th style="height: ' + ($(elem).height() + 1) + 'px">' + (i + 1) + '</th></tr>';
      }
      nodes += '</thead></table>';
      $('.content').append($(nodes));
      if (!noanim) {
        $('.Table.axis').fadeIn(200);
      } else {
        $('.Table.axis').show();
      }
    }
    self.cursorUpdate();
    self.enterLeaveBinds();
  };
  self.headerUpdate = function() {
    var size = self.tableSize();
    var x_nodes = $('.axis#x th');
    for (var i = 0; i < size[0]; i++) {
      var elem = self.posToElem(i, 0);
      var bounding = elem.getBoundingClientRect();
      x_nodes[i].style.width = (bounding.width) + 'px';
      //x_nodes.eq(i).css({width:(bounding.width-1).toFixed(0)});//'+self.columnLabel(i);
    }
    var y_nodes = $('.axis#y th');
    for (var i = 0; i < size[1]; i++) {
      var elem = self.posToElem(0, i);
      var bounding = elem.getBoundingClientRect();
      y_nodes[i + 1].style.height = (bounding.height) + 'px';
      //y_nodes.eq(i).css({height: (bounding.height-1)});//+'px">'+(i+1);
    }
    var table = $(self.primaryTable());
    //$(".Table.axis#x").width(table.width()+2);
    //$(".Table.axis#y").height(table.height());
  };
  self.cursorMove = function(dColumn, dRow) {
    self.selectedEditable(false);
    var pos = self.selectedPos();
    var column = pos[0];
    var row = pos[1];
    // TODO: Redo this into a more readable form using jQuery.
    if (self.selectedElem.parentElement.parentElement.children.length > row + dRow && self.selectedElem.parentElement.parentElement.children[0].children.length > column + dColumn && row + dRow >= 0 && column + dColumn >= 0) {
      var new_td = self.selectedElem.parentElement.parentElement.children[row + dRow].children[column + dColumn];
      self.cursorSelect(new_td);
    }
  };
  self.axisPosition = function() {
    if (!self.selectedElem) return;
    var table = $(self.primaryTable());
    var offset = table.offset();
    var box = table[0].getBoundingClientRect();
    $('.Table.axis#x').offset({
      left: offset.left,
      top: offset.top - 16
    }).width(box.width - 2);
    $('.Table.axis#y').offset({
      left: offset.left - $('.Table.axis#y').width(),
      top: offset.top - 16
    });
  };
  self.cursorUpdate = function(pos) {
    var pos = $(self.selectedElem).offset();
    pos.top += 2;
    pos.left += 2;
    self.updateSelectedArea();
    var table = $(self.primaryTable());
    var elem_box = self.selectedElem.getBoundingClientRect();
    $('#table_cursor').offset({
      left: pos.left,
      top: pos.top
    })
      .height(elem_box.height - 4)
      .width(elem_box.width - 6)
      .get(0).scrollIntoViewIfNeeded();

    if ((table.css('position') === 'absolute' || pos)) {
      if (!self.disableAxisPositioning) {
        self.axisPosition();
      }
      var box = table[0].getBoundingClientRect();
      $('.Table.axis#x').width(box.width - 2);
    }
  };
  // Accepts values in the format of "Name.A1:B6"
  self.getCellData = function(range) {
    var bits = range.split('.');
    var table; // = self.primaryTable();
    if (bits.length >= 2) {
      var name = bits[0];
      var search = $(".content_container table[name='" + name + "']");
      if (search.length >= 1) {
        table = search.get(0);
      } else if (name.match(/^Table \d+$/)) {
        var index = parseInt(name.split(' ')[1]) - 1;
        table = $('.content_container table')
          .get(index);
      }
    }
    var parts = _.last(bits).split(':');
    var first = self.coordsFromLabel(parts[0]),
      second;
    if (parts.length === 2) {
      second = self.coordsFromLabel(parts[1]);
    }
    var top_left, bottom_right, size;
    if (second) {
      // Get top left cell.
      top_left = [
        first[0] < second[0] ? first[0] : second[0],
        first[1] < second[1] ? first[1] : second[1]
      ];
      bottom_right = [
        first[0] > second[0] ? first[0] : second[0],
        first[1] > second[1] ? first[1] : second[1]
      ];
    } else {
      top_left = first;
      bottom_right = first;
    }
    var size = [
      bottom_right[0] - top_left[0] + 1,
      bottom_right[1] - top_left[1] + 1
    ];
    var data = [];
    var elem_in_table = $(table).find('td, th')[0] || window._tmp_elem;
    for (var x = 0; x < size[0]; x++) {
      for (var y = 0; y < size[1]; y++) {
        if (!data[x]) data[x] = [];
        var elem = self.posToElem(top_left[0] + x, top_left[1] + y,
          elem_in_table);
        if (window._tmp_elem && elem === window._tmp_elem) {
          throw "Error: Cell can't select it's own content.";
        }
        var val = $(elem).text();
        if (parseFloat(val).toString() === val) {
          val = parseFloat(val);
        }
        data[x][y] = val;
      }
    }
    if (data.length === 1 && data[0].length === 1) {
      return data[0][0];
    }
    return data;
  };
  self.evalJS = function(js, elem) {
    // Hack. :(
    window._tmp_elem = elem;

    var c = self.getCellData;
    var out;
    try {
      out = eval(js);
    } catch (e) {
      out = '!' + e;
    }
    delete window._tmp_elem;
    return out;
  };
  self.updateJS = function(node) {
    var data = $(node).data().content;
    if (data[0] === '=') {
      $(node).text(self.evalJS(data.slice(1), node));
    }
  };
  self.updateAllJS = function() {
    var nodes = $('.content table td:data(content)');
    _.each(nodes, function(node) {
      self.updateJS(node);
    });
  };
  self.selectedEditable = function(edit) {
    if (!edit) {
      self.selectedElem.contentEditable = 'inherit';
      var text = $(self.selectedElem).text();
      if (text[0] === '=') {
        $(self.selectedElem).data('content', text);
      }
      self.updateAllJS();
      $('#table_cursor').css({
        borderStyle: 'solid',
        outlineStyle: 'solid'
      });
      $('#ribbon_buttons a:contains("Table")').click();
    } else {
      self.selectedElem.contentEditable = true;
      var data = $(self.selectedElem).data();
      if (data.content) {
        $(self.selectedElem).text(data.content);
      }
      $('#table_cursor').css({
        borderStyle: 'dashed',
        outlineStyle: 'dashed'
      });
      $('#ribbon_buttons a:contains("Text")').click();
      //self.setEndOfContenteditable(self.selectedElem);
    }
  };
  self.clearSelect = function() {
    if (self.selected) {
      self.selected = false;
      self.selectedEditable(false);
      $('#table_cursor').offset({
        left: -10000
      });
      self.selectedElem.removeEventListener('DOMSubtreeModified', self.observer);
      delete self.selectedElem;
      $("#ribbon_buttons a:contains('Table')").parent().fadeOut(200);
      $('#ribbon_buttons a:contains("Text")').click();
      self.selectedElem = null;
      self.updateSelectedArea();
      $('.Table.axis').fadeOut(200).promise().done(function() {
        $('.Table.axis#x').remove();
        $('.Table.axis#y').remove();
      });
      self.enterLeaveBinds();
    }
  };
  self.table = null;
  self.enterLeaveBinds = function() {
    if (self.selected) {
      var primary = self.primaryTable();
      if (primary !== self.table) {
        if (self.table) {
          self.leaveTable(self.table);
        }
        self.table = primary;
        self.enterTable(self.table);
      }
    } else {
      if (self.table) {
        self.leaveTable(self.table);
        self.table = null;
      }
    }
  };
  self.enterTable = function(table) {
    //$(table).children().on("keydown.TablesTemp", self.keypressHandler);
    $(document).on('keydown.TablesTemp', self.keypressHandler);
    $('.content_container').delegate('resize.Tables', 'table', function(e) {
      self.cursorUpdate();
      self.headerUpdate();
    });
  };
  self.leaveTable = function(table) {
    $(table).unbind('.TablesTemp');
    $(table).undelegate('.TablesTemp');
    $(table).off('.TablesTemp');
    $(document).unbind('.TablesTemp');
    $(document).undelegate('.TablesTemp');
    $(document).off('.TablesTemp');
  };
  $(document).on('zoom', function() {
    if (self.selected) {
      self.cursorUpdate();
      self.headerUpdate();
    }
  });
  self.updateSelectedArea = function() {
    $('.Table.axis th').removeClass('active');
    if (!self.selected || self.primaryTable() !== self.primaryTable(self.selectionEnd)) {
      $('#table_selection').hide();
      if (self.selected) {
        $($('.Table.axis#x').children().children().children()[self.selectedPos()[0]]).addClass('active');
        $($('.Table.axis#y').children().children()[self.selectedPos()[1]]).children().addClass('active');
      }
    } else {
      var end = self.selectionEnd || self.selectedElem;
      if (self.selectionEnd && self.selectionEnd !== self.selectedElem) {
        var start_box = self.selectedElem.getBoundingClientRect();
        var end_box = end.getBoundingClientRect();
        var top = start_box.top < end_box.top ? start_box.top : end_box.top;
        var bottom = start_box.bottom > end_box.bottom ? start_box.bottom : end_box.bottom;
        var left = start_box.left < end_box.left ? start_box.left : end_box.left;
        var right = start_box.right > end_box.right ? start_box.right : end_box.right;
        $('#table_selection').show().offset({
          left: left,
          top: top
        }).height(bottom - top - 2).width(right - left - 3);
      } else {
        $('#table_selection').hide();
      }
      // Set hidden selection area contents to mini-table.
      var selection_html = '<table><tbody>';
      var tpos_start = self.selectedPos();
      var tpos_end = self.selectedPos(end);

      var top = tpos_start[1] < tpos_end[1] ? tpos_start[1] : tpos_end[1];
      var bottom = tpos_start[1] > tpos_end[1] ? tpos_start[1] : tpos_end[1];
      var left = tpos_start[0] < tpos_end[0] ? tpos_start[0] : tpos_end[0];
      var right = tpos_start[0] > tpos_end[0] ? tpos_start[0] : tpos_end[0];
      $('.Table.axis#x').children().children().children().slice(left, right + 1).addClass('active');
      $('.Table.axis#y').children().children().slice(top + 1, bottom + 2).children().addClass('active');
      for (var y = top; y <= bottom; y++) {
        selection_html += '<tr>';
        for (var x = left; x <= right; x++) {
          selection_html += '<td>' + self.selectedElem.parentElement.parentElement.children[y].children[x].innerHTML + '</td>';
        }
        selection_html += '</tr>';
      }
      selection_html += '</tbody></table>';
      $('#table_clip').html(selection_html);
      if (self.selectedElem.contentEditable !== 'true') {
        // Hidden selection area for copying.
        var range = rangy.createRange();
        range.selectNodeContents($('#table_clip').get(0));
        var sel = rangy.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };
  self.emptySelection = function() {
    var end = self.selectionEnd || self.selectedElem;
    var tpos_start = self.selectedPos();
    var tpos_end = self.selectedPos(end);

    var top = tpos_start[1] < tpos_end[1] ? tpos_start[1] : tpos_end[1];
    var bottom = tpos_start[1] > tpos_end[1] ? tpos_start[1] : tpos_end[1];
    var left = tpos_start[0] < tpos_end[0] ? tpos_start[0] : tpos_end[0];
    var right = tpos_start[0] > tpos_end[0] ? tpos_start[0] : tpos_end[0];
    for (var y = top; y <= bottom; y++) {
      for (var x = left; x <= right; x++) {
        var node = self.selectedElem.parentElement.parentElement.children[y].children[x];
        node.innerHTML = '';
        $(node).data('content', null);
      }
    }
  };
  self.setEndOfContenteditable = function(contentEditableElement) {
    var range, selection;
    if (document.createRange) //Firefox, Chrome, Opera, Safari, IE 9+
    {
      range = document.createRange(); //Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(contentEditableElement); //Select the entire contents of the element with the range
      range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
      selection = window.getSelection(); //get the selection object (allows you to change selection)
      selection.removeAllRanges(); //remove any selections already made
      selection.addRange(range); //make the range you have just created the visible selection
    } else if (document.selection) //IE 8 and lower
    {
      range = document.body.createTextRange(); //Create a range (a range is a like the selection but invisible)
      range.moveToElementText(contentEditableElement); //Select the entire contents of the element with the range
      range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
      range.select(); //Select the range (make it the visible selection
    }
  };
  self.primaryTable = function(elem) {
    return (elem || self.selectedElem).parentElement.parentElement.parentElement;
  };
  self.posToElem = function(x, y, elem) {
    if (!elem) {
      elem = self.selectedElem;
    }
    return $(elem).parent().parent().children().eq(y).children()[x];
  };
  self.selectedPos = function(targetElem) {
    var child = (targetElem || self.selectedElem);
    var column = 0;
    while ((child = child.previousSibling) !== null) {
      if (child.nodeName === 'TD' || child.nodeName === 'TH')
        column++;
    }
    child = (targetElem || self.selectedElem).parentElement;
    var row = 0;
    while ((child = child.previousSibling) !== null)
      row++;
    return [column, row];
  };
  self.tableSize = function() {
    return [$(self.selectedElem).parent().children().length, $(self.selectedElem).parent().parent().children().length];
  };
  // Taken from Stack Overflow
  // http://stackoverflow.com/questions/8603480/how-to-create-a-function-that-converts-a-number-to-a-bijective-hexavigesimal
  var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  self.columnLabel = function(a) {
    // First figure out how many digits there are.
    a += 1; // This line is funky
    var c = 0;
    var x = 1;
    while (a >= x) {
      c++;
      a -= x;
      x *= 26;
    }

    // Now you can do normal base conversion.
    var s = '';
    for (var i = 0; i < c; i++) {
      s = alpha.charAt(a % 26) + s;
      a = Math.floor(a / 26);
    }

    return s;
  };
  // Convert from a "A1" formated label to a coordinate.
  self.coordsFromLabel = function(label) {
    // Row (number), Column (Base 26)
    var r = '',
      c = '';
    _.each(label, function(sym) {
      if (alpha.indexOf(sym) !== -1) {
        c += sym;
      } else {
        r += sym;
      }
    });
    var column = 0;
    _.each(c, function(sym, i) {
      column += (alpha.indexOf(sym) + 1) * Math.pow(26, c.length - i - 1);
    });

    return [column - 1, parseInt(r) - 1];
  };

  // Return self so other modules can hook into this one.
  return self;
});
