// WebSync: Page layout handler
define("/assets/presentation.js",['websync'], function(websync) { var self = this;
    $(".content").hide().addClass("content-presentation").fadeIn();
    $(".content").append($('<div id="slides"></div>'));
    $('body').append($('<div id="presentation-nav" class="sidebar"><button id="addSlide" class="btn" type="button">Add Slide</button><div id="slideView" class="slideWell"></div></div>'));
    $('#presentation-nav').css({left: -252}).animate({left:0},200);
    $('.content_well').animate({left: 252},200)
    $("#addSlide").click(function(){
        $(".slide.active").removeClass('active');
        $("<div class='slide active'></div>").appendTo($('#slides'));
        self.updateMenu();
    });
    if(!WebSyncData.body){
        WebSyncData.body = [];
    }
    if(WebSyncAuth.view_op=='edit'){
        //$(".page").attr("contenteditable",true);
    }
    WebSync.toJSON = function() {
		WebSyncData.body = DOMToJSON($("#slides").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        $(".content_well #slides").get(0).innerHTML=JSONToDOM(WebSyncData.body);
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
            $("<div class='slidePreview "+($(slide).hasClass("active") ? "active" : "") +"'>Blah</div>").appendTo($("#slideView")).data({index:index});
        });
    };
	$("#pages").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    WebSync.fromJSON();
    return self;
});
