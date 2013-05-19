/*
    WebSync: Core.js
    This is the core file that runs the WebSync editor.

    Copyright (c) 2013. All Rights reserved.

    Tristan Rice
    rice (at) outerearth (dot) net
    http://tristanrice.name/
*/
// Variable: object WebSync;
// This is the core of WebSync. Everything is stored under the WebSync object except for websocket authentication information which is under WebSyncAuth, and the main WebSyncData object.
define('websync',{
    // Variable: object WebSync.tmp;
    // Provides a location for temporary data to be stored.
    tmp: {},
    // Variable: boolean WebSync.webSocketFirstTime;
    // Websocket first connection?
	webSocketFirstTime: true,
    // Function: void WebSync.webSocketStart();
    // Creates the websocket for communication.
	webSocketStart: function(){
        var protocol = 'ws';
        if(window.location.protocol=='https:'){
            protocol = 'wss';
        }
		WebSync.connection = new WebSocket(protocol+"://"+window.location.host+window.location.pathname);
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
			WebSync.diffInterval = setInterval(WebSync.checkDiff,1000);
			$(".navbar-inner").removeClass("no-connection");
            $(document).trigger("connection");
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
                $(document).trigger("noconnection");
			}
			setTimeout(WebSync.webSocketStart,2000);
		},
		onmessage: function(e){
			console.log(e);
			data = JSON.parse(e.data);
			console.log("Message data:",data);
			if(data.type=="scripts"){
                // Load scripts from server.
				require(data.js);
			}
            else if(data.type=='data_patch'){
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
                    active: (sel.rangeCount>0),
                    startText: startText,
                    startOffset: startOffset,
                    endText: endText,
                    endOffset: endOffset
                }
                // Patch the HTML.
                //WebSyncData = jsondiffpatch.patch(WebSyncData,data.patch);
                //WebSync.oldData = JSON.parse(JSON.stringify(WebSyncData));
                WebSync.worker.postMessage({cmd:'apply_patch',html:WebSyncData,patch:data.patch});
                $(document).trigger("data_patch",{patch: data.patch});
            }
			else if(data.type=="name_update"){
				$("#name").text(data.name);
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
            else if(data.type=='info'){
                WebSync.clients = data['users'];
                var to_trigger = {};
                $.each(WebSync.clients,function(k,v){
                    if(!WebSync.users[v.id]){
                        to_trigger[v.id]=[k];
                        $.ajax({
                            url:"https://secure.gravatar.com/"+v.id+".json",
                            dataType:'jsonp',
                            timeout: 2000
                        }).done(function(data){
                            WebSync.users[v.id]=data.entry[0];
                        }).complete(function(){
                            $.each(to_trigger[v.id],function(i, item){
                                $(document).trigger('client_load',{client:item});
                            });
                        })
                        WebSync.users[v.id]={};
                    } else {
                        if(!to_trigger[v.id]){
                            $(document).trigger('client_load',{client:k});
                        } else {
                            to_trigger[v.id].push(k);
                        }
                    }
                });
            }
            else if(data.type=='new_user'){
                WebSync.clients[data['id']]=data['user'];
                var user_id = data['user'].id;
                var client_id = data['id']
                if(!WebSync.users[data['user'].id]){
                    $.ajax({
                        url:"https://secure.gravatar.com/"+data['user'].id+".json",
                        dataType:'jsonp'
                    }).done(function(data){
                        console.log(data);
                        WebSync.users[user_id]=data.entry[0];
                        $(document).trigger('client_load',{client:client_id});
                    }).fail(function(){
                        $(document).trigger('client_load',{client:client_id});
                    });
                    WebSync.users[data['user'].id]={};
                } else {
                    $(document).trigger('client_load',{client:data['id']});
                }
            }
            else if(data.type=='exit_user'){
                delete WebSync.clients[data['id']];
                $(document).trigger('client_leave',{client:data['id']});
            }
            else if(data.type=='client_event'){
                $(document).trigger('client_event_'+data.event,{from:data.from,data:data.data});
            }
		},
		onerror:function(e){
			console.log(e);
		}

	},
    broadcastEvent: function(event,data){
        WebSync.connection.sendJSON({type:'client_event',event: event, data: data});
    },
    users:{},
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
    // This is where the core of WebSync initializes.
	initialize: function(){
		this.webSocketStart();
        if(!WebSyncData.body){
            WebSyncData.body = [];
        }
        $(".page").html(JSONToDOM(WebSyncData.body));
        $("#public_mode").change(function(){
            WebSync.connection.sendJSON({type:'config',action:'set',property:'public',value: ($(this).val()=="Public")})
        });
		$("#name").blur(function(){
			var name = $(this).text();
			$(this).html(name);
            document.title = name+" - WebSync";
            WebSync.connection.sendJSON({type: "name_update", name: name});
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
                    $(".menu").animate({top: 0},200);
                    WebSync.menuVisible = true;
                }
                else if(e.pageY>85&&WebSync.menuVisible) {
                    $(".menu").animate({top: -85},200);
                    WebSync.menuVisible = false;
                }
            }
        });
        $('#view_mode').change(function(){
            var mode = $('#view_mode').val();
            WebSync.viewMode = mode;
            if(mode=='Zen'){
                $("body").addClass("zen").resize();
                $("#zoom_level").val("120%").change();
                $(".menu").animate({top:-85},200);
            }
            else {
                $("body").removeClass("zen").resize();
                $("#zoom_level").val("100%").change();
                $(".menu").animate({top: 0},200);
            }
        });
        require(['edit']);
		this.updateRibbon();
		rangy.init();
		console.log(rangy)
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
                if(data.patch){
                    setTimeout(function(){
                        WebSync.connection.sendJSON({type: "data_patch", patch: data.patch});
                    },10);
                }
            }
            else if(data.cmd=='patched'){
                WebSync.oldData = JSON.parse(JSON.stringify(data.json));
                WebSyncData = data.json;
                $(".content .page").get(0).innerHTML=JSONToDOM(WebSyncData.body);
                sel = WebSync.tmp.range;
                if(sel.active){
                    // Find all #text nodes.
                    var text_nodes = $(".page").find(":not(iframe)").addBack().contents().filter(function() {
                        return this.nodeType == 3;
                    });
                    var startText = sel.startText, startOffset = sel.startOffset, endText = sel.endText, endOffset = sel.endOffset;
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
            var offset = $(this).offset();
            var width = $(this).width();
            var active_pos = $("#ribbon_button_active").offset().left;
            var speed = Math.abs(offset.left-active_pos)*2;
            if(speed>500)
                speed = 0;
            $('#ribbon_button_active').animate({left:offset.left,width: width},speed,'linear');
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
        $(".page").get(0).normalize();
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
        $(".arrow").offset({left:$("#settingsBtn").parent().offset().left+15})
    },
    // Function: void WebSync.checkDiff();
    // This is an internal method that executes every couple of seconds while the client is connected to the server. It checks to see if there have been any changes to document. If there are any changes it sends a message to a Web Worker to create a patch to transmit.
	checkDiff: function(){
        if(!WebSyncData.body){
            WebSyncData.body = {};
        }
        if(!WebSync.oldData){
            WebSync.oldDataString = JSON.stringify(WebSyncData);
            WebSync.oldData = JSON.parse(WebSync.oldDataString);
        }
		WebSyncData.body = DOMToJSON($(".page").get(0).childNodes);
        var stringWebSync = JSON.stringify(WebSyncData);
		if(stringWebSync!=WebSync.oldDataString){
            // Send it to the worker thread for processing.
            var msg = {'cmd':'diff','oldHtml':WebSync.oldData,'newHtml':WebSyncData};
            WebSync.worker.postMessage(msg);
            WebSync.oldData = JSON.parse(stringWebSync);
            WebSync.oldDataString = stringWebSync;
            /*var patch = jsondiffpatch.diff(WebSync.oldData,WebSyncData);
            if(patch){
                WebSync.connection.sendJSON({type: "data_patch", patch: patch});
			    WebSync.oldData = JSON.parse(JSON.stringify(WebSyncData));
            }*/
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
        var selection = getSelection();
        if(selection.type=="None"){
            return {};
        }
        var selNode = getSelection().baseNode.parentNode;
        if(WebSync.tmp.lastSelNode == selNode){
            return WebSync.tmp.lastSelCss;
        }
        else {
            var css_object = $(selNode).getStyleObject();
            WebSync.tmp.lastSelCss=css_object;
            WebSync.tmp.lastSelNode = selNode;
            return css_object;
        }
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
});
dmp = new diff_match_patch();
function NODEtoJSON(obj){
    var jso = {
        name: obj.nodeName,
        childNodes:[]
    }
    if(obj.nodeName=="#text"){
        jso.textContent = obj.textContent;
    }
    if(obj.attributes){
        $.each(obj.attributes,function(k,v){
            // TODO: Add blacklist of classnames & attributes for DOM serialization.
            if(v.name!="contenteditable"){
                jso[v.name]=v.value;
            }
        });
    }
    $.each(obj.childNodes,function(index,child){
        jso.childNodes.push(NODEtoJSON(child));
    });
    if(_.isEmpty(jso.childNodes)){
        delete jso.childNodes;
    }
    return jso;
}
function DOMToJSON(obj){
    var jso = [];
    $.each(obj,function(index, elem){
        elem.normalize();
        jso.push(NODEtoJSON(elem));
    });
    return jso;
}
function NODEtoDOM(obj){
    var html = "";
    if(obj.name=="#text"){
        return obj.textContent;
    }
    html+="<"+obj.name;
    $.each(obj,function(k,v){
        if(k!="name"&&k!="textContent"&&k!="childNodes"){
            html+=" "+k+"="+JSON.stringify(v);
        }
    });

    if(obj.childNodes){
        html+=">";
        $.each(obj.childNodes,function(index, elem){
            html+= NODEtoDOM(elem);
        });
        html+="</"+obj.name+">";
    }
    else {
        html+="/>";
    }
    return html;
}
function JSONToDOM(obj){
    var html = "";
    $.each(obj,function(index,elem){
        html += NODEtoDOM(elem);
    });
    return html;
}
// Finds differences between obj1 and obj2.
function diff(obj1, obj2){
    var diffs = {}
    if(_.isEqual(obj1,obj2)){
    } else if(typeof(obj2)=='undefined'){
        diffs = {op:'delete'}
    } else if(typeof(obj1)!=typeof(obj2)){
        diffs = {op:'replace',new:obj2};
    } else if(typeof(obj1)=="string"){
        diffs = {op:'patch',patch:dmp.patch_toText(dmp.patch_make(obj1,obj2))}
    } else if($.isArray(obj1)){
        diffs = [];
        var C = []
        // Generate a table of matching areas.
        $.each(obj2,function(i1,val1){
            C[i1]=[]
            $.each(obj1,function(i2,val2){
                if(_.isEqual(val1,val2)){
                    C[i1][i2]=true;
                }
            });
        });
        log_array(C);
        // First pass through C looking for non-matching patterns found in the new array.
        var last_i2 = 0;
        var last_i1 = 0;
        $.each(C,function(i1,R){
            var exists = false;
            $.each(R,function(i2,val){
                // This deletes duplicates.
                if(val&&exists){
                    delete C[i1][i2];
                } else if(val){
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
                    for(var y=(last_i2);y<i2;y++){
                        for(var b=(i1+1);b<C.length;b++){
                            // Prune the rest of the false positives on this line.
                            delete C[b][y];
                        }
                    }
                    last_i2 = i2;
                    last_i1 = i1;
                }
            });
            if(!exists){
                var action = {op:'new',new:obj2[i1],index:i1}
                last_i2++;
                for(var x=(i1+1);x<C.length;x++){
                        // Prune the rest of the false positives on this line.
                    delete C[x][last_i2];
                }
                diffs.push(action)
            }
        });
        // Second pass through C looking for non-matching patterns found in the old array.
        for(var i1=0;i1<obj1.length;i1++){
            var exists = false;
            for(var i2=0;i2<obj2.length;i2++){
                if(C[i2][i1]){
                    exists = true;
                }
            }
            if(!exists){
                diffs.push({op:'delete',index:i1})
            }
        }//*/
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
        $.each(obj1, function(k,v){
            var val = diff(v,obj2[k]);
            if(!_.isEmpty(val)){
                diffs[k]=val;
            }
        });
    }
    return diffs;
}
function log_array(arr){
    var output = "";
    $.each(arr,function(i1,R){
        var exists = false;
        $.each(R,function(i2,val){
            if(val){
                output+='0';
            } else {
                output+=' ';
            }
        });
        output += "\n";
    });
    console.log(output);

}
WebSocket.prototype.sendJSON = function(object){
	this.send(JSON.stringify(object));
}
function capitaliseFirstLetter(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

requirejs.config({
    baseUrl: 'assets'
});
require(['websync'],function(websync){
    window.WebSync = websync;
    WebSync.initialize();
});
