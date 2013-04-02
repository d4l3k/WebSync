/*
    Web-Sync: Edit.js
    This is the core file that runs the Web-Sync editor.

    Copyright (c) 2013. All Rights reserved.

    Tristan Rice
    rice (at) outerearth (dot) net
    http://tristanrice.name/
*/
// Variable: object WebSync;
// This is the core of WebSync. Everything is stored under the WebSync object except for websocket authentication information which is under WebSyncAuth.
var WebSyncProto = function(){};
WebSyncProto.prototype = {
    // Variable: object WebSync.tmp;
    // Provides a location for temporary data to be stored.
    tmp: {},
    // Variable: boolean WebSync.webSocketFirstTime;
    // Websocket first connection?
	webSocketFirstTime: true,
    // Function: void WebSync.webSocketStart();
    // Creates the websocket for communication.
	webSocketStart: function(){
		WebSync.connection = new WebSocket("ws://"+window.location.host+window.location.pathname);
		WebSync.connection.onopen = WebSync.webSocketCallbacks.onopen;
		WebSync.connection.onclose = WebSync.webSocketCallbacks.onclose;
		WebSync.connection.onmessage = WebSync.webSocketCallbacks.onmessage;
		WebSync.connection.onerror = WebSync.webSocketCallbacks.onerror;
	},
    // Variable: object WebSync.webSocketCallbacks;
    // An object with all of the callbacks for a websocket connection.
	webSocketCallbacks: {
		onopen: function(e){
			console.log(e);
			WebSync.diffInterval = setInterval(WebSync.checkDiff,500);
			$(".navbar-inner").removeClass("no-connection");
			$("#connection_msg").remove();
			if(WebSync.webSocketFirstTime){
				WebSync.webSocketFirstTime = false;
				WebSync.connection.sendJSON({type:'auth',id:WebSyncAuth.id,key:WebSyncAuth.key});
				WebSync.loadScripts();
                WebSync.connection.sendJSON({type:'config',action:'get',property:'public'});
			} else {
				WebSync.connection.sendJSON({type:'auth',id:WebSyncAuth.id,key:WebSyncAuth.key});
				WebSync.success("<strong>Success!</strong> Connection restablished.");
			}
		},

		onclose: function(e){
			console.log(e);
			if(WebSync.diffInterval){
				clearInterval(WebSync.diffInterval);
				$(".navbar-inner").addClass("no-connection");
				WebSync.error("<strong>Connection Lost!</strong> Server is currently unavailable.").get(0).id="connection_msg";
				WebSync.diffInterval=null;
			}
			setTimeout(WebSync.webSocketStart,2000);
		},
		onmessage: function(e){
			console.log(e);
			data = JSON.parse(e.data);
			console.log("Message data:",data);
			if(data.type=="scripts"){
                // Load scripts from server.
				data.js.forEach(function(script){
					console.log("Loading script:",script);
					$(document.body).append($('<script type="text/javascript" src="'+script+'"></script>'))
				});
			}
            else if(data.type=="text_patch"){
                // Make sure there aren't any outstanding changes that need to be sent before patching document.
                // TODO: Make this work with webworkers
                WebSync.checkDiff();
                // Get start selection.
				var sel = getSelection();
                var range, startText,startOffset,endText,endOffset;
                if(sel.rangeCount>0){
                    range = sel.getRangeAt(0);
                    startText = range.startContainer.nodeValue;
                    startOffset = range.startOffset;
                    endText = range.endContainer.nodeValue;
                    endOffset = range.endOffset;
                }
                WebSync.tmp.range = {
                    active: (sel.rangeCount>1),
                    startText: startText,
                    startOffset: startOffset,
                    endText: endText,
                    endOffset: endOffset
                }
                // Patch the HTML.
                var new_html = WebSync.getHTML();
                WebSync.worker.postMessage({cmd:'apply_patch',html:new_html,patch:data.patch});
            }
			else if(data.type=="name_update"){
				$("#name").text(data.name);
			}
			else if(data.type=="text_update"){
				$(".content .page").get(0).innerHTML=data.text;
				WebSync.old_html = data.text;
			}
            else if(data.type=='config'){
                if(data.action=='get'){
                    if(data.property=='public'){
                        $("#public_mode").val(data.value ? "Public" : "Private");
                    }
                    else {
                        var callback = WebSync._config_callbacks[data.id]
                        if(callback){
                            callback(data.property,data.value,data.space);
                            delete WebSync._config_callbacks[data.id];
                        }
                    }
                }
            }
		},
		onerror:function(e){
			console.log(e);
		}

	},
    _config_callbacks: {},
    // Function: void WebSync.config_set(string key, object value, string space);
    // Sends a request to the server to set config[key] to value. Space can be "user" or "document".
    config_set: function(key, value, space){
        if(space==null){
            space='document';
        }
        WebSync.connection.sendJSON({type:'config',action:'set', property: key, value: value, space: space});
    },
    // Function: void WebSync.config_get(string key, string space);
    // Sends a request to the server for the key value. Space can be "user" or "document".
    config_get: function(key, callback, space){
        var id = btoa(Date.now());
        if(callback){
            WebSync._config_callbacks[id]=callback;
        }
        if(space==null){
            space='document';
        }
        WebSync.connection.sendJSON({type:'config',action:'get', property: key, space: space, id: id});
    },
    // Function: void WebSync.initialize();
    // This is where the core of Web-Sync initializes.
	initialize: function(){
		this.webSocketStart();
        $("#public_mode").change(function(){
            WebSync.connection.sendJSON({type:'config',action:'set',property:'public',value: ($(this).val()=="Public")})
        });
		$("#name").blur(function(){
			$(this).html($(this).text());
			WebSync.connection.sendJSON({type: "name_update", name: $("#name").text()});
		});
		$("#name").focus(function(){
			if(this.innerText=="Unnamed Document"){
                setTimeout(function(){
                    document.execCommand('selectAll');
                },100);
            }
		});
        $(".settings-popup").delegate('button','click',function(){ $(this.parentElement.children[0]).prop('disabled', function (_, val) { return ! val; }); $(this).toggleClass("active");});
		$(".menu, .content_well").bind("mousedown selectstart",function(e){ if(e.target.tagName!="SELECT"){return false;} });
		$(".content").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
		$("#name").bind("mousedown selectstart",function(e){ e.stopPropagation(); });
        $('#zoom_level').change(function(){
			var zoom = parseInt($('#zoom_level').val())/100.0
			$(".content_well").children().animate({"transform":"scale("+zoom+")"});
        });
        $('body').mousemove(function(e){
            if(WebSync.viewMode=='Zen'){
                if(e.pageY<85&&!WebSync.menuVisible){
                    $(".menu").animate({top: 0});
                    WebSync.menuVisible = true;
                }
                else if(e.pageY>85&&WebSync.menuVisible) {
                    $(".menu").animate({top: -85});
                    WebSync.menuVisible = false;
                }
            }
        });
        $('#view_mode').change(function(){
            var mode = $('#view_mode').val();
            WebSync.viewMode = mode;
            if(mode=='Zen'){
                $("body").addClass("zen").resize(); $("#zoom_level").val("120%").change(); $(".menu").animate({top:-85});
            }
            else {
                $("body").removeClass("zen").resize(); $("#zoom_level").val("100%").change(); $(".menu").animate({top: 0});
            }
        });
		this.updateRibbon();
		rangy.init();
		console.log(rangy)
		/*
		 * Cursor Blink
		 * For future other people.
		setInterval(function(){
			$("cursor").toggleClass("hidden");
		},1000);
		*/
        $('#settingsBtn').click(function(){
			$(this.parentElement).toggleClass("active");
            $(".settings-popup").toggle();
            WebSync.resize();
		});
        $('.settings-popup .close').click(function(){
			$($("#settingsBtn").get(0).parentElement).toggleClass("active");
            $(".settings-popup").toggle();
        });
        this.worker = new Worker("/assets/edit-worker.js");
        this.worker.onmessage = function(e) {
            var data = e.data;
            console.log(data);
            if(data.cmd=='diffed'){
                WebSync.connection.sendJSON({type: "text_patch", patch: data.diff});
            }
            else if(data.cmd=='patched'){
                $(".content .page").get(0).innerHTML=data.html;
                WebSync.old_html = WebSync.getHTML();
                sel = WebSync.tmp.range;
                if(sel.active){
                    // Find all #text nodes.
                    var text_nodes = $(".page").find(":not(iframe)").addBack().contents().filter(function() {
                        return this.nodeType == 3;
                    });
                    var startText = range.startText, startOffset = range.startOffset, endText = range.endText, endOffset = range.endOffset;
                    var startNode = {};
                    var endNode = {};
                    console.log(text_nodes);
                    var startNodeDist = 99999;
                    var endNodeDist = 99999;
                    // Locate the start & end #text nodes based on a Levenstein string distance.
                    text_nodes.each(function(index, node){
                        var dist = levenshteinenator(node.nodeValue,startText);
                        if(dist<startNodeDist){
                            startNode = node;
                            startNodeDist = dist;
                        }
                        dist = levenshteinenator(node.nodeValue,endText);
                        if(dist<endNodeDist){
                            endNode = node;
                            endNodeDist = dist;
                        }
                    });
                    // Update the text range.
                    var range = document.createRange();
                    range.setStart(startNode,startOffset);
                    range.setEnd(endNode,endOffset);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                }
                // Prevent checkDiff() from sending updates for patches.
            }
            else if(data.cmd=='log'){
                console.log(data.msg);
            }
         }
		this.applier = rangy.createCssClassApplier("tmp");
		// TODO: Better polyfil for firefox not recognizing -moz-user-modify: read-write
        $(".page").attr("contenteditable","true");
        this.resize();
        $(window).resize(this.resize);
        //this.setupWebRTC();
	},
    // Variable: string WebSync.viewMode;
    // This is the current visual mode. This can be either 'zen' or 'normal'
    viewMode: 'normal',
    // Variable: boolean WebSync.menuVisible;
    // This tells you if the menu ribbon is visible or not. In zen mode it can disappear.
    menuVisible: true,
    // WARNING: Experimental & Unsupported in many browsers!
	// WebRTC Peer functionality. This will be used for communication between Clients. Video + Text chat hopefully.
	setupWebRTC: function(){
		if(WebSync.createPeerConnection()){
		    WebSync.createDataChannel();
        }
	},
	createPeerConnection: function() {
		var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
		var pc_constraints = {"optional": [{"RtpDataChannels": true}]};
		// Force the use of a number IP STUN server for Firefox.
		if (webrtcDetectedBrowser == "firefox") {
			pc_config = {"iceServers":[{"url":"stun:23.21.150.121"}]};
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
		WebSync.dataChannel = WebSync.pc.createDataChannel("chat",{reliable:false});
		WebSync.dataChannel.onopen = WebSync.reportEvent;
		WebSync.dataChannel.onclose = WebSync.reportEvent;
		WebSync.dataChannel.onerror = WebSync.reportEvent;
		WebSync.dataChannel.onmessage = WebSync.reportEvent;
	},
	setupPeerOffer: function(isCaller){
		if (isCaller)
		    WebSync.pc.createOffer(gotDescription);
		else
		    WebSync.pc.createAnswer(WebSync.pc.remoteDescription, gotDescription);

		function gotDescription(desc) {
		    pc.setLocalDescription(desc);
		    signalingChannel.send(JSON.stringify({ "sdp": desc }));
		}
	},
	reportEvent: function(event) {
		console.log(event);
	},
	onIceCanidate: function onIceCandidate(event) {
		if (event.candidate) {
		sendMessage({type: 'candidate',
			   label: event.candidate.sdpMLineIndex,
			   id: event.candidate.sdpMid,
			   candidate: event.candidate.candidate});
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
	onDataChannel: function(event){
		console.log("Data Channel:",event);
	},
    // Function: void WebSync.updateRibbon();
    // This updates the ribbon buttons based on the content in the ribbon bar. TODO: Use registration system & persist menu between updates.
	updateRibbon: function(){
		var menu_buttons = "";
		$(".ribbon .container").each(function(elem){
			menu_buttons += '<li><a>'+this.id+'</a></li>'
		});
		$('#ribbon_buttons').html(menu_buttons);
		$('#ribbon_buttons li').click(function(e){
			$('#ribbon_buttons li').removeClass('active');
			$(this).addClass('active');
			$('.ribbon .container').hide();
			$("#"+$(this).text()).show();
		});
		$($('#ribbon_buttons li').get(2)).click();
	},
    // Function: void WebSync.loadScripts();
    // Checks server for plugin scripts to load.
	loadScripts: function(){
		WebSync.connection.sendJSON({type: "load_scripts"});
	},
    // Function: void WebSync.showHTML();
    // Converts visible text to HTML. TODO: Delete/figure something out.
	showHTML: function(){
		$('.page').html("<code>"+WebSync.getHTML()+"</code>");
	},
    // Function: string WebSync.getHTML();
    // This will return sanitized document HTML. TODO: This should be migrated into the page handler.
	getHTML: function(){
		var html = $(".page").html().trim();
		// Remove other cursors.
		html = html.replace(/\<cursor[^\/]+\/?\<\/cursor\>/g,"")
		return html;
	},
    // Function: void WebSync.resize();
    // Event handler for when the window resizes. This is an internal method.
    resize: function(){
        $(".content_well").height(window.innerHeight-$(".content_well").position().top)
        $(".settings-popup").css({left:(window.innerWidth-944)*0.5})
        $(".arrow").offset({left:$("#settingsBtn").offset().left+16})
    },
    // Function: void WebSync.checkDiff();
    // This is an internal method that executes every couple of seconds while the client is connected to the server. It checks to see if there have been any changes to document. If there are any changes it sends a message to a Web Worker to create a patch to transmit.
	checkDiff: function(){
		var new_html = WebSync.getHTML();
		if(typeof WebSync.old_html == "undefined"){
			WebSync.old_html = new_html;
		}
		if(new_html!=WebSync.old_html){
			if(WebSync.old_html==""){
				WebSync.connection.sendJSON({type: "text_update",text: new_html})
			}
			else {
                // Send it to the worker thread for processing.
                var msg = {'cmd':'diff','oldHtml':WebSync.old_html,'newHtml':new_html};
                WebSync.worker.postMessage(msg);
			}
			WebSync.old_html=new_html;
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
				range.insertNode( node );
			}
		} else if (document.selection && document.selection.createRange) {
			document.selection.createRange().html = node;
		}
	},
    // Function: object WebSync.getCss();
    // Returns the calculated CSS for the current selection. Warning: This can cause the client to run slowly if used too much.
	getCss: function(){
		/*WebSync.applier.toggleSelection();
		if($(".tmp").length==0) return {};
		return $(".tmp").removeClass("tmp").getStyleObject();*/
		return $(getSelection().baseNode.parentNode).getStyleObject();
	},
    // Function: void WebSync.applyCssToSelection(object css);
	// Applies css to the selection. Uses jQuery css object format. Warning: This is rather slow and shouldn't be overly used.
	applyCssToSelection: function(css){
		WebSync.applier.toggleSelection();
		$(".tmp").css(css).removeClass("tmp");
	},
    // Function: void WebSync.register(string PluginName, function Plugin);
	// Registers a plugin with the WebSync core. Plugin.enable() will be called afterwards. Plugin.disable() will be used to disable the plugin.
    register: function(pluginname, plugin){
		plugin = new plugin();
		console.log("Loading plugin:",pluginname);
		WebSync.plugins[pluginname]=plugin;
		WebSync.plugins[pluginname].enable();
	},
    // Variable: object WebSync.plugins;
    // List of all the plugins loaded in the format of {myawesomeplugin: object Plugin, ...}.
	plugins: {},
    // Function: void WebSync.alert(string Message);
    // Displays an alert message in the lower right hand corner of the window.
	alert: function(msg){
		return WebSync.alert_msg(msg,"");
	},
    // Function: void WebSync.error(string Message);
    // Displays an error message in the lower right hand corner of the window.
	error: function(msg){
		return WebSync.alert_msg(msg,"alert-error");
	},
    // Function: void WebSync.success(string Message);
    // Displays a success message in the lower right hand corner of the window.
	success: function(msg){
		return WebSync.alert_msg(msg,"alert-success");
	},
    // Function: void WebSync.info(string Message);
    // Displays an info message in the lower right hand corner of the window.
	info: function(msg){
		return WebSync.alert_msg(msg,"alert-info");
	},
    // Function: void WebSync.alert_msg(string Message, string Classes);
    // Displays an message in the lower right hand corner of the window with css classes.
	alert_msg: function(msg,classes){
		var div = $('<div class="alert '+classes+'"><a class="close" data-dismiss="alert">&times;</a>'+msg+'</div>');
		$('#alert_well').prepend(div);
		setTimeout(function(){
			div.alert('close');
		},10000);
		return div;
	}
}

WebSocket.prototype.sendJSON = function(object){
	this.send(JSON.stringify(object));
}
function capitaliseFirstLetter(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

window.WebSync=new WebSyncProto();
WebSync.initialize();
