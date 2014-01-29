// WebSync: Page layout handler
define("/assets/presentation.js",['websync'], function(websync) { var self = {};
    $(".content").hide().fadeIn();
    $("body").addClass("layout-presentation");
    $(".content").append($('<div id="slides" class="content_container"></div>'));
    $('body').append($('<div id="presentation-nav" class="sidebar"><button id="addSlide" class="btn btn-default" type="button">Add Slide</button> <button id="remSlide" class="btn btn-danger" type="button">Delete Slide</button><div id="slideView" class="slideWell"></div></div>'));
    $('#presentation-nav').css({left: 0});
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
    WebSync.toJSON = function() {
		WebSyncData.body = DOMToJSON($("#slides").get(0).childNodes);
        setTimeout(self.updateMenu,50);
    }
    WebSync.fromJSON = function() {
        $(".content_well #slides").get(0).innerHTML=JSONToDOM(WebSyncData.body);
        // TODO: Get rid of the cause of this patch.
        //$(".slide").appendTo($("#slides"));
        if(WebSyncAuth.view_op=='edit'){
            $("#slides .slide").attr("contenteditable",true);
        }
        setTimeout(self.updateScale,200);
    }
    $("#presentation-nav #slideView").delegate(".slidePreview","click",function(){
        $(".slide.active").removeClass('active');
        $(".slidePreview.active").removeClass('active');
        $(this).addClass("active");
        $($(".slide").get($(this).data().index)).addClass("active");
    });
    $(document).on("diffed.Presentation", self.updateMenu);
    self.updateMenu = function(){
        $("#slideView").html("");
        $(".slide").each(function(index, slide){
            $("<div class='slidePreview "+($(slide).hasClass("active") ? "active" : "") +"'><span class='slide'>"+$(slide).html()+"</span></div>").attr("style",$(slide).attr("style")).appendTo($("#slideView")).data({index:index});
        });
    };
    self.renderElem = function(elem, attach){
        var doc = document.implementation.createHTMLDocument("");
        doc.write($(elem).html());
        doc.documentElement.setAttribute("xmlns", doc.documentElement.namespaceURI);
        html = (new XMLSerializer).serializeToString(doc);
        console.log(html);
        var canvas = document.createElement("canvas")
        canvas.setAttribute("width", $(elem).width());
        canvas.setAttribute("height", $(elem).height());
        var ctx = canvas.getContext("2d");
        var data = "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>" +
                     "<foreignObject width='100%' height='100%'>" +
                        html
                     "</foreignObject>" +
                   "</svg>";
        var DOMURL = window.URL || window.webkitURL || window;
        var img = new Image();
        var svg = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
        var url = DOMURL.createObjectURL(svg);
        console.log(url);
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            //DOMURL.revokeObjectURL(url);
        };
        img.src = url;
        $(attach).append(img);
    }
	$(".content_well").children().bind("mousedown selectstart",function(e){ e.stopPropagation(); });
    $(document).keydown(function(e){
        if(WebSyncAuth.view_op=="view"){
            if(e.keyCode==39||e.keyCode==32||e.keyCode==40){
                // Move forward a slide
                var cur_slide = $(".slidePreview.active").data().index;
                var next_slide = cur_slide+1;
                var slide_num = $("#slides .slide").length;
                if(next_slide<slide_num){
                    $(".slide.active").removeClass('active');
                    $(".slidePreview.active").removeClass('active');
                    $($("#slides .slide").get(next_slide)).addClass("active");
                    $($(".slidePreview").get(next_slide)).addClass("active");
                }
                e.preventDefault();
            } else if(e.keyCode==37||e.keyCode==38){
                // Move back a slide
                var cur_slide = $(".slidePreview.active").data().index;
                var next_slide = cur_slide-1;
                if(next_slide>=0){
                    $(".slide.active").removeClass('active');
                    $(".slidePreview.active").removeClass('active');
                    $($("#slides .slide").get(next_slide)).addClass("active");
                    $($(".slidePreview").get(next_slide)).addClass("active");
                }
                e.preventDefault();
            }
        }
    });
    self.updateScale = function(){
        var well_rect = $(".content_well").get(0).getBoundingClientRect();
        var content_rect = $(".content_container .slide.active");
        var width_scale = well_rect.width/(content_rect.width()+60);
        var height_scale = well_rect.height/(content_rect.height()+65);
        var zoom = (width_scale>height_scale)*height_scale + (width_scale<=height_scale)*width_scale;
        WebSync.setZoom(zoom);
    }
    $(window).bind("resize",self.updateScale);
    WebSync.fromJSON();
    $(window).resize();
    return self;
});
