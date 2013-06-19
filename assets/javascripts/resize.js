define(['websync'],function(){ var self = {};
    $(".content_container").delegate("img, table:not('.content_container > table')", "click.Resize", function(e){
        if(WebSyncAuth.view_op=="edit"){
            self.resizeOn(this);
            e.stopPropagation();
        }
    });
    $(".content").bind("click.Resize", function(){
        self.resizeOff();
    });
    $(".content").delegate(".Resize.handle", "click.Resize", function(e){
        e.stopPropagation();
    });
    $(".content").delegate(".Resize.handle.bottom", "mousedown.Resize", function(e){
        console.log(e);
        self.drag = true;
        self.origY = e.pageY;
        self.origHeight = $(self.active).height();
        e.preventDefault();
    });
    $(".content").delegate(".Resize.handle.right", "mousedown.Resize", function(e){
        console.log(e);
        self.drag = true;
        self.origX = e.pageX;
        self.origWidth = $(self.active).width();
        e.preventDefault();
    });
    $(document).bind("mousemove.Resize", function(e){
        if(self.drag){
            if(self.origY){
                $(self.active).height(e.pageY-self.origY + self.origHeight);
            }
            if(self.origX){
                $(self.active).width(e.pageX-self.origX + self.origWidth);
            }
            self.updateHandles();
            e.preventDefault();
        }
    });
    $(document).bind( "mouseup.Resize", function(e){
        if(self.drag){
            console.log(e);
            e.preventDefault();
            self.origX = null;
            self.origY = null;
            self.origWidth = null;
            self.origHeight = null;
            self.drag = false;
        }
    });
    self.resizeOn = function(elem){
        console.log(elem);
        self.resizeOff();
        self.active = elem;
        // Add handle DIVs
        $(".content").append('<div class="Resize handle top left"></div>');
        $(".content").append('<div class="Resize handle top middle"></div>');
        $(".content").append('<div class="Resize handle top right"></div>');
        $(".content").append('<div class="Resize handle right middle"></div>');
        $(".content").append('<div class="Resize handle right bottom"></div>');
        $(".content").append('<div class="Resize handle bottom middle"></div>');
        $(".content").append('<div class="Resize handle bottom left"></div>');
        $(".content").append('<div class="Resize handle left middle"></div>');
        self.updateHandles();
    };
    self.updateHandles = function(){
        var offset = $(self.active).position();
        $(".Resize.handle.top").css({top: offset.top});
        $(".Resize.handle.left").css({left: offset.left});
        $(".Resize.handle.right").css({left: offset.left+$(self.active).width()});
        $(".Resize.handle.bottom").css({top: offset.top+$(self.active).height()});
        $(".Resize.handle.right.middle, .Resize.handle.left.middle").css({top: offset.top+$(self.active).height()/2});
        $(".Resize.handle.top.middle, .Resize.handle.bottom.middle").css({left: offset.left+$(self.active).width()/2});
    }
    self.resizeOff = function(){
        self.drag = false;
        self.origX = null;
        self.origY = null;
        self.origWidth = null;
        self.origHeight = null;
        $(".Resize.handle").remove();
        self.active = null;
    }
    self.disable = function(){
        self.resizeOff();
		$("*").unbind(".Resize");
		$("*").undelegate(".Resize");
	}
    // Return self so other modules can hook into this one.
    return self;
});
