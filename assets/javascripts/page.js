// WebSync: Page layout handler
define("/assets/page.js",['websync'], function(websync) { var self = this;
    console.log("Page loaded");
    $(".content").hide().append($('<div class="page"></div>')).addClass("content-page").fadeIn();
    if(!WebSyncData.body){
        WebSyncData.body = [];
    }
    if(WebSyncAuth.view_op=='edit'){
        $(".page").attr("contenteditable",true);
    }
    $(".page").html(JSONToDOM(WebSyncData.body));
    WebSync.toJSON = function() {
		WebSyncData.body = DOMToJSON($(".page").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $(".content .page").get(0).innerHTML=JSONToDOM(WebSyncData.body);
    }
	$(".content").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    return self;
});
