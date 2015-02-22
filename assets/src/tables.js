/*jslint browser: true*/
/*global $, define, rangy, _, JST*/

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
    /**
     * Keeps track of the size of the cell to poll for changes.
     */
    lastSize: '',

    /**
     * An observer to update position and headers if the cell size changes.
     */
    observer: function() {
      var boundingData = JSON.stringify(exports.selectedElem.getBoundingClientRect());
      if (boundingData !== exports.lastSize) {
        setTimeout(function() {
          exports.cursorUpdate();
        }, 1);
        setTimeout(function() {
          exports.headerUpdate();
        }, 2);
        exports.lastSize = boundingData;
      }
    },

    /**
     * Is the selection active?
     */
    selectionActive: false,

    /**
     * Disable the axis position. Only used for the Spreadsheet format.
     */
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

    /**
     * Disables the plugin. This has to be set for possible plugin unloading.
     */
    disable: function() {
      $('.Table').remove();
      WS.updateRibbon();
      $('*').unbind('.Tables');
      $('*').off('.Tables');
      $('*').undelegate('.Tables');
    },

    /**
     * Render the titles for the table header.
     */
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
      //exports.selectedElem.addEventListener('DOMSubtreeModified', exports.observer);
      $(exports.selectedElem).on('keypress.Tables', _.throttle(exports.observer, 100)).on('resize.Tables', _.throttle(exports.observer, 100));
      if ($('.Table.axis').length === 0) {
        var size = exports.tableSize();
        var nodes = '<table class="Table axis" id="x"><thead><tr>';
        var i, elem, bounding;
        for (i = 0; i < size[0]; i++) {
          elem = exports.posToElem(i, 0);
          bounding = elem.getBoundingClientRect();
          nodes += '<th style="width: ' + (bounding.width - 1).toFixed(0) + 'px">' + exports.columnLabel(i) + '</th>';
        }
        var tableCount = $('.content_container table').index(exports.primaryTable()) + 1;
        var name = 'Table ' + tableCount;
        nodes += '</tr></thead></table><table class="Table axis" id="y"><thead><tr><th>' + name + '</th></tr>';
        for (i = 0; i < size[1]; i++) {
          elem = exports.posToElem(0, i);
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

    /**
     * Update the header
     */
    headerUpdate: function() {
      var size = exports.tableSize();
      var xNodes = $('.axis#x th');
      var i, elem, bounding;
      for (i = 0; i < size[0]; i++) {
        elem = exports.posToElem(i, 0);
        bounding = elem.getBoundingClientRect();
        xNodes[i].style.width = (bounding.width) + 'px';
      }
      var yNodes = $('.axis#y th');
      for (i = 0; i < size[1]; i++) {
        elem = exports.posToElem(0, i);
        bounding = elem.getBoundingClientRect();
        yNodes[i + 1].style.height = (bounding.height) + 'px';
      }
    },

    /**
     * Select a cell using coordinates.
     *
     * @param dColumn {Number} the cell column
     * @param dRow {Number} the cell row
     */
    cursorMove: function(dColumn, dRow) {
      exports.selectedEditable(false);
      var pos = exports.selectedPos();
      var column = pos[0];
      var row = pos[1];
      // TODO: Redo this into a more readable form using jQuery.
      if (exports.selectedElem.parentElement.parentElement.children.length > row + dRow && exports.selectedElem.parentElement.parentElement.children[0].children.length > column + dColumn && row + dRow >= 0 && column + dColumn >= 0) {
        var newTd = exports.selectedElem.parentElement.parentElement.children[row + dRow].children[column + dColumn];
        exports.cursorSelect(newTd);
      }
    },

    /**
     * Update the position of the table header axis.
     */
    axisPosition: function() {
      if (!exports.selectedElem) {
        return;
      }
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

    /**
     * Update the position of the cursor.
     */
    cursorUpdate: function() {
      var pos = $(exports.selectedElem).offset();
      pos.top += 2;
      pos.left += 2;
      exports.updateSelectedArea();
      var table = $(exports.primaryTable());
      var elemBox = exports.selectedElem.getBoundingClientRect();
      $('#table_cursor').offset({
        left: pos.left,
        top: pos.top
      }).height(elemBox.height - 4).
      width(elemBox.width - 6).
      get(0).scrollIntoViewIfNeeded();

      if (table.css('position') === 'absolute' || pos) {
        if (!exports.disableAxisPositioning) {
          exports.axisPosition();
        }
        var box = table[0].getBoundingClientRect();
        $('.Table.axis#x').width(box.width - 2);
      }
    },

    /**
     * Gets values in the format of "Name.A1:B6"
     */
    getCellData: function(range) {
      var bits = range.split('.');
      var table; // = exports.primaryTable();
      if (bits.length >= 2) {
        var name = bits[0];
        var search = $(".content_container table[name='" + name + "']");
        if (search.length >= 1) {
          table = search.get(0);
        } else if (name.match(/^Table \d+$/)) {
          var index = parseInt(name.split(' ')[1], 10) - 1;
          table = $('.content_container table').get(index);
        }
      }
      var parts = _.last(bits).split(':');
      var first = exports.coordsFromLabel(parts[0]),
        second;
      if (parts.length === 2) {
        second = exports.coordsFromLabel(parts[1]);
      }
      var topLeft, bottomRight;
      if (second) {
        // Get top left cell.
        topLeft = [
          first[0] < second[0] ? first[0] : second[0],
          first[1] < second[1] ? first[1] : second[1]
        ];
        bottomRight = [
          first[0] > second[0] ? first[0] : second[0],
          first[1] > second[1] ? first[1] : second[1]
        ];
      } else {
        topLeft = first;
        bottomRight = first;
      }
      var size = [
        bottomRight[0] - topLeft[0] + 1,
        bottomRight[1] - topLeft[1] + 1
      ];
      var data = [];
      var elemInTable = $(table).find('td, th')[0] || window._tmpElem;

      var x, y, elem, val;
      for (x = 0; x < size[0]; x++) {
        for (y = 0; y < size[1]; y++) {
          if (!data[x]) {
            data[x] = [];
          }
          elem = exports.posToElem(topLeft[0] + x, topLeft[1] + y,
            elemInTable);
          if (window._tmpElem && elem === window._tmpElem) {
            throw "Error: Cell can't select it's own content.";
          }
          val = $(elem).text();
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

    /**
     * Eval the content of a cell.
     * TODO: Move into a webworker to sandbox
     *
     * @param js {String} the cell contents to execute
     * @param elem {Element} the cell running the JS
     */
    evalJS: function(js, elem) {
      // Hack. :(
      window._tmpElem = elem;

      var c = exports.getCellData;
      var out;
      try {
        out = eval(js);
      } catch (e) {
        out = '!' + e;
      }
      delete window._tmpElem;
      return out;
    },

    /**
     * Run the nodes javascript and update it's text with the result.
     *
     * @param node {Element} the element to run
     */
    updateJS: function(node) {
      var data = $(node).data().content;
      if (data[0] === '=') {
        $(node).text(exports.evalJS(data.slice(1), node));
      }
    },

    /**
     * Execute all equations in a document.
     */
    updateAllJS: function() {
      var nodes = $('.content table td:data(content)');
      _.each(nodes, function(node) {
        exports.updateJS(node);
      });
    },

    /**
     * Make the currently selected element editable or not.
     *
     * @param edit {Boolean} whether the selected cell should be editable
     */
    selectedEditable: function(edit) {
      var style, contentEditable;
      if (edit) {
        contentEditable = true;
        style = 'dashed';
        var data = $(exports.selectedElem).data();
        if (data.content) {
          $(exports.selectedElem).text(data.content);
        }
      } else {
        contentEditable = 'inherit';
        style = 'solid';
        var text = $(exports.selectedElem).text();
        if (text[0] === '=') {
          $(exports.selectedElem).data('content', text);
        }
        exports.updateAllJS();
      }
      exports.selectedElem.contentEditable = contentEditable;
      $('#table_cursor').css({
        borderStyle: style,
        outlineStyle: style
      });
      $('#ribbon_buttons a:contains("Table")').click();
    },

    /**
     * Clear the table selection.
     */
    clearSelect: function() {
      if (exports.selected) {
        exports.selected = false;
        exports.selectedEditable(false);
        $('#table_cursor').offset({
          left: -10000
        });
        //exports.selectedElem.removeEventListener('DOMSubtreeModified', exports.observer);
        $(exports.selectedElem).off('.Tables');
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

    /**
     * The currently selected table.
     */
    table: null,

    /**
     * Runs enterTable or leaveTable depending.
     */
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

    /**
     * Handler for table enter that registers key and resize binds, and
     * updates the header and cursor.
     *
     * @param table {Element} the table being entered
     */
    enterTable: function(table) {
      $(document).on('keydown.TablesTemp', exports.keypressHandler);
      $('.content_container').delegate('resize.Tables', 'table', function() {
        exports.cursorUpdate();
        exports.headerUpdate();
      });
    },

    /**
     * Handler for table leave that unregisters the bindings.
     *
     * @param table {Element} the table being left
     */
    leaveTable: function(table) {
      $(table).unbind('.TablesTemp');
      $(table).undelegate('.TablesTemp');
      $(table).off('.TablesTemp');
      $(document).unbind('.TablesTemp');
      $(document).undelegate('.TablesTemp');
      $(document).off('.TablesTemp');
    },

    /**
     * Update the area selection.
     */
    updateSelectedArea: function() {
      $('.Table.axis th').removeClass('active');
      if (!exports.selected || exports.primaryTable() !== exports.primaryTable(exports.selectionEnd)) {
        $('#table_selection').hide();
        if (exports.selected) {
          $($('.Table.axis#x').children().children().children()[exports.selectedPos()[0]]).addClass('active');
          $($('.Table.axis#y').children().children()[exports.selectedPos()[1]]).children().addClass('active');
        }
      } else {
        var top, bottom, left, right;
        var end = exports.selectionEnd || exports.selectedElem;
        if (exports.selectionEnd && exports.selectionEnd !== exports.selectedElem) {
          var startBox = exports.selectedElem.getBoundingClientRect();
          var endBox = end.getBoundingClientRect();
          top = startBox.top < endBox.top ? startBox.top : endBox.top;
          bottom = startBox.bottom > endBox.bottom ? startBox.bottom : endBox.bottom;
          left = startBox.left < endBox.left ? startBox.left : endBox.left;
          right = startBox.right > endBox.right ? startBox.right : endBox.right;
          $('#table_selection').show().offset({
            left: left,
            top: top
          }).height(bottom - top - 2).width(right - left - 3);
        } else {
          $('#table_selection').hide();
        }
        // Set hidden selection area contents to mini-table.
        var selectionHtml = '<table><tbody>';
        var tposStart = exports.selectedPos();
        var tposEnd = exports.selectedPos(end);

        top = tposStart[1] < tposEnd[1] ? tposStart[1] : tposEnd[1];
        bottom = tposStart[1] > tposEnd[1] ? tposStart[1] : tposEnd[1];
        left = tposStart[0] < tposEnd[0] ? tposStart[0] : tposEnd[0];
        right = tposStart[0] > tposEnd[0] ? tposStart[0] : tposEnd[0];
        $('.Table.axis#x').children().children().children().slice(left, right + 1).addClass('active');
        $('.Table.axis#y').children().children().slice(top + 1, bottom + 2).children().addClass('active');

        var x, y;
        for (y = top; y <= bottom; y++) {
          selectionHtml += '<tr>';
          for (x = left; x <= right; x++) {
            selectionHtml += '<td>' + exports.posToElem(x, y).innerHTML + '</td>';
          }
          selectionHtml += '</tr>';
        }
        selectionHtml += '</tbody></table>';
        $('#table_clip').html(selectionHtml);
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

    /**
     * Set everything in the current selection to be ''.
     */
    emptySelection: function() {
      var end = exports.selectionEnd || exports.selectedElem;
      var tposStart = exports.selectedPos();
      var tposEnd = exports.selectedPos(end);

      var top = tposStart[1] < tposEnd[1] ? tposStart[1] : tposEnd[1];
      var bottom = tposStart[1] > tposEnd[1] ? tposStart[1] : tposEnd[1];
      var left = tposStart[0] < tposEnd[0] ? tposStart[0] : tposEnd[0];
      var right = tposStart[0] > tposEnd[0] ? tposStart[0] : tposEnd[0];

      var x, y, node;
      for (y = top; y <= bottom; y++) {
        for (x = left; x <= right; x++) {
          node = exports.selectedElem.parentElement.parentElement.children[y].children[x];
          node.innerHTML = '';
          $(node).data('content', null);
        }
      }
    },

    /**
     * Move cursor to the end of the content editable element (usually a cell or td).
     *
     * @param contentEditableElement {Element} the element to move cursor to the end of.
     */
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
      } else if (document.selection) { //IE 8 and lower
        range = document.body.createTextRange(); //Create a range (a range is a like the selection but invisible)
        range.moveToElementText(contentEditableElement); //Select the entire contents of the element with the range
        range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
        range.select(); //Select the range (make it the visible selection
      }
    },

    /**
     * Return the primary table associated with the element.
     *
     * @param elem {Element} the child element
     * @return {Element}
     */
    primaryTable: function(elem) {
      return $(elem || exports.selectedElem).parents('table')[0];
    },

    /**
     * Returns the element corresponding to the column, row coordinates in the
     * table with the element.
     *
     * @param x {Number} the column
     * @param y {Number} the row
     * @param elem {Element} an element in the table of interest.
     * @return {Element}
     */
    posToElem: function(x, y, elem) {
      if (!elem) {
        elem = exports.selectedElem;
      }
      return $(exports.primaryTable(elem)).find(':not(table) tr').eq(y).
      find('> td')[x];
    },

    /**
     * Return the position of the target element
     *
     * @param targetElement {Element} the element of interest
     * @return {Number[]} An array of column, row.
     */
    selectedPos: function(targetElem) {
      var child = (targetElem || exports.selectedElem);
      var column = 0;
      while ((child = child.previousElementSibling) !== null) {
        if (child.nodeName === 'TD' || child.nodeName === 'TH') {
          column++;
        }
      }
      child = (targetElem || exports.selectedElem).parentElement;
      var row = 0;
      while ((child = child.previousElementSibling) !== null) {
        if (child.nodeName === 'TR') {
          row++;
        }
      }
      return [column, row];
    },

    /**
     * Returns the table size in [column, row] counts.
     *
     * @return {Number[]} [column, row]
     */
    tableSize: function() {
      var rows = $(exports.primaryTable()).find(':not(table) tr');
      return [
        rows.first().find('> td').length,
        rows.length
      ];
    },

    /**
     * Returns the column label from the column number. Ex: '0' -> 'A'
     * http://stackoverflow.com/questions/8603480/how-to-create-a-function-that-converts-a-number-to-a-bijective-hexavigesimal
     *
     * @param a {Number} the column number
     * @return {String} the formated number
     */
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
        var nY = pos[1] + 1;
        if (nY >= size[1]) {
          nY -= 2;
        }
        var nSelected = exports.posToElem(pos[0], nY);
        $(exports.selectedElem).closest('tr').remove();
        exports.clearSelect();
        exports.cursorSelect(nSelected);
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
      var parentElem = $(exports.selectedElem).parent().parent();
      if (size[0] > 1) {
        var pos = exports.selectedPos();
        var nX = pos[0] + 1;
        if (nX >= size[0]) {
          nX -= 2;
        }
        var nSelected = exports.posToElem(nX, pos[1]);
        for (var i = 0; i < size[1]; i++) {
          $(parentElem).children('tr').eq(i).children('td').eq(pos[0]).remove();
        }
        exports.clearSelect();
        exports.cursorSelect(nSelected);
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
      var pos;
      if (exports.origX) {
        $(exports.active).width(e.pageX - exports.origX + exports.origWidth);
        pos = exports.selectedPos(exports.active);
        $(exports.posToElem(pos[0], 0)).width(e.pageX - exports.origX + exports.origWidth);
      }
      if (exports.origY) {
        $(exports.active).height(e.pageY - exports.origY + exports.origHeight);
        pos = exports.selectedPos(exports.active);
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
        var rows = nodes.filter('table').find('tr');
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
      if (!out.attrs) {
        out.attrs = {};
      }
      out.attrs[attr.nodeName] = attr.nodeValue;
    }
    var rows = $(obj).find(':not(table) tr');
    _.each(rows, function(row, i) {
      var height = $(row)[0].style.height;
      if (height) {
        out.heights[i] = height;
      }
      var columns = $(row).children('td');
      var rowOut = [];
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
        var cellOut = {};
        var contentJson = WS.DOMToJSON(data);
        if (!_.isEmpty(contentJson)) {
          cellOut.content = contentJson;
        }
        for (var attr, i = 0, attrs = cell.attributes, l = attrs.length; i < l; i++) {
          attr = attrs.item(i);
          // Ignore attribute if it's set by the table.
          if (attr.nodeName !== 'data-content' &&
            attr.nodeName !== 'contenteditable') {
            if (!cellOut.attrs) {
              cellOut.attrs = {};
            }
            cellOut.attrs[attr.nodeName] = attr.nodeValue;
          }
        }
        rowOut.push(cellOut);
      });
      out.data.push(rowOut);
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
