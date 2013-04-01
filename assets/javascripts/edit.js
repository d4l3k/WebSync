// Web-Sync: Text Editing Plugin
WebSync.register("TextEdit",function(){ var self = this;
	// Enable: This is where everything should be setup.
	// Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.Tables", clickHandler);
	// Unbind Example: $("*").unbind(".Tables");
    // Function: void [plugin=TextEdit].enable();
    // Enables the TextEdit plugin.
	this.enable = function(){
        self.text_buttons= ["bold",'italic','strikethrough','underline','justifyleft','justifycenter','justifyright','justifyfull',"removeFormat","insertorderedlist","insertunorderedlist"];
        // Add ribbon text
        $(".ribbon").append('<div id="Text" class="container"> \
				<button id="bold" title="Bold" class="btn"><i class="icon-bold"></i></button> \
				<button id="italic" title="Italic" class="btn"><i class="icon-italic"></i></button> \
				<button id="strikethrough" title="Strikethrough" class="btn"><i class="icon-strikethrough"></i></button> \
				<button id="underline" title="Underline" class="btn"><i class="icon-underline"></i></button> \
				<select id="font" title="Font" class="ribbon_button"> \
				</select> \
				<select id="font_size" title="Font Size" class="ribbon_button"> \
					<option>8pt</option> \
					<option>10pt</option> \
					<option>11pt</option> \
					<option>12pt</option> \
					<option>14pt</option> \
					<option>24pt</option> \
					<option>36pt</option> \
				</select> \
				<div class="btn-group"> \
					<button id="justifyleft" title="Justify Left" class="btn"><i class="icon-align-left"></i></button> \
					<button id="justifycenter" title="Justify Center" class="btn"><i class="icon-align-center"></i></button> \
					<button id="justifyright" title="Justify Right" class="btn"><i class="icon-align-right"></i></button> \
					<button id="justifyfull" title="Justify Full" class="btn"><i class="icon-align-justify"></i></button> \
				</div> \
				<button id="insertunorderedlist" title="Unordered List" class="btn"><i class="icon-list-ul"></i></button> \
				<button id="insertorderedlist" title="Ordered List" class="btn"><i class="icon-list-ol"></i></button> \
				<button id="removeFormat" title="Clear Formatting" class="btn"><i class="icon-remove"></i></button> \
			</div>');
        self.text_buttons.forEach(function(elem){
			$('button#'+elem).bind("click.TextEdit",function(){
				document.execCommand(elem);
				//$(this).toggleClass("active");
				$(document).trigger('selectionchange');
			});
		});
        // Setup font list.
        self.fontsInit();
        // Reflects text in menu at top
		$(document).bind('selectionchange.TextEdit',function(){
			if(!self._selectTimeout){
				self._selectTimeout = setTimeout(self.selectHandler,200);
			}
		});
		$('#font').bind("change.TextEdit",function(){
			document.execCommand('fontname',false,$('#font').val());
		});
		$('#font_size').change(function(){
			var size = $('#font_size').val()
			console.log(size);
			WebSync.applyCssToSelection({'font-size':size});
		});
    }
    // Function: void [plugin=TextEdit].disable();
    // Disables the TextEdit plugin.
    this.disable = function(){
		var elem = $("#Text").remove();
		WebSync.updateRibbon();
		$("*").unbind(".TextEdit");
		$("*").undelegate(".TextEdit");
    }
    // Function: void [plugin=TextEdit].selectHandler();
    // Handling function for displaying accurate information about text in ribbon.
    this.selectHandler = function(){
		var style = WebSync.getCss();
		$('#font_size').val(Math.round(parseInt(style.fontSize)*(0.75))+"pt");

		self.text_buttons.forEach(function(elem){
			var button = $('button#'+elem)
			if(document.queryCommandState(elem)){
				button.addClass("active");
			}
			else {
				button.removeClass('active');
			}
		});
		$('#font').val(capitaliseFirstLetter(document.queryCommandValue('fontname').split("'").join("")));
		clearTimeout(self._selectTimeout);
		self._selectTimeout = null;
	}
    // Function: void [plugin=TextEdit].fontsInit();
    // Sets up the list of fonts
	this.fontsInit = function(){
		var fonts = ["Cursive","Monospace","Serif","Sans-serif","Fantasy","Arial","Arial Black","Arial Narrow","Arial Rounded MT Bold","Bookman Old Style","Bradley Hand ITC","Century","Century Gothic","Comic Sans MS","Droid Sans","Courier","Courier New","Georgia","Gentium","Impact","King","Lucida Console","Lalit","Modena","Monotype Corsiva","Papyrus","TeX","Times","Times New Roman","Trebuchet MS","Tahoma","Verdana","Verona",'Helvetica','Segoe'];
    	var d = new Detector();
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
   	}

});
