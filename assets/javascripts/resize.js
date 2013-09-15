define(['websync'],function(){ var self = {};
    $(".content_container").delegate("img, iframe, table, .note-page section", "click.Resize", function(e){
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
    $(".content").delegate(".Resize.handle.dragable", "mousedown.Resize", function(e){
        console.log(e);
        self.drag = true;
        self.origMove = $(e.currentTarget).position();
        self.origMouse = {left: e.pageX, top: e.pageY};
        e.preventDefault();
    });
    $(".content").delegate(".Resize.handle.bottom", "mousedown.Resize", function(e){
        console.log(e);
        self.drag = true;
        self.origY = e.pageY;
        self.origHeight = $(self.active).outerHeight();
        e.preventDefault();
    });
    $(".content").delegate(".Resize.handle.right", "mousedown.Resize", function(e){
        console.log(e);
        self.drag = true;
        self.origX = e.pageX;
        self.origWidth = $(self.active).outerWidth();
        e.preventDefault();
    });
    $(document).bind("mousemove.Resize", function(e){
        if(self.drag){
            if(self.origY){
                $(self.active).outerHeight(e.pageY-self.origY + self.origHeight);
            }
            if(self.origX){
                $(self.active).outerWidth(e.pageX-self.origX + self.origWidth);
            }
            if(self.origMove){
                var x_offset = e.pageX - self.origMouse.left;
                var y_offset = e.pageY - self.origMouse.top;
                var new_position = {left: self.origMove.left + x_offset, top: self.origMove.top + y_offset}
                $(self.active).css(new_position);
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
            self.origMove = null;
            self.origMouse = null;
            self.origWidth = null;
            self.origHeight = null;
            self.drag = false;
        }
    });
    self.resizeOn = function(elem){
        self.resizeOff();
        self.active = elem;
        // Add handle DIVs
        $(".content").append('<div class="Resize handle top left'+($(elem).css("position")=="absolute"? " dragable\"><i class='icon-move'></i>" : "\">" )+ '</div>');
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
        $(".Resize.handle.right").css({left: offset.left+$(self.active).outerWidth()});
        $(".Resize.handle.bottom").css({top: offset.top+$(self.active).outerHeight()});
        $(".Resize.handle.right.middle, .Resize.handle.left.middle").css({top: offset.top+$(self.active).outerHeight()/2});
        $(".Resize.handle.top.middle, .Resize.handle.bottom.middle").css({left: offset.left+$(self.active).outerWidth()/2});
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
