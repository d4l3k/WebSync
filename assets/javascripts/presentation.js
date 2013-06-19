// WebSync: Page layout handler
define("/assets/presentation.js",['websync'], function(websync) { var self = this;
    $(".content").hide().fadeIn();
    $("body").addClass("layout-presentation");
    $(".content").append($('<div id="slides" class="content_container"></div>'));
    $('body').append($('<div id="presentation-nav" class="sidebar"><button id="addSlide" class="btn" type="button">Add Slide</button> <button id="remSlide" class="btn btn-danger" type="button">Delete Slide</button><div id="slideView" class="slideWell"></div></div>'));
    $('#presentation-nav').css({left: -1});
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
	$(".content_well").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    $(document).keydown(function(e){
        if(WebSyncAuth.view_op=="view"){
            if(e.keyCode==39||e.keyCode==32||e.keyCode==40){
                // Move forward a slide
                var cur_slide = $(".slidePreview.active").data().index;
                $(".slide.active").removeClass('active');
                $(".slidePreview.active").removeClass('active');
                var next_slide = cur_slide+1;
                var slide_num = $(".slide").length;
                if(next_slide>=slide_num){
                    next_slide = slide_num -1;
                }
                $($(".slide").get(next_slide)).addClass("active");
                $($(".slidePreview").get(next_slide)).addClass("active");
                e.preventDefault();
            } else if(e.keyCode==37||e.keyCode==38){
                // Move back a slide
                var cur_slide = $(".slidePreview.active").data().index;
                $(".slide.active").removeClass('active');
                $(".slidePreview.active").removeClass('active');
                var next_slide = cur_slide-1;
                if(next_slide<=0){
                    next_slide = 0;
                }
                $($(".slide").get(next_slide)).addClass("active");
                $($(".slidePreview").get(next_slide)).addClass("active");
                e.preventDefault();
            }
        }
    });
    $(window).bind("resize keydown",function(){
        var well_rect = $(".content_well").get(0).getBoundingClientRect();
        var content_rect = $(".slide.active");
        var width_scale = well_rect.width/(content_rect.width()+60);
        var height_scale = well_rect.height/(content_rect.height()+65);
        var zoom = (width_scale>height_scale)*height_scale + (width_scale<=height_scale)*width_scale;
        $(".content_well").children().css({"transform":"scale("+zoom.toFixed(3)+")"});
    });
    WebSync.fromJSON();
    $(window).resize();
    return self;
});
