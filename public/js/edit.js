
WebSync = {
	start: function(){
		WebSync.connection = new WebSocket("ws://"+window.location.host+window.location.pathname);
		WebSync.connection.onopen = function(e){
			console.log(e);
			WebSync.diffInterval = setInterval(WebSync.checkDiff,1000);
		}
		WebSync.connection.onclose = function(e){
			console.log(e);
			clearInterval(WebSync.diffInterval);
		}
		WebSync.connection.onmessage = function(e){
			console.log(e);
		}
		WebSync.connection.onerror = function(e){
			console.log(e);
		}
		$(".content .page").keypress(WebSync.keypress);
		$("#name").blur(function(){
			WebSync.connection.sendJSON({type: "name_update", name: $("#name").text()});
		});
		$("#name").focus(function(){
			setTimeout(function(){
				document.execCommand('selectAll');
			},100);
		});
		var text_buttons = ["bold",'italic','strikethrough','underline','justifyleft','justifycenter','justifyright','justifyfull',"removeFormat"];
		text_buttons.forEach(function(elem){
			$('button#'+elem).click(function(){
				document.execCommand(elem);
				$(document).trigger('selectionchange');
			});
		});
		$(document).on('selectionchange',function(){
			text_buttons.forEach(function(elem){
				if(document.queryCommandState(elem)){
					$('button#'+elem).addClass("active");
				}
				else {
					$('button#'+elem).removeClass('active');
				}
			});
			$('#font').val(capitaliseFirstLetter(document.queryCommandValue('fontname').split("'").join("")));
			$('#font_size').val(document.queryCommandValue('fontsize'));
		});
		$('#font').change(function(){
			document.execCommand('fontname',false,$('#font').val());
		});
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
			document.execCommand('fontsize',false,size);
		});
		WebSync.fontsInit();
		WebSync.updateRibbon();
		WebSync.dmp = new diff_match_patch();
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
		$($('#ribbon_buttons li').get(0)).click();
	},
	keypress: function(e){
		console.log(e);
		$(".page").each(function(page,list,index){
			console.log(page,list);	
		});
	},
	showHTML: function(){
		$('.page').html("<code>"+$('.page').html()+"</code>");
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
	    fonts.push("Tahoma");
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
	checkDiff: function(){
		var new_html = $(".content .page").html();
		if(!WebSync.old_html){
			WebSync.old_html = new_html;
		}

		if(new_html!=WebSync.old_html){
			// Create a patch
			var diffs = WebSync.dmp.diff_main(WebSync.old_html,new_html);
			var patches = WebSync.dmp.patch_make(diffs);
			var patch_text = WebSync.dmp.patch_toText(patches)
			console.log("Patch text: ",patch_text);
			var diffsHTML = WebSync.diff_htmlMode(WebSync.old_html,new_html);
			var patchesHTML = WebSync.dmp.patch_make(diffsHTML);
			var patch_textHTML = WebSync.dmp.patch_toText(patchesHTML)
			console.log("Patch text HTML: ",patch_textHTML);
			WebSync.connection.sendJSON({type: "text_patch", patch: patch_text});
			/*
			 * Old text replace method
			WebSync.connection.sendJSON({type: "text_update",text: new_html.trim()})
			*/
			WebSync.old_html=new_html;
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
$(document).ready(function(){
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
				chars = chars.replace(line,String.fromCharCode(100000+lineHash[line]));
			} else {
				chars = chars.replace(line,String.fromCharCode(100000+lineArrayLength));
				lineHash[line] = lineArrayLength;
				lineArray[lineArrayLength++] = line;
			}
		}
		return chars;
	}

	var chars1 = diff_linesToCharsMunge_(text1);
	var chars2 = diff_linesToCharsMunge_(text2);
	console.log(chars1,chars2,lineArray);
	return {chars1: chars1, chars2: chars2, lineArray: lineArray};
}
diff_match_patch.prototype.diff_charsToHTML_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = ""+chars;
    for (var y = 0; y < lineArray; y++) {
      while(text!=(text=text.replace(String.fromCharCode(100000+y),lineArray[y]))){};
    }
    diffs[x][1] = text;
  }
};
});
