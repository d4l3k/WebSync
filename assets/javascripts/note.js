// WebSync: Notebook layout handler
define("/assets/note.js",['websync'], function(websync) { var self = this;
    console.log("Notes loaded");
    $(".content").hide().addClass("content-note").fadeIn();
    $(".content").append($('<div id="note-well" class="content_container"></div>'));
    $('body').append($('<div id="note-nav" class="sidebar"><button id="addSection" class="btn" type="button">Add Section</button><button id="addPage" class="btn" type="button">Add Page</button><div id="notesView" class="well"></div></div>'));    
    self.updateNav = function(){
        var html = "<ul class='nav nav-list'>";
        var active_section = $(".note-section:visible")[0];
        var active_page = $(".note-page:visible")[0];
        $(".note-section").each(function(index, section){
            var sect = $(section);
            var name = (section.dataset.name||"Unnamed Section");
            html += "<li "+(section==active_section ? "class='active2'" : "" )+"><a class='section' data-index="+index+">"+name+"</a><ul class='nav nav-list'>"
            sect.children().each(function(index, page){
                var page_name = ($(page).children().filter(".note-title").text().trim() || $(page).children().filter(":not('.note-title')").first().text().trim() || "Unnamed Page"); 
                html += "<li "+(page==active_page ? "class='active'" : "" )+"><a class='page' data-index="+index+">"+page_name+"</a></li>";
            });
            html += "</ul></li>";
        });
        html+= "</ul>";
        var nav = $("#notesView").html(html);
    }
    self.deselectNoteBubble = function(){
        // TODO: Remove empty bubbles;
        $("#note-well .note-page section").attr("contenteditable",null).filter(":not('.note-title')").each(function(index, section){
            if(section.innerText.trim()==""){
                $(section).remove();
            }
        });
        self.updateNav();
    }
    self.switchToSection = function(section){
        $(".note-section").hide();
        $(".note-section").eq(section).show();
    }
    self.switchToPage = function(section, page){
        self.switchToSection(section);
        $(".note-page").hide();
        $(".note-section").eq(section).children().eq(page).show();
        self.updateNav();
    }
    if(!WebSyncData.body){
        WebSyncData.body = [];
    }
    WebSync.toJSON = function() {
        WebSyncData.body = DOMToJSON($("#note-well").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $(".content #note-well").get(0).innerHTML=JSONToDOM(WebSyncData.body);
        self.updateNav();
    }
    if(_.isEmpty(WebSyncData.body)){
        $("#note-well").append("<div class='note-section'><div class='note-page'><section class='note-title frozen'></section></div>");
    }
    else {
        WebSync.fromJSON();
    }
    if(WebSyncAuth.view_op=='edit'){
    }
    $(".content_well").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    $("#note-well").on("click",".note-page section",function(e){
        self.deselectNoteBubble();
        $(e.currentTarget).attr("contenteditable",true);
        e.stopPropagation();
    });
    $("#addSection").on("click",function(e){
        self.deselectNoteBubble();
        $(".note-section").hide();
        $("#note-well").append("<div class='note-section'><div class='note-page'><section class='note-title frozen'></section></div>");
        self.updateNav();
    });
    $("#addPage").on("click",function(e){
        self.deselectNoteBubble();
        $(".note-page").hide();
        $(".note-section:visible").eq(0).append("<div class='note-page'><section class='note-title frozen'></section>");
        self.updateNav();
    });
    $("#note-well").on("click",".note-page",function(e){
        console.log(e);
        self.deselectNoteBubble();
        var page = e.currentTarget;
        var note = $("<section></section")
        $(page).append(note);
        note.attr("contenteditable",true).focus();
        note.css({left:e.offsetX-16,top:e.offsetY-note.outerHeight()/2});
    });
    $("#notesView").on("click",".section",function(e){
        var section = e.currentTarget.dataset.index;
        self.switchToPage(section, 0);
    }).on("click", ".page",function(e){
        var section = parseInt(e.currentTarget.parentElement.parentElement.parentElement.childNodes[0].dataset.index);
        var page = e.currentTarget.dataset.index;
        self.switchToPage(section,page);
    });
    return self;
});
