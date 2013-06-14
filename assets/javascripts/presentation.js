// WebSync: Page layout handler
define("/assets/presentation.js",['websync'], function(websync) { var self = this;
    $(".content").hide().addClass("content-presentation").fadeIn();
    $(".content").append($('<div id="slides"></div>'));
    $('body').append($('<div id="presentation-nav" class="sidebar"><button id="addSlide" class="btn" type="button">Add Slide</button> <button id="remSlide" class="btn btn-danger" type="button">Delete Slide</button><div id="slideView" class="slideWell"></div></div>'));
    $('#presentation-nav').css({left: -252}).animate({left:-1},200);
    $('.content_well').animate({left: 251},200)
    $("#addSlide").click(function(){
        $(".slide.active").removeClass('active');
        $("<div class='slide active'></div>").appendTo($('#slides'));
        self.updateMenu();
    });
    $("#remSlide").click(function(){
        var prev = $(".slide.active").prev();
        if(prev==[]){
            prev = $(".slide.active").next();
        }
        $(".slide.active").remove();
        prev.addClass("active");
        self.updateMenu();
    });
    if(!WebSyncData.body){
        WebSyncData.body = [];
    }
    if(WebSyncAuth.view_op=='edit'){
        $(".slide").attr("contenteditable",true);
    }
    WebSync.toJSON = function() {
		WebSyncData.body = DOMToJSON($("#slides").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $(".content_well #slides").get(0).innerHTML=JSONToDOM(WebSyncData.body);
        // TODO: Get rid of the cause of this patch.
        $(".slide").appendTo($("#slides"));
        self.updateMenu();
    }
    $("#presentation-nav #slideView").delegate(".slidePreview","click",function(){
        $(".slide.active").removeClass('active');
        $(".slidePreview.active").removeClass('active');
        $(this).addClass("active");
        $($(".slide").get($(this).data().index)).addClass("active");
    });
    self.updateMenu = function(){
        $("#slideView").html("");
        $(".slide").each(function(index, slide){
            console.log(slide);
            $("<div class='slidePreview "+($(slide).hasClass("active") ? "active" : "") +"'>Slide Number "+(index+1)+"</div>").appendTo($("#slideView")).data({index:index});
        });
    };
	$("#slides").bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    WebSync.fromJSON();
    return self;
});
