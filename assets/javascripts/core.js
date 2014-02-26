/*
    WebSync: Core.js
    This is the core file that runs the WebSync editor.

    Copyright (c) 2014. All Rights reserved.

    Tristan Rice
    rice (at) outerearth (dot) net
    http://tristanrice.name/
*/
// Variable: object WebSync;
// This is the core of WebSync. Everything is stored under the WebSync object except for websocket authentication information which is under WebSyncAuth, and the main WebSyncData object.
define('websync', {
    // Variable: object WebSync.tmp;
    // Provides a location for temporary data to be stored.
    tmp: {},
    // Variable: boolean WebSync.webSocketFirstTime;
    // Websocket first connection?
    webSocketFirstTime: true,
    // Function: void WebSync.webSocketStart();
    // Creates the websocket for communication.
    webSocketStart: function() {
        var protocol = 'ws';
        var path = window.location.hostname + ':' + WebSyncAuth.websocket_port;
        if (window.location.protocol == 'https:') {
            protocol = 'wss';
            path = WebSyncAuth.websocket_url;
        }
        WebSync.connection = new WebSocket(protocol + "://" + path + window.location.pathname);
        WebSync.connection.onopen = WebSync.webSocketCallbacks.onopen;
        WebSync.connection.onclose = WebSync.webSocketCallbacks.onclose;
        WebSync.connection.onmessage = WebSync.webSocketCallbacks.onmessage;
        WebSync.connection.onerror = WebSync.webSocketCallbacks.onerror;
    },
    // Variable: object WebSync.webSocketCallbacks;
    // An object with all of the callbacks for a websocket connection.
    webSocketCallbacks: {
        onopen: function(e) {
            console.log(e);
            WebSync.diffInterval = setInterval(WebSync.checkDiff, 1000);
            $("nav").removeClass("no-connection");
            $(document).trigger("connection");
            $("#connection_msg").remove();
            $("#fatal_error").fadeOut();
            setTimeout(function() {
                if (WebSync.webSocketFirstTime) {
                    WebSync.connection.sendJSON({
                        type: 'auth',
                        id: WebSyncAuth.id,
                        key: WebSyncAuth.key
                    });
                } else {
                    WebSync.connection.sendJSON({
                        type: 'auth',
                        id: WebSyncAuth.id,
                        key: WebSyncAuth.key
                    });
                    WebSync.success("<strong>Success!</strong> Connection restablished.");
                }
            }, 100);
        },

        onclose: function(e) {
            console.log(e);
            if (WebSync.diffInterval) {
                clearInterval(WebSync.diffInterval);
                $("nav").addClass("no-connection");
                WebSync.error("<strong>Connection Lost!</strong> Server is currently unavailable.").get(0).id = "connection_msg";
                WebSync.diffInterval = null;
                $(document).trigger("noconnection");
            } else {
                WebSync.fatalError("Failed to connect to backend.");
            }
            setTimeout(WebSync.webSocketStart, 2000);
        },
        onmessage: function(e) {
            console.log(e);
            data = JSON.parse(e.data);
            console.log("Message data:", data);
            if (data.type == "scripts") {
                // Load scripts from server.
                require(data.js);
            } else if (data.type == 'data_patch') {
                WebSync.tmp.range = WebSync.selectionSave();
                $(document).trigger("data_patch", {
                    patch: data.patch
                });
                // Make sure there aren't any outstanding changes that need to be sent before patching document.
                WebSync.checkDiff();
                jsonpatch.unobserve(WebSyncData, WebSync.patchObserver);
                jsonpatch.apply(WebSyncData, data.patch);
                WebSync.patchObserver = jsonpatch.observe(WebSyncData);
                if (WebSync.fromJSON) {
                    WebSync.fromJSON(data.patch);
                }
                WebSync.selectionRestore(WebSync.tmp.range);
            } else if (data.type == "name_update") {
                $("#name").text(data.name);
            } else if (data.type == 'ping') {
                WebSync.connection.sendJSON({
                    type: 'ping'
                });
            } else if (data.type == "permissions") {
                $("#access_mode").val(data.visibility);
                $("#default_permissions").val(data.default_level);
                var users = $("#user_perms tbody");
                var html = "";
                _.each(data.users, function(user) {
                    html += "<tr>";
                    html += "<td>" + user.user_email + "</td><td><select class='form-control'"
                    if (WebSync.clients[WebSyncAuth.id].email == user.user_email) html += " disabled"
                    html += ">"
                    _.each(["viewer", "editor", "owner"], function(level) {
                        html += "<option value='" + level + "'"
                        if (level == user.level) html += " selected"
                        html += ">"
                        html += level.charAt(0).toUpperCase() + level.slice(1)
                        html += "</option>"
                    });
                    html += "</select></td><td><a class='btn btn-danger'"
                    if (WebSync.clients[WebSyncAuth.id].email == user.user_email) html += " disabled"
                    html += "><i class='fa fa-trash-o visible-xs fa-lg'></i> <span class='hidden-xs'>Delete</span></a></td>"
                    html += "</tr>";
                });
                users.html(html);
            } else if (data.type == 'config') {
                if (data.action == 'get') {
                    var callback = WebSync._config_callbacks[data.id]
                    if (callback) {
                        callback(data.property, data.value, data.space);
                        delete WebSync._config_callbacks[data.id];
                    }
                }
            } else if (data.type == "error") {
                WebSync.error(data.reason);
            } else if (data.type == 'info') {
                WebSync.webSocketFirstTime = false;
                WebSync.loadScripts();
                WebSync.connection.sendJSON({
                    type: 'config',
                    action: 'get',
                    property: 'public'
                });
                WebSync.clients = data['users'];
                var to_trigger = {};
                $.each(WebSync.clients, function(k, v) {
                    console.log(k, v);
                    if (v.email == "anon@websyn.ca") {
                        WebSync.users[v.id] = {
                            displayName: "Anonymous"
                        };
                    } else if (!WebSync.users[v.id]) {
                        to_trigger[v.id] = [k];
                        $.ajax({
                            url: "https://secure.gravatar.com/" + v.id + ".json",
                            dataType: 'jsonp',
                            timeout: 2000
                        }).done(function(data) {
                            WebSync.users[v.id] = data.entry[0];
                        }).complete(function() {
                            $.each(to_trigger[v.id], function(i, item) {
                                $(document).trigger('client_load', {
                                    client: item
                                });
                            });
                        })
                        WebSync.users[v.id] = {};
                    } else {
                        if (!to_trigger[v.id]) {
                            $(document).trigger('client_load', {
                                client: k
                            });
                        } else {
                            to_trigger[v.id].push(k);
                        }
                    }
                });
            } else if (data.type == 'new_user') {
                WebSync.clients[data['id']] = data['user'];
                var user_id = data['user'].id;
                var client_id = data['id']
                console.log("USER INFO", data);
                if (data['user'].email == "anon@websyn.ca") {
                    WebSync.users[data['id']] = {
                        displayName: "Anonymous"
                    };
                }
                if (!WebSync.users[data['user'].id]) {
                    $.ajax({
                        url: "https://secure.gravatar.com/" + data['user'].id + ".json",
                        dataType: 'jsonp'
                    }).done(function(data) {
                        console.log(data);
                        WebSync.users[user_id] = data.entry[0];
                        $(document).trigger('client_load', {
                            client: client_id
                        });
                    }).fail(function() {
                        $(document).trigger('client_load', {
                            client: client_id
                        });
                    });
                    WebSync.users[data['user'].id] = {};
                } else {
                    $(document).trigger('client_load', {
                        client: data['id']
                    });
                }
            } else if (data.type == 'exit_user') {
                delete WebSync.clients[data['id']];
                $(document).trigger('client_leave', {
                    client: data['id']
                });
            } else if (data.type == 'client_event') {
                $(document).trigger('client_event_' + data.event, {
                    from: data.from,
                    data: data.data
                });
            } else if (data.type == 'asset_list') {
                var row = $("<tr><td></td><td></td><td></td><td></td><td width='102px'><div class='switch' ><input type='checkbox' " + (($("script[src='" + data.url + "']").length > 0) ? "checked" : "") + "/></div></td></tr>");
                row.get(0).dataset['id'] = data.id;
                var children = row.children();
                children.get(0).innerText = data.name;
                children.get(1).innerText = data.description;
                children.get(2).innerText = data.url;
                children.get(3).innerText = data.atype;
                $($(children.get(4)).children().get(0)).bootstrapSwitch();
                $("#assets tbody").append(row);
            } else if (data.type == 'diff_list') {
                WebSync.patches = data.patches;
                _.each(WebSync.patches, function(patch) {
                    var row = $("<tr><td></td><td></td><td></td><td><button class='btn btn-warning' data-id='" + patch.id + "'>Revert To</button></td></tr>");
                    var children = row.children();
                    children.get(0).innerText = patch.time;
                    children.get(1).innerText = patch.patch;
                    children.get(2).innerText = patch.user_email;
                    $($(children.get(4)).children().get(0)).bootstrapSwitch();
                    $("#diffs tbody").prepend(row);
                });
            }
        },
        onerror: function(e) {
            console.log(e);
        }

    },
    selectionSave: function() {
        // Get start selection.
        var sel = getSelection();
        var range, startText, startOffset, endText, endOffset;
        if (sel.rangeCount > 0) {
            range = sel.getRangeAt(0);
            startText = range.startContainer.nodeValue;
            startOffset = range.startOffset;
            endText = range.endContainer.nodeValue;
            endOffset = range.endOffset;
        }
        return {
            active: (sel.rangeCount > 0),
            startText: startText,
            startOffset: startOffset,
            endText: endText,
            endOffset: endOffset
        }
    },
    selectionRestore: function(sel) {
        if (sel.active) {
            // Find all #text nodes.
            var text_nodes = $(".content").find(":not(iframe)").addBack().contents().filter(function() {
                return this.nodeType == 3;
            });
            var startText = sel.startText,
                startOffset = sel.startOffset,
                endText = sel.endText,
                endOffset = sel.endOffset;
            var startNode = {};
            var endNode = {};
            console.log(text_nodes);
            var startNodeDist = 99999;
            var endNodeDist = 99999;
            // Locate the start & end #text nodes based on a Levenstein string distance.
            text_nodes.each(function(index, node) {
                var dist = levenshteinenator(node.nodeValue, startText);
                if (dist < startNodeDist) {
                    startNode = node;
                    startNodeDist = dist;
                }
                dist = levenshteinenator(node.nodeValue, endText);
                if (dist < endNodeDist) {
                    endNode = node;
                    endNodeDist = dist;
                }
            });
            // Update the text range.
            var range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        }
    },
    broadcastEvent: function(event, data) {
        WebSync.connection.sendJSON({
            type: 'client_event',
            event: event,
            data: data
        });
    },
    users: {},
    _config_callbacks: {},
    // Function: void WebSync.config_set(string key, object value, string space);
    // Sends a request to the server to set config[key] to value. Space can be "user" or "document".
    config_set: function(key, value, space) {
        if (space == null) {
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
    // Function: void WebSync.config_get(string key, string space);
    // Sends a request to the server for the key value. Space can be "user" or "document".
    config_get: function(key, callback, space) {
        var id = btoa(Date.now());
        if (callback) {
            WebSync._config_callbacks[id] = callback;
        }
        if (space == null) {
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
    // Function: void WebSync.initialize();
    // This is where the core of WebSync initializes.
    initialize: function() {
        NProgress.start();
        this.webSocketStart();
        $("#settingsBtn, [href='#permissions']").click(function() {
            WebSync.connection.sendJSON({
                type: "permission_info"
            });
        });
        $("#user_perms").delegate("select", "change", function(e) {
            var email = $(e.target).parent().parent().children().eq(0).text();
            var choice = $(e.target).val();
            WebSync.connection.sendJSON({
                type: 'share',
                email: email,
                level: choice
            });
        });
        $("#user_perms").delegate("a", "click", function(e) {
            var email = $(e.target).parent().parent().children().eq(0).text();
            WebSync.connection.sendJSON({
                type: 'share',
                email: email,
                level: "delete"
            });
            setTimeout(function() {
                WebSync.connection.sendJSON({
                    type: "permission_info"
                });
            }, 200);
        });
        $("#share_with").click(function() {
            var email = $("#share_email").val();
            WebSync.connection.sendJSON({
                type: "share",
                email: email,
                level: "viewer"
            });
            setTimeout(function() {
                WebSync.connection.sendJSON({
                    type: "permission_info"
                });
            }, 200);
            $("#share_email").val("");
        });
        $("#access_mode, #default_permissions").change(function() {
            if (WebSyncAuth.access == "owner") {
                WebSync.connection.sendJSON({
                    type: 'default_permissions',
                    visibility: $("#access_mode").val(),
                    default_level: $("#default_permissions").val()
                });
            } else {
                WebSync.error("Invalid permissions.");
            }
        });
        $("#name").blur(function() {
            var name = $(this).text();
            document.title = name + " - WebSync";
            WebSync.connection.sendJSON({
                type: "name_update",
                name: name
            });
        });
        $("#name").keydown(function(e) {
            e.stopPropagation();
        });
        $("#name").focus(function() {
            if (this.innerText.indexOf("Unnamed") == 0) {
                setTimeout(function() {
                    document.execCommand('selectAll');
                }, 100);
            }
        });
        $(".settings-popup #config").delegate('button', 'click', function() {
            $(this.parentElement.children[0]).prop('disabled', function(_, val) {
                return !val;
            });
            $(this).toggleClass("active");
        });
        $("nav, .content_well").bind("mousedown selectstart", function(e) {
            if (e.target.tagName != "SELECT") {
                return false;
            }
        });
        $("#name, #permissions input[type=text]").bind("mousedown selectstart", function(e) {
            e.stopPropagation();
        });
        $('#zoom_level').slider()
            .on('slide', function(e) {
                WebSync.setZoom($('#zoom_level').data("slider").getValue() / 100.0)

            });
        $('body').mousemove(function(e) {
            if (WebSync.viewMode == 'Zen') {
                if (e.pageY < 85 && !WebSync.menuVisible) {
                    $("nav").animate({
                        top: 0
                    }, 200);
                    WebSync.menuVisible = true;
                } else if (e.pageY > 85 && WebSync.menuVisible) {
                    $("nav").animate({
                        top: -96
                    }, 200);
                    WebSync.menuVisible = false;
                }
            }
        });
        if (WebSyncAuth.access == "viewer") {
            $("body").addClass("noedit");
        }
        WebSync.urlChange();
        $(window).bind("popstate", function(e) {
            WebSync.urlChange();
        });
        $('#view_mode').change(WebSync.updateViewMode);
        $(".return").click(function() {
            $('#view_mode').val("Normal");
            WebSync.updateViewMode();
        });
        $(".fullscreen").click(function() {
            if (fullScreenApi.isFullScreen())
                fullScreenApi.cancelFullScreen();
            else
                fullScreenApi.requestFullScreen(document.body);
        });
        require(['edit']);
        this.updateRibbon();
        rangy.init();
        console.log(rangy)
        $('#settingsBtn').click(function() {
            $(this.parentElement).toggleClass("active");
            $(".settings-popup").toggle();
            WebSync.resize();
        });
        $('.settings-popup .close').click(function() {
            $($("#settingsBtn").get(0).parentElement).toggleClass("active");
            $(".settings-popup").toggle();
        });
        $(".settings-popup #diffs").delegate('button', 'click', function(e) {
            console.log(this);
            var patches = [];
            var c_div = this.parentElement.parentElement;
            var id = parseInt($(this).data("id"));
            // TODO: Tree based patches.
            for (var i = 0; i < WebSync.patches.length; i++) {
                patches.push(WebSync.patches[i]);
                if (WebSync.patches[i].id == id) {
                    i = WebSync.patches.length;
                }
            }
            console.log(patches.length);
            var new_body = {
                body: []
            };
            _.each(patches, function(patch) {
                jsonpatch.apply(new_body, JSON.parse(patch.patch));
            });
            console.log(new_body);
            _.each(WebSyncData, function(v, k) {
                delete WebSyncData[k];
            });
            _.each(new_body, function(v, k) {
                WebSyncData[k] = v;
            });
            WebSyncData = new_body;
            if (WebSync.fromJSON) {
                WebSync.fromJSON();
            }
            WebSync.checkDiff();
        });
        $("a[href='#assets']").click(function() {
            $("#assets tbody").html("");
            WebSync.connection.sendJSON({
                type: 'assets',
                action: 'list'
            });
        });
        $(".tab-pane#assets").delegate(".switch", "switch-change", function(e, data) {
            var id = e.target.parentElement.parentElement.dataset.id;
            var url = e.target.parentElement.parentElement.children[2].innerText;
            WebSync.connection.sendJSON({
                type: 'assets',
                action: (data.value ? 'add' : 'delete'),
                id: id
            });
            if (data.value) {
                require([url]);
            } else {
                require(url).disable();
                requirejs.undef(url);
            }
        });
        $("a[href='#diffs']").click(function() {
            $("#diffs tbody").html("");
            WebSync.connection.sendJSON({
                type: 'diffs',
                action: 'list'
            });
        });
        $(document).on("online", function() {
            NProgress.done();
        });
        this.applier = rangy.createCssClassApplier("tmp");
        // TODO: Better polyfil for firefox not recognizing -moz-user-modify: read-write
        this.resize();
        $(window).resize(this.resize);
        WebSync.patchObserver = jsonpatch.observe(WebSyncData);
        //this.setupWebRTC();
        clearTimeout(window.initError);
        window.initError = true;
    },
    // Variable: object WebSync.domExceptions;
    // This is where registerDOMException stores it's internal data. You probably shouldn't modify this directly.
    domExceptions: {},
    // Function: void WebSync.registerDOMException(string Class, function Export, function Import);
    // This registers outside functions to handle the serialization & parsing of certain classes. Used for modifyable content that can't be serialized directly to HTML. Ex: the equation plugin.
    registerDOMException: function(watchClass, exportFunc, importFunc) {
        WebSync.domExceptions[watchClass] = {
            dump: exportFunc,
            load: importFunc
        };
    },
    // Function: void WebSync.unregisterDOMException(string Class);
    // Stops monitoring certain classes.
    unregisterDOMException: function(watchClass) {
        delete WebSync.domExceptions[watchClass];
    },
    // Variable: string WebSync.viewMode;
    // This is the current visual mode. This can be either 'zen' or 'normal'
    viewMode: 'normal',
    // Variable: boolean WebSync.menuVisible;
    // This tells you if the menu ribbon is visible or not. In zen mode it can disappear.
    menuVisible: true,
    // WARNING: Experimental & Unsupported in many browsers!
    // WebRTC Peer functionality. This will be used for communication between Clients. Video + Text chat hopefully.
    setZoom: function(zoom) {
        WebSync.zoom = zoom;
        $('#zoom_level').data("slider").setValue(zoom * 100)
        var container = $(".content_container");
        container.css({
            "transform": "scale(" + zoom + ")"
        });
        WebSync.updateOrigin();
        $(document).trigger("zoom");
    },
    urlChange: function() {
        var current = window.location.pathname.split("/")[2]
        if (current == "zen")
            $("#view_mode").val("Zen")
        if (current == "view")
            $("#view_mode").val("Presentation")
        else
            $("#view_mode").val("Normal")
        WebSync.updateViewMode(null, true);
    },
    updateViewMode: function(e, dontPush) {
        var mode = $('#view_mode').val();
        WebSync.viewMode = mode;
        fullScreenApi.cancelFullScreen();
        if (mode == 'Zen') {
            $("body").removeClass("presentation").addClass("zen").resize();
            WebSyncAuth.view_op = "edit";
            if (!dontPush)
                window.history.pushState("", "WebSync - Zen Mode", "zen");
            $("body").addClass("zen").resize();
            $("#zoom_level").data("slider").setValue(120);
            $("#zoom_level").trigger("slide");
            $("nav").animate({
                top: -96
            }, 200);
            $(".content_well").animate({
                top: 0
            }, 200);
        } else if (mode == 'Presentation') {
            $("body").removeClass("edit").removeClass("zen").addClass("view").resize();
            WebSyncAuth.view_op = "view";
            if (!dontPush)
                window.history.pushState("", "WebSync - Presentation Mode", "view");
            $("nav").animate({
                top: -96
            }, 200);
            $(".content_well, .sidebar").animate({
                top: 0
            }, 200);
            fullScreenApi.requestFullScreen(document.body);
        } else {
            $("body").removeClass("zen").removeClass("view").addClass("edit").resize();
            WebSyncAuth.view_op = "edit";
            if (!dontPush)
                window.history.pushState("", "WebSync - Edit Mode", "edit");
            $("#zoom_level").data("slider").setValue(100);
            $("#zoom_level").trigger("slide");
            $("nav").animate({
                top: 0
            }, 200);
            $(".content_well, .sidebar").animate({
                top: 96
            }, 200);
        }
        $(document).trigger("viewmode");
    },
    setupWebRTC: function() {
        if (WebSync.createPeerConnection()) {
            WebSync.createDataChannel();
        }
    },
    createPeerConnection: function() {
        var pc_config = {
            "iceServers": [{
                "url": "stun:stun.l.google.com:19302"
            }]
        };
        var pc_constraints = {
            "optional": [{
                "RtpDataChannels": true
            }]
        };
        // Force the use of a number IP STUN server for Firefox.
        if (webrtcDetectedBrowser == "firefox") {
            pc_config = {
                "iceServers": [{
                    "url": "stun:23.21.150.121"
                }]
            };
        }
        try {
            // Create an RTCPeerConnection via the polyfill (adapter.js).
            WebSync.pc = new RTCPeerConnection(pc_config, pc_constraints);
            WebSync.pc.onicecandidate = WebSync.onIceCandidate;
            console.log("Created RTCPeerConnnection with:\n" +
                "  config: \"" + JSON.stringify(pc_config) + "\";\n" +
                "  constraints: \"" + JSON.stringify(pc_constraints) + "\".");
        } catch (e) {
            console.log("Failed to create PeerConnection, exception: " + e.message);
            alert("Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.");
            return false;
        }

        WebSync.pc.onaddstream = WebSync.onRemoteStreamAdded;
        WebSync.pc.onremovestream = WebSync.onRemoteStreamRemoved;
        WebSync.pc.ondatachannel = WebSync.onDataChannel;
        return true;
    },
    createDataChannel: function() {
        WebSync.dataChannel = WebSync.pc.createDataChannel("chat", {
            reliable: false
        });
        WebSync.dataChannel.onopen = WebSync.reportEvent;
        WebSync.dataChannel.onclose = WebSync.reportEvent;
        WebSync.dataChannel.onerror = WebSync.reportEvent;
        WebSync.dataChannel.onmessage = WebSync.reportEvent;
    },
    setupPeerOffer: function(isCaller) {
        if (isCaller)
            WebSync.pc.createOffer(gotDescription);
        else
            WebSync.pc.createAnswer(WebSync.pc.remoteDescription, gotDescription);

        function gotDescription(desc) {
            pc.setLocalDescription(desc);
            signalingChannel.send(JSON.stringify({
                "sdp": desc
            }));
        }
    },
    reportEvent: function(event) {
        console.log(event);
    },
    onIceCanidate: function onIceCandidate(event) {
        if (event.candidate) {
            sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            });
        } else {
            console.log("End of candidates.");
        }
    },
    onRemoteStreamAdded: function onRemoteStreamAdded(event) {
        console.log("Remote stream added.");
        reattachMediaStream(miniVideo, localVideo);
        attachMediaStream(remoteVideo, event.stream);
        remoteStream = event.stream;
        waitForRemoteVideo();
    },
    onRemoteStreamRemoved: function onRemoteStreamRemoved(event) {
        console.log("Remote stream removed.");
    },
    onDataChannel: function(event) {
        console.log("Data Channel:", event);
    },
    // Function: void WebSync.updateRibbon();
    // This updates the ribbon buttons based on the content in the ribbon bar. TODO: Use registration system & persist menu between updates.
    updateRibbon: function() {
        var menu_buttons = "";
        var active = $("#ribbon_buttons .active").text();
        $(".ribbon .container").each(function(elem) {
            menu_buttons += '<li' + (this.id == active ? ' class="active"' : "") + '><a>' + this.id + '</a></li>'
        });
        $('#ribbon_buttons').html(menu_buttons);
        $('#ribbon_buttons li').click(function(e) {
            $('#ribbon_buttons li').removeClass('active');
            $(this).addClass('active');
            $('.ribbon .container').hide();
            $("#" + $(this).text()).show();
        });
        if (active == "") $('#ribbon_buttons li:contains(Text)').click();
    },
    // Function: void WebSync.loadScripts();
    // Checks server for plugin scripts to load.
    loadScripts: function() {
        WebSync.connection.sendJSON({
            type: "load_scripts"
        });
    },
    // Function: void WebSync.showHTML();
    // Converts visible text to HTML. TODO: Delete/figure something out.
    showHTML: function() {
        $('.page').html("<code>" + WebSync.getHTML() + "</code>");
    },
    // Function: string WebSync.getHTML();
    // This will return sanitized document HTML. TODO: This should be migrated into the page handler.
    getHTML: function() {
        $(".page").get(0).normalize();
        var html = $(".page").html().trim();
        // Remove other cursors.
        html = html.replace(/\<cursor[^\/]+\/?\<\/cursor\>/g, "")
        return html;
    },
    // Function: void WebSync.resize();
    // Event handler for when the window resizes. This is an internal method.
    resize: function() {
        //$(".content_well").height(window.innerHeight-$(".content_well").position().top);
        $(".arrow").offset({
            left: $("#settingsBtn").parent().offset().left + 13
        });
        $(".settings-popup .popover-content").css({
            maxHeight: window.innerHeight - $(".settings-popup").offset().top - 100
        });
        WebSync.updateRibbon();
        WebSync.updateOrigin();
    },
    // Function: void WebSync.updateOrigin();
    // Changes the transform origin based on the content_container dimensions.
    updateOrigin: function() {
        var container = $(".content_container");
        if (container.width() > container.parent().width() || container.parent().get(0) && container.parent().get(0).scrollWidth - 2 > container.parent().width()) {
            container.addClass("left").css({
                "margin-left": "initial"
            });
            // TODO: Center zoomed out
            /*var side = container.parent().width() - container.width()*WebSync.zoom;
            if(side > 0){
                container.css({"margin-left":  side/2});
            }*/
        } else {
            container.removeClass("left");
            container.css({
                "margin-left": "auto"
            });
        }
    },
    // Function: void WebSync.checkDiff();
    // This is an internal method that executes every couple of seconds while the client is connected to the server. It checks to see if there have been any changes to document. If there are any changes it sends a message to a Web Worker to create a patch to transmit.
    checkDiff: function() {
        //if(!WebSync.oldData){
        //    WebSync.oldDataString = JSON.stringify(WebSyncData);
        //    WebSync.oldData = JSON.parse(WebSync.oldDataString);
        //}
        if (WebSync.toJSON) {
            WebSync.toJSON();
        }
        //var stringWebSync = JSON.stringify(WebSyncData);
        //if(stringWebSync!=WebSync.oldDataString){
        //}
        var patches = jsonpatch.generate(WebSync.patchObserver);
        if (WebSyncAuth.access == "viewer" && patches.length > 0) {
            WebSync.error("<b>Error</b> You don't have permission to make changes.");
        } else if (patches.length > 0) {
            console.log("Diffing", patches)
            $(document).trigger("diffed");
            WebSync.connection.sendJSON({
                type: "data_patch",
                patch: patches
            });
            //WebSync.oldDataString = stringWebSync;
            //WebSync.oldData = JSON.parse(stringWebSync);
        }
    },
    // Function: void WebSync.insertAtCursor(jQuery node);
    // Inserts a DOM element at selection cursor. This is probably going to be deprecated.
    insertAtCursor: function(node) {
        node = node.get(0);
        var sel, range, html;
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
    // Function: object WebSync.getCss();
    // Returns the calculated CSS for the current selection. Warning: This can cause the client to run slowly if used too much.
    getCss: function() {
        /*WebSync.applier.toggleSelection();
		if($(".tmp").length==0) return {};
		return $(".tmp").removeClass("tmp").getStyleObject();*/
        var selection = getSelection();
        if (selection.type == "None") {
            return {};
        }
        var selNode = getSelection().baseNode.parentNode;
        if (WebSync.tmp.lastSelNode == selNode) {
            return WebSync.tmp.lastSelCss;
        } else {
            var css_object = $(selNode).getStyleObject();
            WebSync.tmp.lastSelCss = css_object;
            WebSync.tmp.lastSelNode = selNode;
            return css_object;
        }
    },
    // Function: void WebSync.applyCssToSelection(object css);
    // Applies css to the selection. Uses jQuery css object format. Warning: This is rather slow and shouldn't be overly used.
    applyCssToSelection: function(css) {
        WebSync.applier.toggleSelection();
        $(".tmp").css(css).removeClass("tmp");
    },
    // Function: void WebSync.alert(string Message);
    // Displays an alert message in the lower right hand corner of the window.
    alert: function(msg) {
        return WebSync.alertMessage(msg, "alert-warning");
    },
    // Function: void WebSync.error(string Message);
    // Displays an error message in the lower right hand corner of the window.
    error: function(msg) {
        return WebSync.alertMessage(msg, "alert-danger");
    },
    // Function: void WebSync.success(string Message);
    // Displays a success message in the lower right hand corner of the window.
    success: function(msg) {
        return WebSync.alertMessage(msg, "alert-success");
    },
    // Function: void WebSync.info(string Message);
    // Displays an info message in the lower right hand corner of the window.
    info: function(msg) {
        return WebSync.alertMessage(msg, "alert-info");
    },
    // Function: void WebSync.alertMessage(string Message, string Classes);
    // Displays an message in the lower right hand corner of the window with css classes.
    alertMessage: function(msg, classes) {
        var div = $('<div class="alert ' + classes + '"><a class="close" data-dismiss="alert">&times;</a>' + msg + '</div>');
        $('#alert_well').prepend(div);
        setTimeout(function() {
            div.alert('close');
        }, 10000);
        return div;
    },
    // Function: void WebSync.fatalError(string Message);
    // Displays a large error banner. Should only be displayed for unrecoverable or interface blocking errors.
    fatalError: function(msg) {
        if (msg) $("#error_message").text(msg);
        $("#fatal_error").fadeIn();
    },
    // Function void WebSync.fatalHide();
    // Hides the fatal error banner.
    fatalHide: function() {
        $("#fatal_error").fadeOut();
    },
    // Function: void WebSync.applyPatchToDOM(element Parent, array Patches);
    // Applies a patch directly to the DOM instead of completely rebuilding it for each patch. BROKEN. Parses old patch system. DO NOT USE.
    applyPatchToDOM: function(element, patch) {
        if (_.isArray(patch)) {
            console.log("ARRAY", element, patch);
            _.each(patch, function(elem, index, list) {
                var div = null;
                if (elem.name == "#text") {
                    div = document.createTextNode(elem.textContent);
                } else {
                    div = document.createElement(elem.name);
                }
                element.appendChild(div);
                WebSync.applyPatchToDOM(div, elem);
            });
        } else {
            if (patch["_t"] == "a") {
                _.each(patch, function(val, key) {
                    if (key != "_a") {
                        var n_element = element.childNodes[parseInt(key)];
                        if (_.isArray(val)) {
                            _.each(val, function(elem, index, list) {
                                var div = document.createElement(elem.name);
                                $(element).append(div);
                                WebSync.applyPatchToDOM(div, elem);
                            });
                        } else if (n_element) {
                            WebSync.applyPatchToDOM(n_element, val);
                        }
                    }
                });
            } else {
                if (patch.childNodes) {
                    WebSync.applyPatchToDOM(element, patch.childNodes);
                }
                if (patch.textContent) {
                    if (_.isArray(patch.textContent)) {
                        element.textContent = patch.textContent[1];
                    } else {
                        element.textContent = patch.textContent;
                    }
                }
                _.each(patch, function(v, k) {
                    if (k != "name" && k != "textContent" && k != "childNodes" && k != "dataset") {
                        $(element).attr(k, v);
                    }
                });
                if (patch.dataset) {
                    _.each(patch.dataset, function(v, k) {
                        $(element).attr("data-" + k, v);
                    });
                }
            }
        }
    }
});
(function() {
    var done = false;
    // This is used to know when all modules are loaded. It uses a sketchy internal function subject to change.
    requirejs.onResourceLoad = function(context, map, depArray) {
        if (done) return;
        var context = requirejs.s.contexts._;
        var loaded = 0;
        var total = 0;
        _.each(context.urlFetched, function(fetched, script) {
            if (fetched && context.defined[script]) {
                loaded += 1;
            }
            total += 1;
        });
        if (loaded == total && total > 0) {
            $(document).trigger("modules_loaded");
            done = true;
        }
    }
})();
dmp = new diff_match_patch();

function NODEtoJSON(obj) {
    var jso = {
        name: obj.nodeName,
        childNodes: []
    }
    var exempt = null;
    if (WebSync.domExceptions[obj.nodeName]) {
        exempt = obj.nodeName;
    } else if (WebSync.domExceptions["#" + obj.id]) {
        exempt = "#" + obj.id;
    } else {
        _.each(obj.classList, function(cl) {
            if (WebSync.domExceptions["." + cl]) {
                exempt = "." + cl;
            }
        });
    }
    if (exempt) {
        delete jso.childNodes;
        jso.exempt = exempt;
        jso.data = WebSync.domExceptions[exempt].dump(obj);
        return jso;
    }
    var search_children = true;
    if (_.size(obj.dataset) > 0) {
        jso.dataset = {}
        _.each(obj.dataset, function(v, k) {
            jso.dataset[k] = v;
        });
        if (jso.dataset.search_children == "false") {
            search_children = false;
        }
    }
    if (obj.nodeName == "#text") {
        jso.textContent = obj.textContent;
    }
    if (obj.attributes) {
        _.each(obj.attributes, function(v, k) {
            // TODO: Add blacklist of classnames & attributes for DOM serialization.
            if (v.name != "contenteditable" && v.name.indexOf("data-") != 0) {
                jso[v.name] = v.value;
            }
        });
    }
    if (search_children) {
        _.each(obj.childNodes, function(child, index) {
            jso.childNodes.push(NODEtoJSON(child));
        });
    }
    if (_.isEmpty(jso.childNodes)) {
        delete jso.childNodes;
    }
    return jso;
}

function DOMToJSON(obj) {
    var jso = [];
    _.each(obj, function(elem, index) {
        elem.normalize();
        jso.push(NODEtoJSON(elem));
    });
    return jso;
}

function escapeHTML(html) {
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function alphaNumeric(text) {
    return text.match(/[a-zA-Z0-9\-]+/g).join("");
}

function NODEtoDOM(obj) {
    var html = "";
    // Some basic cross site scripting attack prevention.
    if (obj.name == "#text")
        return escapeHTML(obj.textContent);
    obj.name = alphaNumeric(obj.name);
    // TODO: Potentially disallow iframes!
    if (obj.name == "script")
        return "";
    if (obj.exempt && WebSync.domExceptions[obj.exempt]) {
        return WebSync.domExceptions[obj.exempt].load(obj.data);
    }
    html += "<" + obj.name;
    var data_vars = []
    _.each(obj, function(v, k) {
        if (k != "name" && k != "textContent" && k != "childNodes" && k != "dataset") {
            k = alphaNumeric(k.trim())
            if (k.toLowerCase().indexOf("on") != 0) {
                if (k.toLowerCase().indexOf("data-") == 0) {
                    data_vars.push(k)
                }
                html += " " + k + "=" + JSON.stringify(v);
            }
        }
    });
    if (obj.dataset) {
        _.each(obj.dataset, function(v, k) {
            k = alphaNumeric(k.trim());
            if (data_vars.indexOf("data-" + k) == -1)
                html += " data-" + alphaNumeric(k) + "=" + JSON.stringify(v);
        });
    }
    if (obj.childNodes) {
        html += ">";
        _.each(obj.childNodes, function(elem, index) {
            html += NODEtoDOM(elem);
        });
        html += "</" + obj.name + ">";
    } else {
        html += "/>";
    }
    return html;
}

function JSONToDOM(obj) {
    var html = "";
    _.each(obj, function(elem, index) {
        html += NODEtoDOM(elem);
    });
    return html;
}
// Finds differences between obj1 and obj2.
function diff(obj1, obj2) {
    var diffs = {}
    if (_.isEqual(obj1, obj2)) {} else if (typeof(obj2) == 'undefined') {
        diffs = {
            op: 'delete'
        }
    } else if (typeof(obj1) != typeof(obj2)) {
        diffs = {
            op: 'replace',
            new: obj2
        };
    } else if (typeof(obj1) == "string") {
        diffs = {
            op: 'patch',
            patch: dmp.patch_toText(dmp.patch_make(obj1, obj2))
        }
    } else if ($.isArray(obj1)) {
        diffs = [];
        var C = []
        // Generate a table of matching areas.
        $.each(obj2, function(i1, val1) {
            C[i1] = []
            $.each(obj1, function(i2, val2) {
                if (_.isEqual(val1, val2)) {
                    C[i1][i2] = true;
                }
            });
        });
        log_array(C);
        // First pass through C looking for non-matching patterns found in the new array.
        var last_i2 = 0;
        var last_i1 = 0;
        $.each(C, function(i1, R) {
            var exists = false;
            $.each(R, function(i2, val) {
                // This deletes duplicates.
                if (val && exists) {
                    delete C[i1][i2];
                } else if (val) {
                    exists = true;
                    /*var x = last_i1;
                    var y = last_i2;
                    while(x!=i1&&y!=i2){
                        var slope_x = 0;
                        var slope_y = 0;
                        if(x!=i1){
                            slope_x = 1;
                        }
                        if(y!=i2){
                            slope_y = 1;
                        }
                        x+=slope_x;
                        y+=slope_y;
                        if(!C[x][y]){
                            if(slope_x&&slope_y){
                                console.log(x,y,obj1,obj2);
                                diffs.push({op:'diff',index:i2,diff:diff(obj1[y-1],obj2[x])});
                            } else if(slope_x){
                                diffs.push({op:'new',new:obj2[x],index:x});
                            } else if(slope_y){
                                diffs.push({op:'delete',index:y});
                            }
                        }
                        for(var b=(x+2);b<C.length;b++){
                            // Prune the rest of the false positives on this line.
                            delete C[b][y];
                        }
                    }//*/
                    for (var y = (last_i2); y < i2; y++) {
                        for (var b = (i1 + 1); b < C.length; b++) {
                            // Prune the rest of the false positives on this line.
                            delete C[b][y];
                        }
                    }
                    last_i2 = i2;
                    last_i1 = i1;
                }
            });
            if (!exists) {
                var action = {
                    op: 'new',
                    new: obj2[i1],
                    index: i1
                }
                last_i2++;
                for (var x = (i1 + 1); x < C.length; x++) {
                    // Prune the rest of the false positives on this line.
                    delete C[x][last_i2];
                }
                diffs.push(action)
            }
        });
        // Second pass through C looking for non-matching patterns found in the old array.
        for (var i1 = 0; i1 < obj1.length; i1++) {
            var exists = false;
            for (var i2 = 0; i2 < obj2.length; i2++) {
                if (C[i2][i1]) {
                    exists = true;
                }
            }
            if (!exists) {
                diffs.push({
                    op: 'delete',
                    index: i1
                })
            }
        } //*/
        /*var tmp_diff = [];
        for(var i=(diffs.length-1);i>=0;i--){
            var diff = diffs[i];
            var diff_index = tmp_diff[diff.index];
            if(diff_index!=null){
                {op:'diff',diff:diff(obj1[diff_index],obj2[diff_index]);
                delete diffs[diff_index];
                delete diffs[i];
            } else {
                tmp_diff[diff.index]=i;
            }
        }*/
        log_array(C);
    } else {
        // Both Objects
        $.each(obj1, function(k, v) {
            var val = diff(v, obj2[k]);
            if (!_.isEmpty(val)) {
                diffs[k] = val;
            }
        });
    }
    return diffs;
}

function log_array(arr) {
    var output = "";
    $.each(arr, function(i1, R) {
        var exists = false;
        $.each(R, function(i2, val) {
            if (val) {
                output += '0';
            } else {
                output += ' ';
            }
        });
        output += "\n";
    });
    console.log(output);

}
WebSocket.prototype.sendJSON = function(object) {
    this.send(JSON.stringify(object));
}

function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

requirejs.config({
    baseUrl: 'assets'
});
$(document).ready(function() {
    require(['websync'], function(websync) {
        window.WebSync = websync;
        WebSync.initialize();
    });
});


// Polyfill for non-standard webkit method scrollIntoViewIfNeeded by Hubert SABLONNIERE @hsablonniere
if (!Element.prototype.scrollIntoViewIfNeeded) {
    Element.prototype.scrollIntoViewIfNeeded = function(centerIfNeeded) {
        centerIfNeeded = arguments.length === 0 ? true : !! centerIfNeeded;
        var parent = this.parentNode,
            parentComputedStyle = window.getComputedStyle(parent, null),
            parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue('border-top-width')),
            parentBorderLeftWidth = parseInt(parentComputedStyle.getPropertyValue('border-left-width')),
            overTop = this.offsetTop - parent.offsetTop < parent.scrollTop,
            overBottom = (this.offsetTop - parent.offsetTop + this.clientHeight - parentBorderTopWidth) > (parent.scrollTop + parent.clientHeight),
            overLeft = this.offsetLeft - parent.offsetLeft < parent.scrollLeft,
            overRight = (this.offsetLeft - parent.offsetLeft + this.clientWidth - parentBorderLeftWidth) > (parent.scrollLeft + parent.clientWidth),
            alignWithTop = overTop && !overBottom;
        if ((overTop || overBottom) && centerIfNeeded) {
            parent.scrollTop = this.offsetTop - parent.offsetTop - parent.clientHeight / 2 - parentBorderTopWidth + this.clientHeight / 2;
        }
        if ((overLeft || overRight) && centerIfNeeded) {
            parent.scrollLeft = this.offsetLeft - parent.offsetLeft - parent.clientWidth / 2 - parentBorderLeftWidth + this.clientWidth / 2;
        }
        if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
            this.scrollIntoView(alignWithTop);
        }
    };
}
