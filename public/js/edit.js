/*
    Web-Sync: Edit.js
    This is the core file that runs the Web-Sync editor.

    Copyright (c) 2013. All Rights reserved.

    Tristan Rice
    rice (at) outerearth (dot) net
    http://tristanrice.name/
*/
WebSync = {
	webSocketFirstTime: true,
	webSocketStart: function(){
		WebSync.connection = new WebSocket("ws://"+window.location.host+window.location.pathname);
		WebSync.connection.onopen = WebSync.webSocketCallbacks.onopen;
		WebSync.connection.onclose = WebSync.webSocketCallbacks.onclose;
		WebSync.connection.onmessage = WebSync.webSocketCallbacks.onmessage;
		WebSync.connection.onerror = WebSync.webSocketCallbacks.onerror;
	},
	webSocketCallbacks: {
		onopen: function(e){
			console.log(e);
			WebSync.diffInterval = setInterval(WebSync.checkDiff,1000);
			$(".navbar-inner").removeClass("no-connection");
			$("#connection_msg").remove();
			if(WebSync.webSocketFirstTime){
				WebSync.webSocketFirstTime = false;
				WebSync.connection.sendJSON({type:'connect'});
				WebSync.loadScripts();
			} else {
				WebSync.connection.sendJSON({type:'reconnect'});
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
                // Patch the HTML.
                var new_html = WebSync.getHTML();
                var patches = WebSync.dmp.patch_fromText(data.patch);
                var result = WebSync.dmp.patch_apply(patches,new_html)[0];
                // Set HTML. We don't use jQuery because it screws more things up. .html() clears the text then sets it.
				$(".content .page").get(0).innerHTML=result;
                if(sel.rangeCount>0){
                    // Find all #text nodes.
                    var text_nodes = $(".page").find(":not(iframe)").addBack().contents().filter(function() {
                        return this.nodeType == 3;
                    });
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
                WebSync.old_html = WebSync.getHTML();
            }
			else if(data.type=="name_update"){
				$("#name").text(data.name);
			}
			else if(data.type="text_update"){
				$(".content .page").get(0).innerHTML=data.text;
				WebSync.old_html = data.text;
			}
		},
		onerror:function(e){
			console.log(e);
		}

	},
	start: function(){
		WebSync.webSocketStart();
		$(".content .page").keydown(WebSync.keypress);
		$("#name").keyup(function(){
			var div = $("#name").get(0);
			div.innerHTML = div.innerText;
		});
		$("#name").blur(function(){
			$(this).html($(this).text());
			WebSync.connection.sendJSON({type: "name_update", name: $("#name").text()});
		});
		$("#name").focus(function(){
			/*setTimeout(function(){
				document.execCommand('selectAll');
			},100);*/
		});
		WebSync.text_buttons.forEach(function(elem){
			$('button#'+elem).click(function(){
				document.execCommand(elem);
				//$(this).toggleClass("active");
				$(document).trigger('selectionchange');
			});
		});
		$(document).on('selectionchange',function(){
			if(!WebSync._selectTimeout){
				WebSync._selectTimeout = setTimeout(WebSync.selectHandler,200);
			}
		});
		$('#font').change(function(){
			document.execCommand('fontname',false,$('#font').val());
		});
		$(".menu, .content_well").bind("mousedown selectstart",function(){ return false; });
		$(".content").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
		$("#name, select").bind("mousedown selectstart",function(e){ e.stopPropagation(); });
		$('#font_size').change(function(){
			var size = $('#font_size').val()
			console.log(size);
			/*var applier = rangy.createCssClassApplier("fontsize",{
				normalize: true,
				elementTagName: 'font',
				elementProperties: {
					style: "font-size: 15pt;"
				}
			});
			applier.applyToSelection();*/
			WebSync.applyCssToSelection({'font-size':size});
		});
        $('#zoom_level').change(function(){
			var zoom = parseInt($('#zoom_level').val())/100.0
			$(".content").animate({"transform":"scale("+zoom+")"});
        });
		WebSync.fontsInit();
		WebSync.updateRibbon();
		WebSync.dmp = new diff_match_patch();
		rangy.init();
		console.log(rangy)
        WebSync.resize();
        $(window).resize(WebSync.resize);
		/*
		 * Cursor Blink
		 * For future other people.
		setInterval(function(){
			$("cursor").toggleClass("hidden");
		},1000);
		*/
        $('[data-toggle="tooltip"]').tooltip();
        $('[data-toggle="popover"]').popover().click(function(){
			$(this.parentElement).toggleClass("active");
		});
		WebSync.applier = rangy.createCssClassApplier("tmp");
		WebSync.setupWebRTC();
	},
	// WebRTC Peer functionality. This will be used for communication between Clients. Video + Text chat hopefully.
	setupWebRTC: function(){
		WebSync.createPeerConnection();
		WebSync.createDataChannel();
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
			return;
		}

		WebSync.pc.onaddstream = WebSync.onRemoteStreamAdded;
		WebSync.pc.onremovestream = WebSync.onRemoteStreamRemoved;
		WebSync.pc.ondatachannel = WebSync.onDataChannel;
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
	text_buttons: ["bold",'italic','strikethrough','underline','justifyleft','justifycenter','justifyright','justifyfull',"removeFormat","insertorderedlist","insertunorderedlist"],
	selectHandler: function(){
		var style = WebSync.getCss();
		$('#font_size').val(Math.round(parseInt(style.fontSize)*(0.75))+"pt");

		WebSync.text_buttons.forEach(function(elem){
			var button = $('button#'+elem)
			if(document.queryCommandState(elem)){
				button.addClass("active");
			}
			else {
				button.removeClass('active');
			}
		});
		$('#font').val(capitaliseFirstLetter(document.queryCommandValue('fontname').split("'").join("")));
		clearTimeout(WebSync._selectTimeout);
		WebSync._selectTimeout = null;
	},
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
	keypress: function(e){
		/*
		 * Pagination should go here probably.
		console.log(e);
		$(".page").each(function(page,list,index){
			console.log(page,list);
		});*/
	},
	loadScripts: function(){
		WebSync.connection.sendJSON({type: "load_scripts"});
	},
	showHTML: function(){
		$('.page').html("<code>"+WebSync.getHTML()+"</code>");
	},
	getHTML: function(){
		var html = $(".page").html().trim();
		// Remove other cursors.
		html = html.replace(/\<cursor[^\/]+\/?\<\/cursor\>/g,"")
		return html;
	},
	fontsInit: function(){
		var fonts = [];
    	var d = new Detector();
	    fonts.push("Cursive");
	    fonts.push("Monospace");
	    fonts.push("Serif");
	    fonts.push("Sans-serif");
	    fonts.push("Fantasy");
	    fonts.push("Arial");
	    fonts.push("Arial Black");
	    fonts.push("Arial Narrow");
	    fonts.push("Arial Rounded MT Bold");
	    fonts.push("Bookman Old Style");
	    fonts.push("Bradley Hand ITC");
	    fonts.push("Century");
	    fonts.push("Century Gothic");
	    fonts.push("Comic Sans MS");
		fonts.push("Droid Sans")
	    fonts.push("Courier");
	    fonts.push("Courier New");
	    fonts.push("Georgia");
	    fonts.push("Gentium")
		fonts.push("Impact");
	    fonts.push("King");
	    fonts.push("Lucida Console");
	    fonts.push("Lalit");
	    fonts.push("Modena");
	    fonts.push("Monotype Corsiva");
	    fonts.push("Papyrus");
	    fonts.push("TeX");
	    fonts.push("Times");
	    fonts.push("Times New Roman");
	    fonts.push("Trebuchet MS");
		fonts.push("Tahoma");
	    fonts.push("Verdana");
	    fonts.push("Verona");
		var font_list = [];
	    fonts = fonts.sort(function(a,b){
			if(a<b) return -1;
			if(a>b) return 1;
			return 0;
		});
		for (i = 0; i < fonts.length; i++) {
		    var result = d.detect(fonts[i]);
			if(result){
				font_list.push("<option>"+fonts[i]+"</option>");
			}
	    }
		$('#font').html(font_list.join("\n"));
   	},
    resize: function(){
        $(".content_well").height(window.innerHeight-$(".content_well").position().top)
    },
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
				// Create a patch
				/*var diffs = WebSync.dmp.diff_main(WebSync.old_html,new_html);
				var patches = WebSync.dmp.patch_make(diffs);
				var patch_text = WebSync.dmp.patch_toText(patches)
				console.log("Patch text: ",patch_text);*/
				var diffsHTML = WebSync.diff_htmlMode(WebSync.old_html,new_html);
                console.log(diffsHTML);
				var patchesHTML = WebSync.dmp.patch_make(diffsHTML);
				var patch_textHTML = WebSync.dmp.patch_toText(patchesHTML)
				console.log("Patch text HTML: ",patch_textHTML);
				WebSync.connection.sendJSON({type: "text_patch", patch: patch_textHTML});
				/*
				 * Old text replace method
				WebSync.connection.sendJSON({type: "text_update",text: new_html.trim()})
				*/
			}
			WebSync.old_html=new_html;
		}
	},
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
	diff_htmlMode: function (text1,text2){
		var a = WebSync.dmp.diff_htmlToChars_(text1,text2);
		var lineText1 = a.chars1;
		var lineText2 = a.chars2;
		var lineArray = a.lineArray;
		var diffs = WebSync.dmp.diff_main(lineText1,lineText2, false);
		WebSync.dmp.diff_charsToHTML_(diffs, lineArray);
		return diffs;
	},
	getCss: function(){
		/*WebSync.applier.toggleSelection();
		if($(".tmp").length==0) return {};
		return $(".tmp").removeClass("tmp").getStyleObject();*/
		return $(getSelection().baseNode.parentNode).getStyleObject();
	},
	// This is rather slow and shouldn't be overly used.
	applyCssToSelection: function(css){
		WebSync.applier.toggleSelection();
		$(".tmp").css(css).removeClass("tmp");
	},
	// This is where plugins register themselves.
	register: function(plugin){
		plugin = new plugin();
		console.log("Loading plugin:",plugin.name);
		WebSync.plugins[plugin.name]=plugin;
		WebSync.plugins[plugin.name].enable();
	},
	setCaretPosition: function(elem, caretPos) {
		if(elem != null) {
			if(elem.createTextRange) {
				var range = elem.createTextRange();
				range.move('character', caretPos);
				range.select();
			}
			else {
				if(elem.selectionStart) {
					elem.focus();
					elem.setSelectionRange(caretPos, caretPos);
				}
				else
					elem.focus();
			}
		}
	},
	plugins: {},
	setEndOfContenteditable: function(contentEditableElement)
	{
	    var range,selection;
	    if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
	    {
		range = document.createRange();//Create a range (a range is a like the selection but invisible)
		range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
		range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
		selection = window.getSelection();//get the selection object (allows you to change selection)
		selection.removeAllRanges();//remove any selections already made
		selection.addRange(range);//make the range you have just created the visible selection
	    }
	    else if(document.selection)//IE 8 and lower
	    {
		range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
		range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
		range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
		range.select();//Select the range (make it the visible selection
	    }
	},
	alert: function(msg){
		return WebSync.alert_msg(msg,"");
	},
	error: function(msg){
		return WebSync.alert_msg(msg,"alert-error");
	},
	success: function(msg){
		return WebSync.alert_msg(msg,"alert-success");
	},
	info: function(msg){
		return WebSync.alert_msg(msg,"alert-info");
	},
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
$(document).ready(WebSync.start);

// Create a diff after replacing all HTML tags with unicode characters.
diff_match_patch.prototype.diff_htmlToChars_ = function(text1, text2){
	var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
	var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

	// '\x00' is a valid character, but various debuggers don't like it.
	// So we'll insert a junk entry to avoid generating a null character.
	lineArray[0] = '';

	/**
	* Split a text into an array of strings.  Reduce the texts to a string of
	* hashes where each Unicode character represents one line.
	* Modifies linearray and linehash through being a closure.
	* @param {string} text String to encode.
	* @return {string} Encoded string.
	* @private
	*/
	function diff_linesToCharsMunge_(text) {
		var chars = ""+text;
		// Walk the text, pulling out a substring for each line.
		// text.split('\n') would would temporarily double our memory footprint.
		// Modifying text would create many large strings to garbage collect.
		var lineStart = 0;
		var lineEnd = -1;
		// Keeping our own length variable is faster than looking it up.
		var lineArrayLength = lineArray.length;
		while (lineEnd < text.length - 1) {
			var prevLineEnd = lineEnd;
			if(prevLineEnd==-1){
				prevLineEnd=0;
			}
			lineStart = text.indexOf('<',lineEnd);
			lineEnd = text.indexOf('>', lineStart);
			if (lineEnd == -1) {
				lineEnd = text.length - 1;
			}
			var line = text.substring(lineStart, lineEnd + 1);
			lineStart = lineEnd + 1;

			if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
				(lineHash[line] !== undefined)) {
				chars = chars.replace(line,String.fromCharCode(lineHash[line]));
			} else {
				chars = chars.replace(line,String.fromCharCode(lineArrayLength));
				lineHash[line] = lineArrayLength;
				lineArray[lineArrayLength++] = line;
			}
		}
		return chars;
	}

	var chars1 = diff_linesToCharsMunge_(text1);
	var chars2 = diff_linesToCharsMunge_(text2);
	return {chars1: chars1, chars2: chars2, lineArray: lineArray};
}
diff_match_patch.prototype.diff_charsToHTML_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = ""+chars;
    for (var y = 0; y < lineArray.length; y++) {
        var chara = String.fromCharCode(y);
        while(text.indexOf(chara)!=-1){
            var n_text=text.replace(chara,lineArray[y]);
            text=n_text;
        }
    }
    diffs[x][1] = text;
  }
};

function selectText(containerid) {
    if (document.selection) {
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        window.getSelection().addRange(range);
    }
}

