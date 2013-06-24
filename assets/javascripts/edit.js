// WebSync: Text Editing Plugin
define("edit",['websync'],function(websync){ var self = this;
	// Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.Tables", clickHandler);
	// Unbind Example: $("*").unbind(".Tables");
    // Function: void [plugin=TextEdit].enable();
    // Enables the TextEdit plugin.
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
                <option>9pt</option> \
                <option>10pt</option> \
                <option>11pt</option> \
                <option>12pt</option> \
                <option>13pt</option> \
                <option>14pt</option> \
                <option>15pt</option> \
                <option>16pt</option> \
                <option>17pt</option> \
                <option>18pt</option> \
                <option>19pt</option> \
                <option>20pt</option> \
                <option>21pt</option> \
                <option>22pt</option> \
                <option>23pt</option> \
                <option>24pt</option> \
                <option>25pt</option> \
                <option>26pt</option> \
                <option>27pt</option> \
                <option>28pt</option> \
                <option>29pt</option> \
                <option>30pt</option> \
                <option>31pt</option> \
                <option>32pt</option> \
                <option>33pt</option> \
                <option>34pt</option> \
                <option>35pt</option> \
                <option>36pt</option> \
                <option>37pt</option> \
                <option>38pt</option> \
                <option>39pt</option> \
                <option>40pt</option> \
                <option>41pt</option> \
                <option>42pt</option> \
                <option>43pt</option> \
                <option>44pt</option> \
                <option>45pt</option> \
                <option>46pt</option> \
                <option>47pt</option> \
                <option>48pt</option> \
                <option>72pt</option> \
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
    this.text_buttons.forEach(function(elem){
        $('button#'+elem).bind("click.TextEdit",function(){
            document.execCommand(elem);
            //$(this).toggleClass("active");
            $(document).trigger('selectionchange');
        });
    });
    // Reflects text in menu at top
    $(document).bind('selectionchange.TextEdit',function(){
        if(!self._selectTimeout){
            self._selectTimeout = setTimeout(self.selectHandler,200);
        }
    });
    $(".content_well").bind("keydown.TextEdit","li",function(e){
        //console.log(e);
        if(e.keyCode==9){
            //console.log(this);
            var selection = document.getSelection();
            if(selection.type!="None" && !_.isNull(selection.baseNode)){
                var list_index = selection.baseNode;
                while(list_index.tagName!="LI"){
                    list_index = list_index.parentElement;
                }
                var indent = parseInt($(list_index).getStyleObject().marginLeft)+(e.shiftKey ? -40 : 40);
                if(indent<0){
                    indent=0;
                }
                $(list_index).animate({marginLeft: indent+"px"},{duration:200,queue:true});
                e.preventDefault();
            }
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
    $("#picture").click(function(){
        /*
        //TODO: Keep position.
        bootbox.prompt("Enter image URL", function(result) {
            if (result === null) {
            } else {
                document.execCommand("insertImage", false, url);
            }
        });*/
        var url = prompt("Image URL");
        document.execCommand("insertImage", false, url);
    });
    $("#video").click(function(){
        var url = prompt("Video URL (Youtube)");
        if(url.indexOf("youtu")!=-1){
            var youtube_id = self.youtube_parser(url);
            console.log("Youtube id", youtube_id);
            var html = '<iframe class="resizable" type="text/html" src="https://www.youtube.com/embed/'+youtube_id+'?origin=http://websyn.ca" height=480 width=640 frameborder="0"/>'
            document.execCommand("insertHTML", false, html);
        }
    });
    // Youtube REGEX from http://stackoverflow.com/a/8260383 by Lasnv
    self.youtube_parser = function(url){
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match&&match[2].length==11){
            return match[2];
        }else{
            alert("Invalid URL");
        }
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
		$('#font').val(capitaliseFirstLetter(document.queryCommandValue('fontname').split(",")[0].split("'").join("")));
		clearTimeout(self._selectTimeout);
		self._selectTimeout = null;
	}
    // Sets up the list of fonts
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
    WebSync.updateRibbon();
});



