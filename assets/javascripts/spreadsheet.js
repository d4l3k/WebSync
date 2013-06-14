// WebSync: Page layout handler
define("/assets/spreadsheet.js",['websync'], function(websync) { var self = this;
    console.log("Spreadsheet loaded");
    $(".content").hide().addClass("content-spreadsheet").fadeIn();
    $(".content").append($('<div id="spreadsheetWell" class="content_container"><table><tbody id="tableInner"></tbody></table></div>'));
    if(!WebSyncData.body){
        WebSyncData.body = [];
    }
    WebSync.toJSON = function() {
		WebSyncData.body = DOMToJSON($("#tableInner").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $("#tableInner").get(0).innerHTML=JSONToDOM(WebSyncData.body);
    }
    if(_.isEmpty(WebSyncData.body)){
        console.log("Appending!!!");
        for(var r=0;r<50;r++){
            var row = $("<tr></tr>").appendTo($("#tableInner"));
            for(var c=0;c<50;c++){
                $("<td></td>").appendTo(row);
            }
        }
    }
    else {
        WebSync.fromJSON();
    }
    if(WebSyncAuth.view_op=='edit'){
        //$(".slide").attr("contenteditable",true);
    }
	$(".content_well").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    return self;
});
