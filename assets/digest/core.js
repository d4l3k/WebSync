/*jslint browser: true*/
/*global $, define, rangy, _, Detector, WebSyncData, ace, WebSyncAuth, WebSocket, jsonpatch, openpgp, NProgress, fullScreenApi, requirejs, WS*/

/*
  WebSync: Core.js
  This is the core file that runs the WebSync editor.

  Copyright (c) 2014. All Rights reserved.

  Tristan Rice
  rice (at) outerearth (dot) net
  http://tristanrice.name/
*/

define('websync', ['crypto'], function(crypto) {
  'use strict';

  /**
   * This is the core of WebSync. Everything is stored under the WebSync object except for websocket authentication information which is under WebSyncAuth, and the main WebSyncData object.
   * @exports websync
   * @module websync
   */

  var WebSync, WS;

  var exports = {
    /** Provides a location for temporary data to be stored. */
    tmp: {},

    /** Websocket first connection? */
    webSocketFirstTime: true,

    /** Creates the websocket for communication. */
    webSocketStart: function() {
      var protocol = 'ws';
      var path = window.location.hostname + ':' + WebSyncAuth.websocketPort;
      if (window.location.protocol === 'https:') {
        protocol = 'wss';
        path = WebSyncAuth.websocketUrl;
      }
      WebSync.connection = new WebSocket(protocol + '://' + path + window.location.pathname);
      _.each(WebSync.webSocketCallbacks, function(f, n) {
        WebSync.connection[n] = f;
      });
    },

    /** Starts the diff interval on the JSON root */
    startDiffInterval: function() {
      WebSync.diffInterval = setInterval(WebSync.checkDiff, 500);
    },

    /** An object with all of the callbacks for a websocket connection. */
    webSocketCallbacks: {
      onopen: function() {
        $('nav').removeClass('no-connection');
        $(document).trigger('connection');
        $('#connection_msg').remove();
        $('#fatal_error').fadeOut();
        setTimeout(function() {
          if (WebSync.webSocketFirstTime) {
            WebSync.connection.sendJSON({
              type: 'auth',
              id: WebSyncAuth.id,
              key: WebSyncAuth.key
            });
          } else {
            exports.startDiffInterval();
            WebSync.connection.sendJSON({
              type: 'auth',
              id: WebSyncAuth.id,
              key: WebSyncAuth.key
            });
            WebSync.success('<strong>Success!</strong> Connection restablished.');
          }
        }, 100);
      },

      onclose: function(e) {
        console.log(e);
        if (WebSync.diffInterval) {
          clearInterval(WebSync.diffInterval);
          $('nav').addClass('no-connection');
          WebSync.error('<strong>Connection Lost!</strong> Server is currently unavailable.').get(0).id = 'connection_msg';
          WebSync.diffInterval = null;
          $(document).trigger('noconnection');
        } else {
          WebSync.fatalError('Failed to connect to backend.');
        }
        setTimeout(WebSync.webSocketStart, 2000);
      },
      onmessage: function(e) {
        var data = JSON.parse(e.data);
        console.log('MESSAGE', data);
        var events = WS.registeredMessageEvents[data.type];
        if (!_.isEmpty(events)) {
          _.each(events, function(e) {
            e(data);
          });
        }
        if (data.reqId && WS.backendCommandCallBacks[data.reqId]) {
          WS.backendCommandCallBacks[data.reqId](data);
          delete WS.backendCommandCallBacks[data.reqId];
        }
        if (data.type === 'scripts') {
          // Load scripts from server.
          require(data.js);
        } else if (data.type === 'data_patch') {
          if (WebSyncAuth.encrypted) {
            crypto.decryptWithSymmetricKey(data.patch, function(patch) {
              WS.applyJSONPatch(JSON.parse(patch));
            });
          } else {
            WS.applyJSONPatch(data.patch);
          }
        } else if (data.type === 'name_update') {
          $('#name').text(data.name);
        } else if (data.type === 'ping') {
          var hash = openpgp.crypto.hash.md5(window.stableStringify(WebSyncData));
          console.log('HASH', hash);
          WebSync.connection.sendJSON({
            type: 'ping',
            hash: hash
          });
        } else if (data.type === 'permissions') {
          $('#access_mode').val(data.visibility);
          $('#default_permissions').val(data.default_level);
          var users = $('#user_perms tbody');
          var html = '';
          _.each(data.users, function(user) {
            html += '<tr>';
            html += '<td>' + user.user_email + "</td><td><select class='form-control'";
            if (WebSync.clients[WebSyncAuth.id].email === user.user_email) {
              html += ' disabled';
            }
            html += '>';
            _.each(['viewer', 'editor', 'owner'], function(level) {
              html += "<option value='" + level + "'";
              if (level === user.level) {
                html += ' selected';
              }
              html += '>';
              html += level.charAt(0).toUpperCase() + level.slice(1);
              html += '</option>';
            });
            html += "</select></td><td><a class='btn btn-danger'";
            if (WebSync.clients[WebSyncAuth.id].email === user.user_email) {
              html += ' disabled';
            }
            html += "><i class='fa fa-trash-o visible-xs fa-lg'></i> <span class='hidden-xs'>Delete</span></a></td>";
            html += '</tr>';
          });
          users.html(html);
        } else if (data.type === 'blobs') {
          console.log(data);
          var table = $('#blobs tbody');
          var html = '';
          _.each(data.resources, function(resource) {
            html += '<tr>';
            html += "<td><a href='assets/" + window.escape(resource.name) + "'>" + resource.name + '</a></td>';
            html += '<td>' + resource.content_type + '</td>';
            html += '<td>' + resource.edit_time + '</td>';
            html += '<td>' + WebSync.byteLengthPretty(resource.octet_length) + '</td>';
            html += '</tr>';
          });
          table.html(html);
        } else if (data.type === 'config') {
          if (data.action === 'get') {
            var callback = WebSync._configCallbacks[data.id];
            if (callback) {
              callback(data.property, data.value, data.space);
              delete WebSync._configCallbacks[data.id];
            }
          }
        } else if (data.type === 'download_token') {
          window.location.pathname = '/' + window.location.pathname.split('/')[1] + '/download/' + data.token;
        } else if (data.type === 'error') {
          if (data.action === 'sync') {
            var elem = WebSync.error('<b>Error</b> ' + data.reason + ' Click to force changes.');
            $(elem).click(function() {
              $(this).hide();
              WebSync.info('Attempting to force changes...');
              WebSync.oldData = data.body;
              WebSync.oldDataString = JSON.stringify(data.body);
            });
          } else {
            WebSync.error(data.reason);
          }
        } else if (data.type === 'info') {
          WebSync.webSocketFirstTime = false;
          WebSync.loadScripts();
          WebSync.connection.sendJSON({
            type: 'config',
            action: 'get',
            property: 'public'
          });
          WebSync.clients = data.users;
          var toTrigger = {};
          $.each(WebSync.clients, function(k, v) {
            if (v.email === 'anon@websyn.ca') {
              WebSync.users[v.id] = {
                displayName: 'Anonymous'
              };
            } else if (!WebSync.users[v.id]) {
              toTrigger[v.id] = [k];
              $.ajax({
                url: 'https://secure.gravatar.com/' + v.id + '.json',
                dataType: 'jsonp',
                timeout: 2000
              }).done(function(data) {
                WebSync.users[v.id] = data.entry[0];
              }).complete(function() {
                _.each(toTrigger[v.id], function(item) {
                  $(document).trigger('client_load', {
                    client: item
                  });
                });
              });
              WebSync.users[v.id] = {};
            } else {
              if (!toTrigger[v.id]) {
                $(document).trigger('client_load', {
                  client: k
                });
              } else {
                toTrigger[v.id].push(k);
              }
            }
          });
        } else if (data.type === 'new_user') {
          WebSync.clients[data.id] = data.user;
          var userId = data.user.id;
          var clientId = data.id;
          console.log('NEW USER INFO', data);
          if (data.user.email === 'anon@websyn.ca') {
            WebSync.users[data.id] = {
              displayName: 'Anonymous'
            };
          }
          if (!WebSync.users[data.user.id]) {
            $.ajax({
              url: 'https://secure.gravatar.com/' + data.user.id + '.json',
              dataType: 'jsonp'
            }).done(function(data) {
              WebSync.users[userId] = data.entry[0];
              $(document).trigger('client_load', {
                client: clientId
              });
            }).fail(function() {
              $(document).trigger('client_load', {
                client: clientId
              });
            });
            WebSync.users[data.user.id] = {};
          } else {
            $(document).trigger('client_load', {
              client: data.id
            });
          }
        } else if (data.type === 'exit_user') {
          delete WebSync.clients[data.id];
          $(document).trigger('client_leave', {
            client: data.id
          });
        } else if (data.type === 'client_event') {
          var announceEvent = function(data) {
            $(document).trigger('client_event_' + data.event, {
              from: data.from,
              data: data.data
            });
          };
          if (WebSyncAuth.encrypted) {
            crypto.decryptWithSymmetricKey(data.encryptedBlob, function(blob) {
              var decrypted = JSON.parse(blob);
              decrypted.from = data.from;
              announceEvent(decrypted);
            });
          } else {
            announceEvent(data);
          }
        } else if (data.type === 'asset_list') {
          var row = $("<tr><td></td><td></td><td></td><td></td><td width='102px'><div class='switch' ><input type='checkbox' /></div></td></tr>");
          row.get(0).dataset.id = data.id;
          var children = row.children();
          children.get(0).innerText = data.name;
          children.get(1).innerText = data.description;
          children.get(2).innerText = data.url;
          children.get(3).innerText = data.atype;
          $('#assets tbody').append(row);
          $(children).find('input').bootstrapSwitch('state', ($("script[src='" + data.url + "']").length > 0), true);
        } else if (data.type === 'diff_list' && !data.reqId) {
          var processPatches = function(patches) {
            WebSync.patches = patches;
            _.each(WebSync.patches, function(patch) {
              var row = $("<tr><td></td><td></td><td></td><td><button class='btn btn-warning' data-id='" + patch.id + "'>Revert To</button></td></tr>");
              var children = row.children();
              children.get(0).innerText = patch.time;
              children.get(1).innerText = patch.patch;
              children.get(2).innerText = patch.user_email;
              $('#diffs tbody').prepend(row);
            });
          };
          // Decrypt all of the patches.
          if (WebSyncAuth.encrypted) {
            // Separate the encrypted and unencrypted patches if there are any.
            var patchesUnencrypted = _.filter(data.patches, function(patch) {
              return !_.include(patch.patch, 'BEGIN PGP MESSAGE');
            });
            var patchesEncrypted = _.filter(data.patches, function(patch) {
              return _.include(patch.patch, 'BEGIN PGP MESSAGE');
            });
            var patches = _.pluck(patchesEncrypted, 'patch');
            crypto.decryptWithSymmetricKey(patches, function(patches) {
              var decryptedWithMeta = _.map(patchesEncrypted, function(p, i) {
                p.patch = patches[i];
                return p;
              });
              var allPatches = patchesUnencrypted.concat(decryptedWithMeta);
              processPatches(allPatches);
            });
          } else {
            processPatches(data.patches);
          }
        }
      },
      onerror: function(e) {
        console.log(e);
      }

    },
    /**
     * Apply a JSON patch to the DOM.
     * @function
     * @param {JSON} patch - A JSON patch in the format of jsonpatch.
     */
    applyJSONPatch: function(patch) {
      WebSync.tmp.range = WebSync.selectionSave();
      $(document).trigger('data_patch', {
        patch: patch
      });
      // Make sure there aren't any outstanding changes that need to be sent before patching document.
      WebSync.checkDiff();
      jsonpatch.apply(WebSyncData, patch);
      if (WebSync.fromJSON) {
        WebSync.fromJSON(patch);
      }
      WebSync.oldDataString = JSON.stringify(WebSyncData);
      WebSync.oldData = JSON.parse(WebSync.oldDataString);
      $(document).trigger('patched');
      WebSync.selectionRestore(WebSync.tmp.range);
    },

    /**
     * Register events for the navbar small screen scrolling.
     */
    setupNavbarScrolling: function() {
      var $collapse = $('nav .collapse');
      var $ribbon = $('nav .ribbon');
      var updateButtons = function() {
        _.each([$collapse, $ribbon], function($container) {
          var left = $container.scrollLeft();
          if (left === 0) {
            $container.find('.scroll-btn.left').fadeOut(100);
          } else {
            $container.find('.scroll-btn.left').fadeIn(100);
          }
          var collapse = $container[0];
          if (collapse.scrollLeft + collapse.offsetWidth === collapse.scrollWidth) {
            $container.find('.scroll-btn.right').fadeOut(100);
          } else {
            $container.find('.scroll-btn.right').fadeIn(100);
          }
        });
      };
      $collapse.scroll(updateButtons);
      $ribbon.scroll(updateButtons);
      $(window).resize(updateButtons);
      updateButtons();
      _.delay(updateButtons, 1000);

      $('.scroll-btn').click(function() {
        var $parent = $(this).parent();
        var left = $parent.scrollLeft();
        if ($(this).hasClass('right')) {
          $parent.scrollLeft(left + $parent.width() - 80);
        } else {
          $parent.scrollLeft(left - $parent.width() - 80);
        }
      });
    },

    /** Message events handler location. */
    registeredMessageEvents: {},

    /**
     * Register an event for the websocket connection.
     * @function
     * @param {String} name
     * @param {Function} callback
     * @return {websync}
     */
    registerMessageEvent: function(name, callback) {
      var events = WS.registeredMessageEvents[name];
      if (!events) {
        WS.registeredMessageEvents[name] = [];
      }
      WS.registeredMessageEvents[name].push(callback);
      return WS;
    },
    /**
     * This function is used to output byte sizes in a more human understandable format.
     * @param {Integer} length - The number of bytes.
     * @return {String}
     */
    byteLengthPretty: function(length) {
      var UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
      var exponent = 0;
      if (length >= 1000) {
        var maxExp = UNITS.length;
        exponent = Math.floor(Math.log(length) / Math.log(1000));
        if (exponent > maxExp) {
          exponent = maxExp;
        }
        length /= Math.pow(1000, exponent);
      }
      var fix = 0;
      if (Math.floor(length) !== length) {
        fix = 1;
      }
      return length.toFixed(fix) + ' ' + UNITS[exponent];
    },

    /**
     * Converts an image element into a data uri.
     * Code taken from MatthewCrumley (http://stackoverflow.com/a/934925/298479)
     *
     * @param {Element} img - An image element to convert to a data string.
     * @return {String}
     */
    getImageDataURL: function(img) {
      // Create an empty canvas element
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      // Copy the image contents to the canvas
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Get the data-URL formatted image
      // Firefox supports PNG and JPEG. You could check img.src to guess the
      // original format, but be aware the using "image/jpg" will re-encode the image.
      var dataURL = canvas.toDataURL('image/png');

      return dataURL;
    },

    /**
     * Converts the contents of an element into a static HTML blob with data uri images.
     *
     * @param {Element} elem - The element to export.
     * @return {String} Static HTML
     */
    exportElements: function(elem) {
      var dom = $(elem).clone();
      _.each(dom.find('img'), function(img) {
        var $img = $(img);
        $img.css({
          'width': img.width,
          'height': img.height
        });
        $img.attr('src', WS.getImageDataURL(img));
      });
      /*
       * This converts all LaTeX equations into MathML. It would work great if anything supported it. :(
      var selector = '.mathquill-rendered-math';
      var equations = dom.find(selector);
      if (equations.length > 0) {
        $('body').append('<script src="/assets/display-latex.user.js"></script>');
        _.each(equations, function(equation) {
          var latex = $(equation).mathquill('latex');
          $(equation).text('$'+latex+'$');
          patch_element(equation);
          $(equation).attr('id', 'Object1');
          $(equation).find('math').attr('xmlns', 'http://www.w3.org/1998/Math/MathML');
          console.log(equation);
        });
      }
      */
      // Convert CSS into static element properties.
      var selector = '*';
      var elements = dom.find(selector);
      var realElements = $(elem).find(selector);
      _.each(elements, function(elem, i) {
        var eqn = realElements[i];
        var style = $(eqn).getStyleObject();
        var jsonStyle = {};
        _.each(style, function(key) {
          jsonStyle[key] = style[key];
        });
        $(elem).css(jsonStyle);
      });
      return dom.html();
    },

    /**
     * Upload a resource (usually a picture) using XHR.
     *
     * @param {File} file - the file to upload
     * @param {Function} progress - a callback for progress updates has signature (event, XMLHttpRequest).
     * @param {Function} done - a callback when the upload is done. Signature: (XMLHttpRequest)
     */
    uploadResource: function(file, progress, done) {
      var xhr = new XMLHttpRequest();
      if (xhr.upload) {
        $.ajax({
          type: 'POST',
          url: 'upload',
          xhr: function() {
            xhr.upload.onprogress = function(e) {
              progress(e, xhr);
            };
            return xhr;
          },
          beforeSend: function(xhr) {
            // here we set custom headers for the rack middleware, first one tells the Rack app we are doing
            // an xhr upload, the two others are self explanatory
            xhr.setRequestHeader('X-XHR-Upload', '1');
            xhr.setRequestHeader('X-File-Name', file.name || file.fileName);
            xhr.setRequestHeader('X-File-Size', file.fileSize);
          },
          complete: function(xhr, status) {
            done(xhr);
          },
          contentType: 'application/octet-stream',
          dataType: 'json',
          processData: false,
          data: file
        });
      }
    },

    /**
     * Returns the current selection.
     * @return {Object}
     */
    selectionSave: function() {
      // Get start selection.
      var sel = getSelection();
      var obj = {
        active: (sel.rangeCount > 0)
      };
      // If range, save it;
      if (sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        _.extend(obj, {
          startText: range.startContainer.nodeValue,
          startOffset: range.startOffset,
          endText: range.endContainer.nodeValue,
          endOffset: range.endOffset,
          startContainer: range.startContainer,
          endContainer: range.endContainer
        });
      }
      return obj;
    },

    /**
     * Restores a selection using the output from selectionSave.
     * @param {Object} sel - The selection to restore.
     */
    selectionRestore: function(sel) {
      if (sel.active) {
        // Find all #text nodes.
        var textNodes = $('.content').find(':not(iframe)').addBack().contents().filter(function() {
          return this.nodeType === 3;
        });
        var startNode, endNode;

        // Initialize Levenshtein distances to be sufficiently high.
        var endNodeDist = 99999;
        var startNodeDist = 99999;

        // Check to see if the original start and end nodes are still in the document.
        if ($(sel.startContainer).parents('body').length !== 0) {
          startNode = sel.startContainer;
          startNodeDist = 0;
        }
        if ($(sel.endContainer).parents('body').length !== 0) {
          endNode = sel.startContainer;
          endNodeDist = 0;
        }

        // Locate the start & end #text nodes based on a Levenstein string distance.
        if (sel.startText) {
          textNodes.each(function(index, node) {
            var dist = levenshteinenator(node.nodeValue, sel.startText);
            if (dist < startNodeDist) {
              startNode = node;
              startNodeDist = dist;
            }
            dist = levenshteinenator(node.nodeValue, sel.endText);
            if (dist < endNodeDist) {
              endNode = node;
              endNodeDist = dist;
            }
          });
        } else {
          // Fallback to setting selection at beginning of the document.
          var startOfDoc = $('.content [contenteditable]')[0];
          if (!startNode) {
            startNode = startOfDoc;
          }
          if (!endNode) {
            endNode = startOfDoc;
          }
        }
        // Update the text range.
        var range = document.createRange();
        range.setStart(startNode, sel.startOffset);
        range.setEnd(endNode, sel.endOffset);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }
    },

    /**
     * Broadcasts an event to other connected clients.
     * @param {String} event - The name of the event.
     * @param {Object} data - The data to send with the event.
     */
    broadcastEvent: function(event, data) {
      if (WebSyncAuth.encrypted) {
        var blob = JSON.stringify({
          event: event,
          from: WebSyncAuth.id,
          data: data
        });
        crypto.signAndEncryptWithSymmetricKey(blob, function(encryptedBlob) {
          WebSync.connection.sendJSON({
            type: 'client_event',
            encryptedBlob: encryptedBlob
          });
        });
      } else {
        WebSync.connection.sendJSON({
          type: 'client_event',
          event: event,
          data: data
        });
      }
    },

    /**
     * Configures the html exporter for document downloads.
     * @param {String} type - document, graphics, presentation, spreadsheet
     * @param {Function} export_to_html - A function that returns the HTML data.
     */
    setupDownloads: function(type, export_to_html) {
      var types = [
        ['Microsoft Word', 'docx'],
        ['PDF', 'pdf'],
        ['HTML', 'html'],
        ['Libre Office', 'odt'],
        ['Raw Text', 'txt']
      ];
      var buttons = '';
      _.each(types, function(docType) {
        buttons += "<li><a href='#' data-type='" + docType[1] + "'>" + docType[0] + ' (.' + docType[1] + ')</a></li>\n';
      });
      $('#download_types').html(buttons);
      $('#download_types a').click(function(e) {
        var exportType = $(this).data().type;
        console.log('Exporting:', exportType, type);
        WebSync.connection.sendJSON({
          type: 'export_html',
          docType: type,
          extension: exportType,
          data: export_to_html()
        });
      });
    },

    /** Stores the currently connected users. */
    users: {},

    /** Configuration callbacks */
    _configCallbacks: {},

    /**
     * Sends a request to the server to set config[key] to value.
     * This isn't really implemented on the backend. The canonical way to set parameters is to store it in WebSyncData.
     * @param {String} key - The key to set.
     * @param {Object} value - The value to set to the key.
     * @param {String} space - Space can be "user" or "document".
     */
    configSet: function(key, value, space) {
      if (space === null) {
        space = 'document';
      }
      WebSync.connection.sendJSON({
        type: 'config',
        action: 'set',
        property: key,
        value: value,
        space: space
      });
    },

    /** Sends a request to the server for the key value.
     * This isn't really implemented on the backend. The canonical way to set parameters is to store it in WebSyncData.
     * @param {String} key - The key to set.
     * @param {Object} value - The value to set to the key.
     * @param {String} space - Space can be "user" or "document".
     */
    configGet: function(key, callback, space) {
      var id = btoa(Date.now());
      if (callback) {
        WebSync._configCallbacks[id] = callback;
      }
      if (space === null) {
        space = 'document';
      }
      WebSync.connection.sendJSON({
        type: 'config',
        action: 'get',
        property: key,
        space: space,
        id: id
      });
    },

    /** This is where registerDOMException stores it's internal data. You probably shouldn't modify this directly. */
    domExceptions: {},

    /**
     * This registers outside functions to handle the serialization & parsing of certain elements. Used for modifyable content that can't be serialized directly to HTML. Ex: the equation plugin.
     * @param {String} watchQuery - A query to watch elements.
     * @param {Function} exportFunc - A function to serialize the excepted element.
     * @param {Function} importFunc - A function to deserialize the excepted element.
     */
    registerDOMException: function(watchQuery, exportFunc, importFunc) {
      WebSync.domExceptions[watchQuery] = {
        dump: exportFunc,
        load: importFunc
      };
    },

    // Function: void WebSync.unregisterDOMException(string Class);
    /**
     * Stops monitoring certain queries.
     * @param {String} watchQuery - A query to watch elements.
     */
    unregisterDOMException: function(watchQuery) {
      delete WebSync.domExceptions[watchQuery];
    },

    /** This is the current visual mode. This can be either 'zen' or 'normal' */
    viewMode: 'normal',

    /** This tells you if the menu ribbon is visible or not. In zen mode it can disappear. */
    menuVisible: true,

    /**
     * Sets the zoom level on the document.
     * @param {Float} zoom - A number representing the current zoom level. Ex. 1.0 == 100%
     */
    setZoom: function(zoom) {
      WebSync.zoom = zoom;
      $('#zoom_level').data('slider').setValue(zoom * 100);
      var container = $('.content_container');
      container.css({
        'transform': 'scale(' + zoom + ')'
      });
      WebSync.updateOrigin();
      $(document).trigger('zoom');
    },

    /**
     * Triggers an update for the menu and the current view mode on url change.
     */
    urlChange: function() {
      var current = window.location.pathname.split('/')[2].toLowerCase();
      if (current === 'zen') {
        $('#view_mode').val('Zen');
      } else if (current === 'view') {
        $('#view_mode').val('Presentation');
      } else {
        $('#view_mode').val('Normal');
      }
      WebSync.updateViewMode(null, true);
    },

    /**
     * Triggers an update of the current view mode.
     * @param {Event} e - The event that triggered the change in view.
     * @param {Boolean} dontPush - Controls whether the change is put into history or not.
     */
    updateViewMode: function(e, dontPush) {
      var mode = $('#view_mode').val();
      WebSync.viewMode = mode;
      fullScreenApi.cancelFullScreen();
      if (mode === 'Zen') {
        $('body').removeClass('presentation').addClass('zen').resize();
        WebSyncAuth.viewOp = 'edit';
        if (!dontPush) {
          window.history.pushState('', 'WebSync - Zen Mode', 'zen');
        }
        $('body').addClass('zen').resize();
        $('#zoom_level').data('slider').setValue(120);
        $('#zoom_level').trigger('slide');
        $('nav').animate({
          top: -96
        }, 200);
        $('.content_well').animate({
          top: 0
        }, 200);
      } else if (mode === 'Presentation') {
        $('body').removeClass('edit').removeClass('zen').addClass('view').resize();
        WebSyncAuth.viewOp = 'view';
        if (!dontPush) {
          window.history.pushState('', 'WebSync - Presentation Mode', 'view');
        }
        $('nav').animate({
          top: -96
        }, 200);
        $('.content_well, .sidebar').animate({
          top: 0
        }, 200);
        fullScreenApi.requestFullScreen(document.body);
      } else {
        $('body').removeClass('zen').removeClass('view').addClass('edit').resize();
        WebSyncAuth.viewOp = 'edit';
        if (!dontPush) {
          window.history.pushState('', 'WebSync - Edit Mode', 'edit');
        }
        $('#zoom_level').data('slider').setValue(100);
        $('#zoom_level').trigger('slide');
        $('nav').animate({
          top: 0
        }, 200);
        $('.content_well, .sidebar').animate({
          top: 96
        }, 200);
      }
      $(document).trigger('viewmode');
    },

    /** This updates the ribbon buttons based on the content in the ribbon bar. TODO: Use registration system & persist menu between updates. */
    updateRibbon: function() {
      var menuButtons = '';
      var active = $('#ribbon_buttons .active').text();
      $('.ribbon .container').each(function() {
        menuButtons += '<li' + (this.id === active ? ' class="active"' : '') + '><a>' + this.id + '</a></li>';
      });
      $('#ribbon_buttons').html(menuButtons);
      $('#ribbon_buttons li').click(function() {
        $('#ribbon_buttons li').removeClass('active');
        $(this).addClass('active');
        $('.ribbon .container').hide();
        $('#' + $(this).text()).show();
      });
      if (active === '') {
        $('#ribbon_buttons li:contains(Text)').click();
      }
    },

    /** A storage element for backend command callbacks. */
    backendCommandCallBacks: {},

    /**
     * Execute a backend command with an object and a callback.
     * @param {Object} obj - The json object containing the command.
     * @param {Function} callback - The callback to the function.
     */
    backendCommand: function(obj, callback) {
      var id = btoa(Math.random());
      obj.reqId = id;
      WebSync.connection.sendJSON(obj);
      WS.backendCommandCallBacks[id] = callback;
    },

    /** Checks server for plugin scripts to load. */
    loadScripts: function() {
      WebSync.connection.sendJSON({
        type: 'load_scripts'
      });
    },

    /** Event handler for when the window resizes. This is an internal method. */
    resize: function() {
      //$(".content_well").height(window.innerHeight-$(".content_well").position().top);
      $('.arrow').offset({
        left: $('#settingsBtn').parent().offset().left + 13
      });
      $('.settings-popup .popover-content').css({
        maxHeight: window.innerHeight - $('.settings-popup').offset().top - 100
      });
      WebSync.updateRibbon();
      WebSync.updateOrigin();
    },

    /** Changes the transform origin based on the content_container dimensions. */
    updateOrigin: function() {
      var container = $('.content_container');
      if (container.width() > container.parent().width() || container.parent().get(0) && container.parent().get(0).scrollWidth - 2 > container.parent().width()) {
        container.addClass('left').css({
          'margin-left': 'initial'
        });
        // TODO: Center zoomed out
      } else {
        container.removeClass('left');
        container.css({
          'margin-left': 'auto'
        });
      }
    },

    /** This is an internal method that executes every couple of seconds while the client is connected to the server. It checks to see if there have been any changes to document. If there are any changes it sends a message to a Web Worker to create a patch to transmit. */
    checkDiff: function() {
      if (!WebSync.oldData) {
        WebSync.oldDataString = JSON.stringify(WebSyncData);
        WebSync.oldData = JSON.parse(WebSync.oldDataString);
      }
      if (WebSync.toJSON) {
        WebSync.toJSON();
      }
      var stringWebSync = JSON.stringify(WebSyncData);
      if (stringWebSync !== WebSync.oldDataString) {
        var patches = jsonpatch.compare(WebSync.oldData, WebSyncData);
        if (WebSyncAuth.access === 'viewer' && patches.length > 0) {
          if (!WS.tmp.permissionAlerted) {
            WebSync.error("<b>Error</b> You don't have permission to make changes.");
            WS.tmp.permissionAlerted = true;
          }
        } else if (patches.length > 0) {
          console.log('DIFF', patches);
          $(document).trigger('diffed');
          if (WebSyncAuth.encrypted) {
            crypto.signAndEncryptWithSymmetricKey(JSON.stringify(patches), function(patch) {
              WebSync.connection.sendJSON({
                type: 'data_patch',
                encrypted: true,
                patch: patch
              });
            });
          } else {
            WebSync.connection.sendJSON({
              type: 'data_patch',
              patch: patches
            });
          }
          WebSync.oldDataString = stringWebSync;
          WebSync.oldData = JSON.parse(stringWebSync);
        }
      }
    },

    /**
     * Inserts a DOM element at selection cursor. This is probably going to be deprecated.
     * @param {Element} node - The DOM element to insert at cursor.
     */
    insertAtCursor: function(node) {
      node = node.get(0);
      var sel, range;
      if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
          range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(node);
        }
      } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().html = node;
      }
    },

    /**
     * Returns the calculated CSS for the current selection. Warning: This can cause the client to run slowly if used too much.
     * @return {Object}
     */
    getCss: function() {
      /*WebSync.applier.toggleSelection();
      if($(".tmp").length==0) return {};
      return $(".tmp").removeClass("tmp").getStyleObject();*/
      var selection = getSelection();
      if (selection.type === 'None') {
        return {};
      }
      var selNode = getSelection().baseNode.parentNode;
      if (WebSync.tmp.lastSelNode === selNode) {
        return WebSync.tmp.lastSelCss;
      } else {
        var cssObject = $(selNode).getStyleObject();
        WebSync.tmp.lastSelCss = cssObject;
        WebSync.tmp.lastSelNode = selNode;
        return cssObject;
      }
    },

    /**
     * Applies css to the selection. Uses jQuery css object format. Warning: This is rather slow and shouldn't be overly used.
     * @param {Object} css - An object with parameters corresponding to the jQuery 'css' function.
     */
    applyCssToSelection: function(css) {
      WebSync.applier.toggleSelection();
      $('.tmp').css(css).removeClass('tmp');
    },

    /**
     * Displays an alert message in the lower right hand corner of the window.
     * @param {String} message - The message to display.
     */
    alert: function(msg) {
      return WebSync.alertMessage(msg, 'alert-warning');
    },

    /**
     * Displays an error message in the lower right hand corner of the window.
     * @param {String} message - The message to display.
     */
    error: function(msg) {
      return WebSync.alertMessage(msg, 'alert-danger');
    },

    /**
     * Displays a success message in the lower right hand corner of the window.
     * @param {String} message - The message to display.
     */
    success: function(msg) {
      return WebSync.alertMessage(msg, 'alert-success');
    },
    /**
     * Displays an info message in the lower right hand corner of the window.
     * @param {String} message - The message to display.
     */
    info: function(msg) {
      return WebSync.alertMessage(msg, 'alert-info');
    },

    /**
     * Displays an message in the lower right hand corner of the window with css classes.
     * @param {String} message - The message to display.
     * @param {String} classes - The classes to add to the alert.
     */
    alertMessage: function(msg, classes) {
      var div = $('<div class="alert ' + classes + '"><a class="close" data-dismiss="alert">&times;</a>' + msg + '</div>');
      $('#alert_well').prepend(div);
      setTimeout(function() {
        div.alert('close');
      }, 10000);
      return div;
    },

    /**
     * Displays a large error banner. Should only be displayed for unrecoverable or interface blocking errors.
     * @param {String} message - The message to display.
     */
    fatalError: function(msg) {
      if (msg) {
        $('#error_message').text(msg);
      }
      $('#fatal_error').fadeIn();
    },

    /** Hides the fatal error banner. */
    fatalHide: function() {
      $('#fatal_error').fadeOut();
    },

    /**
     * Returns the object matching the path in WebSyncData
     * @param {String} path - This is a JSON path. Ex: '/body/0/banana'
     * @return {Object}
     */
    getJsonFromPath: function(path) {
      var parts = path.split('/');
      var cur = WebSyncData;
      _.each(parts.slice(1), function(part) {
        cur = cur[part];
      });
      return cur;
    },

    /**
     * Applies patches directly to the HTML.
     * @param {Array} patch - The list of changes.
     * @param {String} root - The path of the base of the JSON html. Ex: '/body/'.
     * @param {Element} rootDom - The root DOM element.
     */
    applyPatch: function(patch, root, rootDom) {
      var dom = rootDom.childNodes;
      var exemptions = {};
      _.each(patch, function(change) {
        if (change.path.indexOf(root) === 0) {
          var localPath = change.path.slice(root.length);
          var parts = localPath.split('/');
          console.log('CHANGE', change);

          // Walk the path and see if any of the parent nodes are exempt.
          var exemptJson, exemptPath;
          _.each(parts, function(part, i) {
            if (!exemptPath) {
              var checkPath = root + parts.slice(0, i + 1).join('/');
              var json = WS.getJsonFromPath(checkPath);
              if (json && json.exempt) {
                exemptJson = json;
                exemptPath = checkPath;
              }
            }
          });
          // Exemption (JS plugins that don't use pure HTML)
          if (exemptPath) {
            console.log('EXEMPT', change);
            // Only want to act on an exemption once per patch set.
            if (!exemptions[exemptPath]) {
              var cur = dom;
              var localExemptPath = exemptPath.slice(root.length);
              var exemptParts = localExemptPath.split('/');
              _.each(exemptParts, function(part) {
                cur = cur[part];
              });
              var html = WebSync.domExceptions[exemptJson.exempt].load(exemptJson.data);
              $(cur).replaceWith(html);
              exemptions[exemptPath] = true;
            }
            // Replace a property
          } else if (change.op === 'replace') {
            var cur = dom;
            _.each(parts.slice(0, -1), function(part) {
              cur = cur[part];
            });
            var last = parts.slice(-1)[0];

            // Change #text
            if (last === 'textContent') {
              cur[last] = change.value;

              // Change tag name.
            } else if (last === 'nodeName') {
              var parent = cur.parentNode;
              var el;
              if (change.value === '#text') {
                el = document.createTextNode('');
              } else {
                el = document.createElement(change.value);
                var attrs = cur.attributes;
                if (attrs) {
                  var j = 0,
                    k = attrs.length;
                  for (j = 0; j < k; j++) {
                    el.setAttribute(attrs[j].name, attrs[j].value);
                  }
                }
                el.innerHTML = cur.innerHTML;
              }
              parent.replaceChild(el, cur);

              // Change a property. Eg. "style"
            } else {
              $(cur).attr(last, change.value);
            }

            // Remove a property/element
          } else if (change.op === 'remove') {
            var cur = dom;
            _.each(parts.slice(0, -1), function(part) {
              cur = cur[part];
            });
            var last = parts.slice(-1)[0];
            // Remove #text
            if (last === 'textContent') {
              cur[last] = '';

              // Remove all children
            } else if (last === 'childNodes') {
              cur.innerHTML = '';

              // Remove if a DOM element that responds to .remove()
            } else if (cur[last] && cur[last].remove) {
              cur[last].remove();

              // Remove all properties for an EXEMPT item.
            } else if (last === 'exempt') {
              cur.innerHTML = '';
              var attrs = cur.attributes;
              var i;
              for (i = attrs.length - 1; i >= 0; i--) {
                $(cur).attr(attrs[i].name, null);
              }
            }

            // Add a property or element.
          } else if (change.op === 'add') {
            var cur = dom;
            var tree = [rootDom, dom];
            _.each(parts.slice(0, -1), function(part) {
              cur = cur[part];
              tree.push(cur);
            });
            var last = parts.slice(-1)[0];
            // Add #text
            if (last === 'textContent') {
              cur[last] = change.value;

              // Add child elements
            } else if (last === 'childNodes') {
              cur.innerHTML += WS.JSONToDOM(change.value);

              // Add a single DOM element
            } else if (parts.slice(-2, -1)[0] === 'childNodes' && !_.isArray(change.value)) {
              var parent = tree.slice(-2, -1)[0];
              parent.innerHTML += WS.JSONToDOM([change.value]);

              // Add a single DOM element (TODO: confirm the difference from above).
            } else if (!_.isArray(change.value)) {
              if (parts.length === 1) {
                rootDom.innerHTML += WS.JSONToDOM([change.value]);
              } else {
                cur.innerHTML += WS.JSONToDOM([change.value]);
              }
            }
          } else {
            console.log('UNKNOWN PATCH TYPE', patch);
          }
        }
      });
    },

    /**
     * Converts a DOM node into a JSON object.
     * @param {Node} node - The DOM node.
     * @return {Object}
     */
    NODEtoJSON: function(obj) {
      var jso = {
        nodeName: obj.nodeName,
        childNodes: []
      };
      var exempt = null;
      if (WebSync.domExceptions[obj.nodeName]) {
        exempt = obj.nodeName;
      } else if (WebSync.domExceptions['#' + obj.id]) {
        exempt = '#' + obj.id;
      } else {
        _.each(obj.classList, function(cl) {
          if (WebSync.domExceptions['.' + cl]) {
            exempt = '.' + cl;
          }
        });
      }
      if (exempt) {
        delete jso.childNodes;
        jso.exempt = exempt;
        jso.data = WebSync.domExceptions[exempt].dump(obj);
        return jso;
      }
      var searchChildren = true;
      if (_.size(obj.dataset) > 0) {
        jso.dataset = {};
        _.each(obj.dataset, function(v, k) {
          jso.dataset[k] = v;
        });
        if (jso.dataset.searchChildren === 'false') {
          searchChildren = false;
        }
      }
      if (obj.nodeName === '#text') {
        jso.textContent = obj.textContent;
      }
      if (obj.attributes) {
        _.each(obj.attributes, function(v) {
          // TODO: Add blacklist of classnames & attributes for DOM serialization.
          if (v.name !== 'contenteditable' && v.name.indexOf('data-') !== 0) {
            jso[v.name] = v.value;
          }
        });
      }
      if (searchChildren) {
        _.each(obj.childNodes, function(child) {
          jso.childNodes.push(WS.NODEtoJSON(child));
        });
      }
      if (_.isEmpty(jso.childNodes)) {
        delete jso.childNodes;
      }
      return jso;
    },

    /**
     * Converts an array of DOM elements/nodes into an JSON object.
     * @object {Array} nodes - An array of DOM nodes.
     * @return {Object}
     */
    DOMToJSON: function(obj) {
      var jso = [];
      _.each(obj, function(elem) {
        elem.normalize();
        jso.push(WebSync.NODEtoJSON(elem));
      });
      return jso;
    },

    /**
     * Converts text into an alpha numeric string. Ex. 'a-**#(19' -> 'a19'
     * @param {String} text - The text to convert
     * @return {String}
     */
    alphaNumeric: function(text) {
      var match = text.match(/[a-zA-Z0-9\-]+/g);
      if (!match) {
        return null;
      }
      return match.join('');
    },

    /**
     * Converts a JSON object into an HTML string. The JSON object should be in the format produced by NODEToJSON.
     * @param {Object} obj - The JSON object to convert.
     * @return {String}
     */
    NODEtoDOM: function(obj) {
      var html = '';
      // Some basic cross site scripting attack prevention.
      var name = obj.nodeName || obj.name || '';
      if (name === '#text') {
        return _.escape(obj.textContent);
      }
      name = WebSync.alphaNumeric(name);
      // TODO: Potentially disallow iframes!
      // TODO: Potentially allow script tags. XHR requests are blocked by default now.
      if (name === null || name === 'script') {
        return '';
      }
      if (obj.exempt && WebSync.domExceptions[obj.exempt]) {
        return WebSync.domExceptions[obj.exempt].load(obj.data);
      }
      html += '<' + name;
      var dataVars = [];
      _.each(obj, function(v, k) {
        if (k !== 'nodeName' && k !== 'textContent' && k !== 'childNodes' && k !== 'dataset') {
          k = WS.alphaNumeric(k.trim());
          if (k.toLowerCase().indexOf('on') !== 0) {
            if (k.toLowerCase().indexOf('data-') === 0) {
              dataVars.push(k);
            }
            html += ' ' + k + '="' + v + '"';
          }
        }
      });
      if (obj.dataset) {
        _.each(obj.dataset, function(v, k) {
          k = WS.alphaNumeric(k.trim());
          if (dataVars.indexOf('data-' + k) === -1) {
            html += ' data-' + WS.alphaNumeric(k) + '=' + JSON.stringify(v);
          }
        });
      }
      if (name.toLowerCase() === 'br') {
        html += '/>';
      } else {
        html += '>';
        if (obj.childNodes) {
          _.each(obj.childNodes, function(elem) {
            html += WS.NODEtoDOM(elem);
          });
        }
        html += '</' + name + '>';
      }
      return html;
    },

    /**
     * Converts a JSON array into a HTML string. The JSON object should be in the format produced by DOMToJSON.
     * @param {Array} nodes - The JSON objects to convert.
     * @return {String}
     */
    JSONToDOM: function(obj) {
      var html = '';
      _.each(obj, function(elem) {
        html += WebSync.NODEtoDOM(elem);
      });
      return html;
    },

    /** A function that is called when all the RequireJS modules are loaded. */
    modulesLoaded: function() {
      if (WebSyncAuth.encrypted) {
        crypto.checkKeys(function() {
          var success = crypto.decodeSymmetricKeys(WebSyncAuth.symmetricKeys);
          if (success) {
            crypto.decryptWithSymmetricKey(WebSyncData.encryptedBlob, function(blob) {
              var newBody = JSON.parse(blob);
              WebSync.backendCommand({
                type: 'diffs',
                action: 'list',
                after: newBody.encryptionDate
              }, function(diffs) {
                // Get rid of any unencrypted patches since they may be malicious or old.
                var patches = _.filter(_.pluck(diffs.patches, 'patch'), function(patch) {
                  return _.include(patch, 'BEGIN PGP MESSAGE');
                });
                crypto.decryptWithSymmetricKey(patches, function(decrypted) {
                  _.each(decrypted, function(patch) {
                    jsonpatch.apply(newBody, JSON.parse(patch));
                  });
                  window.WebSyncData = newBody;
                  delete WebSync.oldData;
                  $(document).trigger('modules_loaded');
                });
              });
            });
          } else {
            WS.error('ERROR: Unable to decrypt the symmetric key!');
          }
        });
      } else {
        $(document).trigger('modules_loaded');
      }
    }
  };
  WebSync = WS = exports;

  // Initialize
  NProgress.start();
  WS.webSocketStart();

  $(document).on('modules_loaded', exports.startDiffInterval);

  // Disable Mozilla built in resizing for tables and images.
  document.execCommand('enableObjectResizing', false, 'false');
  document.execCommand('enableInlineTableEditing', false, 'false');

  WebSync.setupNavbarScrolling();

  $("#settingsBtn, [href='#permissions']").click(function() {
    WebSync.connection.sendJSON({
      type: 'permission_info'
    });
  });
  $("#settingsBtn, [href='#blobs']").click(function() {
    WebSync.connection.sendJSON({
      type: 'blob_info'
    });
  });
  $('#user_perms').delegate('select', 'change', function(e) {
    var email = $(this).parents('td').prev().text();
    var choice = $(e.target).val();
    WebSync.connection.sendJSON({
      type: 'share',
      email: email,
      level: choice
    });
  });
  $('#user_perms').delegate('a', 'click', function() {
    var email = $(this).parents('tr').children().first().text();
    WebSync.connection.sendJSON({
      type: 'share',
      email: email,
      level: 'delete'
    });
    setTimeout(function() {
      WebSync.connection.sendJSON({
        type: 'permission_info'
      });
    }, 100);
  });
  $('#share_with').click(function() {
    var email = $('#share_email').val();
    WebSync.connection.sendJSON({
      type: 'share',
      email: email,
      level: 'viewer'
    });
    setTimeout(function() {
      WebSync.connection.sendJSON({
        type: 'permission_info'
      });
    }, 100);
    $('#share_email').val('');
  });
  $('#access_mode, #default_permissions').change(function() {
    if (WebSyncAuth.access === 'owner') {
      WebSync.connection.sendJSON({
        type: 'default_permissions',
        visibility: $('#access_mode').val(),
        default_level: $('#default_permissions').val()
      });
    } else {
      WebSync.error('Invalid permissions.');
    }
  });
  $('#name').blur(function() {
    var name = $(this).text();
    document.title = name + ' - WebSync';
    WebSync.connection.sendJSON({
      type: 'name_update',
      name: name
    });
  });
  $('#name').keydown(function(e) {
    e.stopPropagation();
  });
  $('#name').focus(function() {
    if (this.innerText.indexOf('Unnamed') === 0) {
      setTimeout(function() {
        document.execCommand('selectAll');
      }, 100);
    }
  });
  $('.settings-popup #config').delegate('button', 'click', function() {
    $(this.parentElement.children[0]).prop('disabled', function(u, val) {
      return !val;
    });
    $(this).toggleClass('active');
  });
  $('nav, .content_well').bind('mousedown selectstart', function(e) {
    if (e.target.tagName !== 'SELECT') {
      return false;
    }
  });
  $('#name, #permissions input[type=text]').bind('mousedown selectstart', function(e) {
    e.stopPropagation();
  });
  $('#zoom_level').slider().on('slide', function() {
    WebSync.setZoom($('#zoom_level').data('slider').getValue() / 100.0);

  });
  $('body').mousemove(function(e) {
    if (WebSync.viewMode === 'Zen') {
      if (e.pageY < 85 && !WebSync.menuVisible) {
        $('nav').animate({
          top: 0
        }, 200);
        WebSync.menuVisible = true;
      } else if (e.pageY > 85 && WebSync.menuVisible) {
        $('nav').animate({
          top: -96
        }, 200);
        WebSync.menuVisible = false;
      }
    }
  });
  if (WebSyncAuth.access === 'viewer') {
    $('body').addClass('noedit');
  }
  WebSync.urlChange();
  $(window).bind('popstate', WebSync.urlChange);
  $('#view_mode').change(WebSync.updateViewMode);
  $('.present').click(function() {
    $('#view_mode').val('Presentation');
    WebSync.updateViewMode();
  });
  $('.return').click(function() {
    $('#view_mode').val('Normal');
    WebSync.updateViewMode();
  });
  $('.fullscreen').click(function() {
    if (fullScreenApi.isFullScreen()) {
      fullScreenApi.cancelFullScreen();
    } else {
      fullScreenApi.requestFullScreen(document.body);
    }
  });
  require(['edit']);
  WS.updateRibbon();
  rangy.init();
  $('#settingsBtn').click(function() {
    $(this.parentElement).toggleClass('active');
    $('.settings-popup').toggle();
    WebSync.resize();
  });
  $('.settings-popup .close').click(function() {
    $($('#settingsBtn').get(0).parentElement).toggleClass('active');
    $('.settings-popup').toggle();
  });
  $('.settings-popup #diffs').delegate('button', 'click', function() {
    var patches = [];
    var id = parseInt($(this).data('id'), 10);
    // TODO: Tree based patches.
    var i;
    for (i = 0; i < WebSync.patches.length; i++) {
      patches.push(WebSync.patches[i]);
      if (WebSync.patches[i].id === id) {
        i = WebSync.patches.length;
      }
    }
    console.log(patches.length);
    var newBody = {
      body: []
    };
    _.each(patches, function(patch) {
      try {
        jsonpatch.apply(newBody, JSON.parse(patch.patch));
      } catch (e) {
        console.log('BAD PATCH!', e);
      }
    });
    console.log(newBody);
    _.each(WebSyncData, function(v, k) {
      delete WebSyncData[k];
    });
    _.each(newBody, function(v, k) {
      WebSyncData[k] = v;
    });
    window.WebSyncData = newBody;
    if (WebSync.fromJSON) {
      WebSync.fromJSON();
    }
    WebSync.checkDiff();
  });
  $("a[href='#assets']").click(function() {
    $('#assets tbody').html('');
    WebSync.connection.sendJSON({
      type: 'assets',
      action: 'list'
    });
  });
  $('.tab-pane#assets').delegate('.switch', 'switchChange.bootstrapSwitch', function(e, data) {
    var id = $(e.target).parents('tr').data().id;
    var url = $(e.target).parents('tr')[0].children[2].innerText;
    WebSync.connection.sendJSON({
      type: 'assets',
      action: (data ? 'add' : 'delete'),
      id: id
    });
    if (data) {
      require([url]);
    } else {
      require(url).disable();
      requirejs.undef(url);
    }
  });
  $("a[href='#diffs']").click(function() {
    $('#diffs tbody').html('');
    WebSync.connection.sendJSON({
      type: 'diffs',
      action: 'list'
    });
  });
  $(document).on('online', function() {
    NProgress.done();
  });
  WS.applier = rangy.createCssClassApplier('tmp');
  // TODO: Better polyfil for firefox not recognizing -moz-user-modify: read-write
  WS.resize();
  $(window).resize(WS.resize);
  //this.setupWebRTC();
  clearTimeout(window.initError);
  window.initError = true;

  return exports;
});

/**
 * Helper method for sending JSON over a WebSocket.
 * @param {object} json - The JSON to send over the WebSocket.
 */
WebSocket.prototype.sendJSON = function(object) {
  this.send(JSON.stringify(object));
};

/**
 * Helper method to capitalize a String.
 * @return {String}
 */
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// load template if not found
if (window.JST === undefined) {
  window.JST = {};
}
window.JST.get = function(template) {
  if (window.JST[template] === undefined) {
    $('body').append('<script src="/assets/' + template + '.js?body=1"></script>');
  }
  return window.JST[template];
};

(function() {
  var done = false;
  // This is used to know when all modules are loaded. It uses a sketchy internal function subject to change.
  requirejs.onResourceLoad = function() {
    if (done) {
      return;
    }
    var requirejs_context = requirejs.s.contexts._;
    var loaded = 0;
    var total = 0;
    _.each(requirejs_context.urlFetched, function(fetched, script) {
      if (fetched && requirejs_context.defined[script]) {
        loaded += 1;
      }
      total += 1;
    });
    if (loaded === total && total > 0) {
      WS.modulesLoaded();
      done = true;
    }
  };
  // Configure RequireJS. TODO: Make sure relative requires actually work.
  requirejs.config({
    baseUrl: '/assets'
  });
  // Load and initialize WebSync.
  require(['websync'], function(websync) {
    window.WebSync = window.WS = websync;
  });
}());
