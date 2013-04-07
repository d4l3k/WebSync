importScripts('/assets/diff_match_patch.js');

dmp = new diff_match_patch();

function log(msg){
    self.postMessage({'cmd':'log','msg':msg});
}

self.onmessage = function(e) {
    var data = e.data;
    switch(data.cmd){
        case 'diff':
            var new_html = data.newHtml;
            var old_html = data.oldHtml;
            var blah = diff_htmlMode(old_html,new_html);
            var diffsHTML = blah[0];
            var lineArray = blah[1];
            dmp.diff_cleanupEfficiency(diffsHTML);
            var patchesHTML = dmp.patch_make(diffsHTML);
            var patch_textHTML = dmp.patch_toText(patchesHTML);
            //patch_textHTML = patchText2Html(patch_textHTML,lineArray);
            //log(fixedHtml);
            self.postMessage({'cmd':'diffed','diff': patch_textHTML});
            break;
        case 'apply_patch':
            var html = data.html;
            var patches = dmp.patch_fromText(data.patch);
            var result = dmp.patch_apply(patches,html)[0];
            self.postMessage({'cmd':'patched','html':result});
            break;
    }
}
diff_htmlMode = function (text1,text2){
		var a = dmp.diff_htmlToChars_(text1,text2);
		var lineText1 = a.chars1;
		var lineText2 = a.chars2;
		var lineArray = a.lineArray;
		var diffs = dmp.diff_main(lineText1,lineText2, false);
		dmp.diff_charsToHTML_(diffs, lineArray);
		return [diffs,lineArray];
}
// Create a diff after replacing all HTML tags with unicode characters.
diff_match_patch.prototype.diff_htmlToChars_ = function(text1, text2){
	var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
	var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

	// '\x00' is a valid character, but various debuggers don't like it.
	// So we'll insert a junk entry to avoid generating a null character.
	//lineArray[0] = '';

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
				chars = chars.replace(line,String.fromCharCode(1000000+lineHash[line]));
			} else {
				chars = chars.replace(line,String.fromCharCode(1000000+lineArrayLength));
				lineHash[line] = lineArrayLength;
				lineArray[lineArrayLength++] = line;
			}
		}
		return chars;
	}

	var chars1 = diff_linesToCharsMunge_(text1);
	var chars2 = diff_linesToCharsMunge_(text2);
    log(["Line array:",lineArray]);
	return {chars1: chars1, chars2: chars2, lineArray: lineArray};
}
diff_match_patch.prototype.diff_charsToHTML_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = ""+chars;
    for (var y = 0; y < lineArray.length; y++) {
        var chara = String.fromCharCode(1000000+y);
        while(text.indexOf(chara)!=-1){
            var n_text=text.replace(chara,lineArray[y]);
            text=n_text;
        }
    }
    diffs[x][1] = text;
  }
};
patchText2Html = function(patchText, lineArray) {
    var text = ""+patchText;
    for (var y = 0; y < lineArray.length; y++) {
        var chara = encodeURI(String.fromCharCode(1000000+y));
        while(text.indexOf(chara)!=-1){
            var n_text=text.replace(chara,encodeURI(lineArray[y]));
            text=n_text;
        }
    }
    return text;
}

