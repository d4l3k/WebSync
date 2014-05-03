// WebSync: Page layout handler
define("/assets/page.js", ['websync'], function(websync) {
    var self = this;
    console.log("Page loaded");
    $(".content").hide().append($('<div class="content_container"><div class="page"></div></div>')).addClass("content-page").fadeIn();
    if (!WebSyncData.body) {
        WebSyncData.body = [];
    }
    if (WebSyncAuth.view_op == 'edit' && WebSyncAuth.access != "viewer") {
        $(".page").attr("contenteditable", true);
    }
    WebSync.toJSON = function() {
        WebSyncData.body = DOMToJSON($(".page").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $(".content .page").get(0).innerHTML = JSONToDOM(WebSyncData.body);
    }
    WebSync.setupDownloads("document", function() {
        return "<html><head><style>" + escapeHTML(WebSyncData.custom_css.join("\n")) + "</style></head><body>" + JSONToDOM(WebSyncData.body) + "</body></html>";
    });
    $(document).on("modules_loaded", function() {
        WebSync.fromJSON();
        WebSync.checkDiff();
        if (WebSyncData.html) {
            $(".content .page").first().append(WebSyncData.html);
            delete WebSyncData.html;
        }
        WebSync.checkDiff();
        NProgress.done();
    });
    $(".content_well").children().bind("mousedown selectstart", function(e) {
        e.stopPropagation();
    });
    return self;
});
