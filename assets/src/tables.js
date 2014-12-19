/*jslint browser: true*/
/*global $, define, rangy, _, prompt, alert, Detector, WebSyncData, ace, WebSyncAuth, WebSocket, JST*/

//= require templates/tables-ribbon
//= require templates/tables-selection
//= require templates/tables-insert
//= require templates/tables-new

define(['websync'], function(WS) {
  'use strict';

  /**
   * WebSync Tables plugin.
   *
   * Plugins should use a jQuery namespace for ease of use.
   * Bind Example: $(document).bind("click.Tables", clickHandler);
   * Unbind Example: $("*").unbind(".Tables");
   *
   * @exports tables
   * @module tables
   */

  var exports = {
    // Keeps track of the size of the cell to poll for changes.
    lastSize: '',

    // An observer to update position and headers if the cell size changes.
    observer: function() {
      var bounding_data = JSON.stringify(exports.selectedElem.getBoundingClientRect());
      if (bounding_data !== exports.lastSize) {
        setTimeout(function() {
          exports.cursorUpdate();
        }, 1);
        setTimeout(function() {
          exports.headerUpdate();
        }, 2);
        exports.lastSize = bounding_data;
      }
    },

    // Is the selection active?
    selectionActive: false,

    // Disable the axis position. Only used for the Spreadsheet format.
    disableAxisPositioning: false,

    /**
     * Handler for keypresses
     *
     * @param e {Event} the keypress event
     */
    keypressHandler: function(e) {
      if (!exports.selectedElem) {
        return;
      }
      if (exports.selected) {
        var editting = false;
        if (exports.selectedElem.contentEditable) {
          editting = exports.selectedElem.contentEditable === 'true';
        }
        if (e.keyCode === 13 && !e.shiftKey) {
          exports.cursorMove(0, 1);
        } else if (e.keyCode === 9) {
          // Tab key
          exports.selectedEditable(false);
          exports.cursorMove(1 - 2 * e.shiftKey, 0);
          e.preventDefault();
        } else if (e.keyCode === 27) {
          // Escape
          exports.selectedEditable(false);
        } else if (e.keyCode === 37 && !editting) {
          // Left arrow
          exports.cursorMove(-1, 0);
          e.preventDefault();
        } else if (e.keyCode === 39 && !editting) {
          // Right arrow
          exports.cursorMove(1, 0);
          e.preventDefault();
        } else if (e.keyCode === 38 && !editting) {
          // Up arrow
          exports.cursorMove(0, -1);
          e.preventDefault();
        } else if (e.keyCode === 40 && !editting) {
          // Down a1rrow
          exports.cursorMove(0, 1);
          e.preventDefault();
        } else if (e.keyCode === 46 && !editting) { // Delete key
          exports.emptySelection();
          e.preventDefault();
        } else {
          if ((!exports.selectedElem.contentEditable || exports.selectedElem.contentEditable === 'inherit') && _.indexOf([16, 17, 18, 91, 92], e.keyCode) === -1 && !(e.keyCode === 67 && e.ctrlKey)) {
            exports.selectedEditable(true);

            $(exports.selectedElem).focus();
            //WebSync.setCaretPosition(exports.selectedElem,0);
          }
          setTimeout(exports.cursorUpdate, 1);
        }
      } else {
        if (!exports.selectedElem.contentEditable || exports.selectedElem.contentEditable === 'false') {
          exports.selectedEditable(true);

          $(exports.selectedElem).focus();
          //WebSync.setCaretPosition(exports.selectedElem,0);
        }
      }
    },

    /**
     * Checks the table for =JS() equations in cells. If found it will run the
     * JavaScript and return the result.
     */
    checkForJS: function() {
      var elems = $(".content table td:contains('=')");
      _.each(elems, function(cell) {
        var data = $(cell).data().content;
        if (!data) {
          var text = $(cell).text();
          if (text[0] === '=') {
            $(cell).data('content', text);
            exports.updateJS(cell);
          }
        } else if (data[0] === '=') {
          exports.updateJS(cell);
        }
      });
    },

    // Disables the plugin. This has to be set for possible plugin unloading.
    disable: function() {
      $('.Table').remove();
      WS.updateRibbon();
      $('*').unbind('.Tables');
      $('*').undelegate('.Tables');
    },

    // Render the titles for the table header.
    redrawTitles: function() {
      $('.Table.axis').remove();
      if (exports.selectedElem) {
        exports.cursorSelect(exports.selectedElem, true);
      }
      exports.headerUpdate();
    },

    /**
     * Selects a cell to be the target of the cursor.
     *
     * @param td {Element} the table cell.
     * @param noanim {Boolean} disables the animations.
     */
    cursorSelect: function(td, noanim) {
      $("#ribbon_buttons a:contains('Table')").parent().fadeIn(200);
      // Cleanup last elem.
      if (exports.selectedElem) {
        exports.selectedEditable(false);
      }
      document.getSelection().removeAllRanges();
      exports.selected = true;
      exports.selectedElem = td;
      $(exports.selectedElem).focus();
      exports.selectedEditable(false);
      //exports.observer.observe(exports.selectedElem,{characterData:true});
      exports.selectedElem.addEventListener('DOMSubtreeModified', exports.observer);
      if ($('.Table.axis').length === 0) {
        var size = exports.tableSize();
        var nodes = '<table class="Table axis" id="x"><thead><tr>';
        for (var i = 0; i < size[0]; i++) {
          var elem = exports.posToElem(i, 0);
          var bounding = elem.getBoundingClientRect();
          nodes += '<th style="width: ' + (bounding.width - 1).toFixed(0) + 'px">' + exports.columnLabel(i) + '</th>';
        }
        var table_count = $('.content_container table').index(exports.primaryTable()) + 1;
        var name = 'Table ' + table_count;
        nodes += '</tr></thead></table><table class="Table axis" id="y"><thead><tr><th>' + name + '</th></tr>';
        for (var i = 0; i < size[1]; i++) {
          var elem = exports.posToElem(0, i);
          nodes += '<tr><th style="height: ' + ($(elem).height() + 1) + 'px">' + (i + 1) + '</th></tr>';
        }
        nodes += '</thead></table>';
        $('.content').append($(nodes));
        if (noanim) {
          $('.Table.axis').show();
        } else {
          $('.Table.axis').fadeIn(200);
        }
      }
      exports.cursorUpdate();
      exports.enterLeaveBinds();
    },
    headerUpdate: function() {
      var size = exports.tableSize();
      var x_nodes = $('.axis#x th');
      for (var i = 0; i < size[0]; i++) {
        var elem = exports.posToElem(i, 0);
        var bounding = elem.getBoundingClientRect();
        x_nodes[i].style.width = (bounding.width) + 'px';
        //x_nodes.eq(i).css({width:(bounding.width-1).toFixed(0)});//'+exports.columnLabel(i);
      }
      var y_nodes = $('.axis#y th');
      for (var i = 0; i < size[1]; i++) {
        var elem = exports.posToElem(0, i);
        var bounding = elem.getBoundingClientRect();
        y_nodes[i + 1].style.height = (bounding.height) + 'px';
        //y_nodes.eq(i).css({height: (bounding.height-1)});//+'px">'+(i+1);
      }
      var table = $(exports.primaryTable());
      //$(".Table.axis#x").width(table.width()+2);
      //$(".Table.axis#y").height(table.height());
    },
    cursorMove: function(dColumn, dRow) {
      exports.selectedEditable(false);
      var pos = exports.selectedPos();
      var column = pos[0];
      var row = pos[1];
      // TODO: Redo this into a more readable form using jQuery.
      if (exports.selectedElem.parentElement.parentElement.children.length > row + dRow && exports.selectedElem.parentElement.parentElement.children[0].children.length > column + dColumn && row + dRow >= 0 && column + dColumn >= 0) {
        var new_td = exports.selectedElem.parentElement.parentElement.children[row + dRow].children[column + dColumn];
        exports.cursorSelect(new_td);
      }
    },
    axisPosition: function() {
      if (!exports.selectedElem) return;
      var table = $(exports.primaryTable());
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
    },
    cursorUpdate: function(pos) {
      var pos = $(exports.selectedElem).offset();
      pos.top += 2;
      pos.left += 2;
      exports.updateSelectedArea();
      var table = $(exports.primaryTable());
      var elem_box = exports.selectedElem.getBoundingClientRect();
      $('#table_cursor').offset({
          left: pos.left,
          top: pos.top
        })
        .height(elem_box.height - 4)
        .width(elem_box.width - 6)
        .get(0).scrollIntoViewIfNeeded();

      if ((table.css('position') === 'absolute' || pos)) {
        if (!exports.disableAxisPositioning) {
          exports.axisPosition();
        }
        var box = table[0].getBoundingClientRect();
        $('.Table.axis#x').width(box.width - 2);
      }
    },

    // Gets values in the format of "Name.A1:B6"
    getCellData: function(range) {
      var bits = range.split('.');
      var table; // = exports.primaryTable();
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
      var first = exports.coordsFromLabel(parts[0]),
        second;
      if (parts.length === 2) {
        second = exports.coordsFromLabel(parts[1]);
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
          var elem = exports.posToElem(top_left[0] + x, top_left[1] + y,
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
    },
    evalJS: function(js, elem) {
      // Hack. :(
      window._tmp_elem = elem;

      var c = exports.getCellData;
      var out;
      try {
        out = eval(js);
      } catch (e) {
        out = '!' + e;
      }
      delete window._tmp_elem;
      return out;
    },
    updateJS: function(node) {
      var data = $(node).data().content;
      if (data[0] === '=') {
        $(node).text(exports.evalJS(data.slice(1), node));
      }
    },
    updateAllJS: function() {
      var nodes = $('.content table td:data(content)');
      _.each(nodes, function(node) {
        exports.updateJS(node);
      });
    },
    selectedEditable: function(edit) {
      if (!edit) {
        exports.selectedElem.contentEditable = 'inherit';
        var text = $(exports.selectedElem).text();
        if (text[0] === '=') {
          $(exports.selectedElem).data('content', text);
        }
        exports.updateAllJS();
        $('#table_cursor').css({
          borderStyle: 'solid',
          outlineStyle: 'solid'
        });
        $('#ribbon_buttons a:contains("Table")').click();
      } else {
        exports.selectedElem.contentEditable = true;
        var data = $(exports.selectedElem).data();
        if (data.content) {
          $(exports.selectedElem).text(data.content);
        }
        $('#table_cursor').css({
          borderStyle: 'dashed',
          outlineStyle: 'dashed'
        });
        $('#ribbon_buttons a:contains("Text")').click();
        //exports.setEndOfContenteditable(exports.selectedElem);
      }
    },
    clearSelect: function() {
      if (exports.selected) {
        exports.selected = false;
        exports.selectedEditable(false);
        $('#table_cursor').offset({
          left: -10000
        });
        exports.selectedElem.removeEventListener('DOMSubtreeModified', exports.observer);
        delete exports.selectedElem;
        $("#ribbon_buttons a:contains('Table')").parent().fadeOut(200);
        $('#ribbon_buttons a:contains("Text")').click();
        exports.selectedElem = null;
        exports.updateSelectedArea();
        $('.Table.axis').fadeOut(200).promise().done(function() {
          $('.Table.axis#x').remove();
          $('.Table.axis#y').remove();
        });
        exports.enterLeaveBinds();
      }
    },
    table: null,
    enterLeaveBinds: function() {
      if (exports.selected) {
        var primary = exports.primaryTable();
        if (primary !== exports.table) {
          if (exports.table) {
            exports.leaveTable(exports.table);
          }
          exports.table = primary;
          exports.enterTable(exports.table);
        }
      } else {
        if (exports.table) {
          exports.leaveTable(exports.table);
          exports.table = null;
        }
      }
    },
    enterTable: function(table) {
      //$(table).children().on("keydown.TablesTemp", exports.keypressHandler);
      $(document).on('keydown.TablesTemp', exports.keypressHandler);
      $('.content_container').delegate('resize.Tables', 'table', function(e) {
        exports.cursorUpdate();
        exports.headerUpdate();
      });
    },
    leaveTable: function(table) {
      $(table).unbind('.TablesTemp');
      $(table).undelegate('.TablesTemp');
      $(table).off('.TablesTemp');
      $(document).unbind('.TablesTemp');
      $(document).undelegate('.TablesTemp');
      $(document).off('.TablesTemp');
    },
    updateSelectedArea: function() {
      $('.Table.axis th').removeClass('active');
      if (!exports.selected || exports.primaryTable() !== exports.primaryTable(exports.selectionEnd)) {
        $('#table_selection').hide();
        if (exports.selected) {
          $($('.Table.axis#x').children().children().children()[exports.selectedPos()[0]]).addClass('active');
          $($('.Table.axis#y').children().children()[exports.selectedPos()[1]]).children().addClass('active');
        }
      } else {
        var end = exports.selectionEnd || exports.selectedElem;
        if (exports.selectionEnd && exports.selectionEnd !== exports.selectedElem) {
          var start_box = exports.selectedElem.getBoundingClientRect();
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
        var tpos_start = exports.selectedPos();
        var tpos_end = exports.selectedPos(end);

        var top = tpos_start[1] < tpos_end[1] ? tpos_start[1] : tpos_end[1];
        var bottom = tpos_start[1] > tpos_end[1] ? tpos_start[1] : tpos_end[1];
        var left = tpos_start[0] < tpos_end[0] ? tpos_start[0] : tpos_end[0];
        var right = tpos_start[0] > tpos_end[0] ? tpos_start[0] : tpos_end[0];
        $('.Table.axis#x').children().children().children().slice(left, right + 1).addClass('active');
        $('.Table.axis#y').children().children().slice(top + 1, bottom + 2).children().addClass('active');
        for (var y = top; y <= bottom; y++) {
          selection_html += '<tr>';
          for (var x = left; x <= right; x++) {
            selection_html += '<td>' + exports.selectedElem.parentElement.parentElement.children[y].children[x].innerHTML + '</td>';
          }
          selection_html += '</tr>';
        }
        selection_html += '</tbody></table>';
        $('#table_clip').html(selection_html);
        if (exports.selectedElem.contentEditable !== 'true') {
          // Hidden selection area for copying.
          var range = rangy.createRange();
          range.selectNodeContents($('#table_clip').get(0));
          var sel = rangy.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    },
    emptySelection: function() {
      var end = exports.selectionEnd || exports.selectedElem;
      var tpos_start = exports.selectedPos();
      var tpos_end = exports.selectedPos(end);

      var top = tpos_start[1] < tpos_end[1] ? tpos_start[1] : tpos_end[1];
      var bottom = tpos_start[1] > tpos_end[1] ? tpos_start[1] : tpos_end[1];
      var left = tpos_start[0] < tpos_end[0] ? tpos_start[0] : tpos_end[0];
      var right = tpos_start[0] > tpos_end[0] ? tpos_start[0] : tpos_end[0];
      for (var y = top; y <= bottom; y++) {
        for (var x = left; x <= right; x++) {
          var node = exports.selectedElem.parentElement.parentElement.children[y].children[x];
          node.innerHTML = '';
          $(node).data('content', null);
        }
      }
    },
    setEndOfContenteditable: function(contentEditableElement) {
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
    },
    primaryTable: function(elem) {
      return (elem || exports.selectedElem).parentElement.parentElement.parentElement;
    },
    posToElem: function(x, y, elem) {
      if (!elem) {
        elem = exports.selectedElem;
      }
      return $(elem).parent().parent().children().eq(y).children()[x];
    },
    selectedPos: function(targetElem) {
      var child = (targetElem || exports.selectedElem);
      var column = 0;
      while ((child = child.previousSibling) !== null) {
        if (child.nodeName === 'TD' || child.nodeName === 'TH')
          column++;
      }
      child = (targetElem || exports.selectedElem).parentElement;
      var row = 0;
      while ((child = child.previousSibling) !== null)
        row++;
      return [column, row];
    },
    tableSize: function() {
      return [$(exports.selectedElem).parent().children().length, $(exports.selectedElem).parent().parent().children().length];
    },
    // http://stackoverflow.com/questions/8603480/how-to-create-a-function-that-converts-a-number-to-a-bijective-hexavigesimal
    columnLabel: function(a) {
      var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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
    },

    /**
     * Convert from a "A1" formated label to a coordinate.
     *
     * @param label {String} the label
     * @return {Array<Number>} an array with column, row.
     */
    coordsFromLabel: function(label) {
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
    }
  };

  $('.ribbon').append(JST['templates/tables-ribbon']({}));
  $('.content').append(JST['templates/tables-selection']({}));
  $('#Insert').append(JST['templates/tables-insert']({}));
  $('#table').bind('click.Tables', function() {
    var newTable = $(JST['templates/tables-new']({}));
    WS.insertAtCursor(newTable);
  });
  $('.Table [title="Insert Row Above"]').bind('click.Tables', function() {
    if (exports.selected) {
      var html = '<tr>';
      var size = exports.tableSize();
      var i;
      for (i = 0; i < size[0]; i++) {
        html += '<td></td>';
      }
      html += '</tr>';
      $(html).insertBefore(exports.selectedElem.parentElement);
      exports.redrawTitles();
      exports.cursorMove(0, -1);
    }
  });
  $('.Table [title="Insert Row Below"]').bind('click.Tables', function() {
    if (exports.selected) {
      var html = '<tr>';
      var size = exports.tableSize();
      var i;
      for (i = 0; i < size[0]; i++) {
        html += '<td></td>';
      }
      html += '</tr>';
      $(html).insertAfter(exports.selectedElem.parentElement);
      exports.redrawTitles();
      exports.cursorMove(0, 1);
    }
  });
  $('.Table [title="Delete Row"]').bind('click.Tables', function() {
    if (exports.selected) {
      var size = exports.tableSize();
      if (size[1] > 1) {
        var pos = exports.selectedPos();
        var n_y = pos[1] + 1;
        if (n_y >= size[1]) {
          n_y -= 2;
        }
        var n_selected = exports.posToElem(pos[0], n_y);
        $(exports.selectedElem).closest('tr').remove();
        exports.clearSelect();
        exports.cursorSelect(n_selected);
        exports.redrawTitles();
      }
    }
  });
  $('.Table [title="Insert Column Left"]').bind('click.Tables', function(e) {
    if (exports.selected) {
      var size = exports.tableSize();
      var pos = exports.selectedPos();
      for (var i = 0; i < size[1]; i++) {
        $('<td></td>').insertBefore(exports.selectedElem.parentElement.parentElement.children[i].children[pos[0]]);
      }
      exports.redrawTitles();
      exports.cursorMove(-1, 0);
    }
  });
  $('.Table [title="Insert Column Right"]').bind('click.Tables', function(e) {
    if (exports.selected) {
      var size = exports.tableSize();
      var pos = exports.selectedPos();
      for (var i = 0; i < size[1]; i++) {
        $('<td></td>').insertAfter(exports.selectedElem.parentElement.parentElement.children[i].children[pos[0]]);
      }
      exports.redrawTitles();
      exports.cursorMove(1, 0);
    }
  });
  $('.Table [title="Delete Column"]').bind('click.Tables', function(e) {
    if (exports.selected) {
      var size = exports.tableSize();
      var pos = exports.selectedPos();
      var parentElem = $(exports.selectedElem).parent().parent();
      if (size[0] > 1) {
        var pos = exports.selectedPos();
        var n_x = pos[0] + 1;
        if (n_x >= size[0]) n_x -= 2;
        var n_selected = exports.posToElem(n_x, pos[1]);
        for (var i = 0; i < size[1]; i++) {
          $(parentElem).children('tr').eq(i).children('td').eq(pos[0]).remove();
        }
        exports.clearSelect();
        exports.cursorSelect(n_selected);
        exports.redrawTitles();
      }
    }
  });
  $('.Table [title="Delete Table"]').bind('click.Tables', function(e) {
    if (exports.selected) {
      $(exports.selectedElem).parents('table').first().remove();
      exports.clearSelect();
    }
  });
  $('.content').delegate('table', 'click.Tables', function(e) {
    if (!exports.selectedElem || exports.selectedElem.contentEditable !== 'true') {
      $('a:contains("Table")').click();
    }
    e.stopPropagation();
  });
  $('.content').delegate('td', 'mouseenter.Tables', function(e) {
    if (exports.selectionActive && exports.primaryTable() === exports.primaryTable(this)) {
      exports.selectionEnd = this;
      exports.updateSelectedArea();
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
    if (this !== exports.selectedElem) {
      exports.cursorSelect(this);
      exports.selectedElem.contentEditable = true;
      exports.setEndOfContenteditable(exports.selectedElem);
      exports.selectedElem.contentEditable = 'inherit';
    }
    exports.selectionActive = true;
    exports.selectionEnd = null;
    exports.updateSelectedArea();
    //e.preventDefault();
  });
  $('.content').bind('mousemove.Tables', function(e) {
    if (exports.selectionActive && exports.selectedElem && exports.selectedElem.contentEditable !== 'true') {
      e.preventDefault();
    }
  });
  $('.content').delegate('td', 'mouseup.Tables', function(e) {
    exports.selectionActive = false;
  });
  $('.content').bind('click.Tables', function(e) {
    exports.clearSelect();
  });
  $(document).bind('clear_select.Tables', function(e) {
    exports.clearSelect();
  });
  $('.content').delegate('td', 'contextmenu.Tables', function(e) {
    if (this !== exports.selectedElem) {
      exports.cursorSelect(this);
    }
    if (exports.selectedElem.contentEditable !== 'true') {
      //e.preventDefault();
      //$(this).contextmenu();
    }
  });
  $('.content').delegate('td', 'dblclick.Tables', function(e) {
    if (exports.selectedElem.contentEditable !== 'true') {
      exports.selectedEditable(true);
    }
  });
  $('.content').delegate('.Table.axis#x th.resize', 'mousedown.Tables', function(e) {
    exports.drag = true;
    if (Math.abs(e.pageX - $(this).offset().left) < 5) {
      exports.active = $(this).prev()[0];
    } else {
      exports.active = this;
    }
    exports.origX = e.pageX;
    exports.origWidth = $(exports.active).width();
  });
  $('.content').delegate('.Table.axis#y th.resize', 'mousedown.Tables', function(e) {
    exports.drag = true;
    if (Math.abs(e.pageY - $(this).offset().top) < 5) {
      exports.active = $(this).prev()[0];
    } else {
      exports.active = this;
    }
    exports.origY = e.pageY;
    exports.origHeight = $(exports.active).height();
  });
  $(document).bind('mousemove.Tables', function(e) {
    if (exports.drag) {
      var table = $(exports.primaryTable());
      if (exports.origX) {
        $(exports.active).width(e.pageX - exports.origX + exports.origWidth);
        var pos = exports.selectedPos(exports.active);
        $(exports.posToElem(pos[0], 0)).width(e.pageX - exports.origX + exports.origWidth);
      }
      if (exports.origY) {
        $(exports.active).height(e.pageY - exports.origY + exports.origHeight);
        var pos = exports.selectedPos(exports.active);
        $(exports.posToElem(0, pos[1]).parentElement).height(e.pageY - exports.origY + exports.origHeight);
      }
      exports.cursorUpdate();
    }
  });
  $(document).bind('mouseup.Tables', function(e) {
    if (exports.drag) {
      e.preventDefault();
      exports.origX = null;
      exports.origY = null;
      exports.origWidth = null;
      exports.origHeight = null;
      exports.drag = false;
    }
  });
  $('.content').delegate(".Table.axis#x th:not('resize')", 'click.Tables', function(e) {
    var pos = exports.selectedPos(this);
    var size = exports.tableSize();
    exports.cursorSelect(exports.posToElem(pos[0], 0));
    if (!e.shiftKey) {
      exports.selectionEnd = exports.posToElem(pos[0], size[1] - 1);
    }
    exports.updateSelectedArea();
  });
  $('.content').delegate(".Table.axis#y th:not('resize')", 'click.Tables', function(e) {
    var pos = exports.selectedPos(this);
    var size = exports.tableSize();
    exports.cursorSelect(exports.posToElem(0, pos[1] - 1));
    if (!e.shiftKey) {
      exports.selectionEnd = exports.posToElem(size[0] - 1, pos[1] - 1);
    }
    exports.updateSelectedArea();
  });
  $(document).bind('paste.Tables', function(e) {
    if (exports.selected) {
      var nodes = $(e.originalEvent.clipboardData.getData('text/html'));
      nodes.find('script').remove();
      if (nodes.filter('table').length > 0) {
        rows = nodes.filter('table').find('tr');
        var pos = exports.selectedPos();
        _.each(rows, function(row, i) {
          _.each($(row).children(), function(element, j) {
            // TODO: Finish up pasting.
            var html = $(element).html();
            var elem = exports.posToElem(pos[0] + j, pos[1] + i);
            $(elem).html(html);
          });
        });
        e.preventDefault();
      }
    }
  });
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
    _.defer(exports.checkForJS);
    return html;
  });
  WS.updateRibbon();
  $("#ribbon_buttons a:contains('Table')").parent().hide();

  $(document).on('zoom', function() {
    if (exports.selected) {
      exports.cursorUpdate();
      exports.headerUpdate();
    }
  });

  // Return exports so other modules can hook into this one.
  return exports;
});
