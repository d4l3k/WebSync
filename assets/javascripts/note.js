// WebSync: Notebook layout handler
define("/assets/note.js",['websync'], function(websync) { var self = this;
    console.log("Notes loaded");
    $(".content").hide().addClass("content-note").fadeIn();
    $(".content").append($('<div id="note-well" class="content_container"></div>'));
    $('body').append($('<div id="note-nav" class="sidebar"><button id="addSection" class="btn" type="button">Add Section</button><div id="notesView"></div></div>'));    
    if(!WebSyncData.body){
        WebSyncData.body = [];
    }
    WebSync.toJSON = function() {
        WebSyncData.body = DOMToJSON($("#note-well").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $(".content #note-well").get(0).innerHTML=JSONToDOM(WebSyncData.body);
    }
    if(_.isEmpty(WebSyncData.body)){
        $("#note-well").append("<div class='note-section'><div class='note-page'><section class='note-title frozen'></section></div>");
    }
    else {
        WebSync.fromJSON();
    }
    if(WebSyncAuth.view_op=='edit'){
    }
	function deselectNoteBubble(){
        // TODO: Remove empty bubbles;
        $("#note-well .note-page section").attr("contenteditable",null).each(function(index, section){
            if(section.innerText.trim()==""){
                $(section).remove();
            }
        });
    }
    $(".content_well").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    $("#note-well").on("click",".note-page section",function(e){
        deselectNoteBubble();
        $(e.currentTarget).attr("contenteditable",true);
        e.stopPropagation();
    });
    $("#note-well").on("click",".note-page",function(e){
        console.log(e);
        deselectNoteBubble();
        var page = e.currentTarget;
        var note = $("<section></section")
        $(page).append(note);
        note.attr("contenteditable",true).focus();
        note.css({left:e.offsetX-16,top:e.offsetY-note.height()/2});
    });
    return self;
});
