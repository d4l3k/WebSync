// WebSync: Page layout handler
define("/assets/page.js",['websync'], function(websync) { var self = this;
    console.log("Page loaded");
    $(".content").hide().append($('<div class="page content_container"></div>')).addClass("content-page").fadeIn();
    if(!WebSyncData.body){
        WebSyncData.body = [];
    }
    if(WebSyncAuth.view_op=='edit'){
        $(".page").attr("contenteditable",true);
    }
    WebSync.toJSON = function() {
		WebSyncData.body = DOMToJSON($(".page").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $(".content .page").get(0).innerHTML=JSONToDOM(WebSyncData.body);
    }
    $(document).on("modules_loaded", function(){
        WebSync.fromJSON();
        NProgress.done();
    });
	$(".content_well").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    return self;
});
