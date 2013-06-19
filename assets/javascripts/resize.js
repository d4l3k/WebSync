define(['websync'],function(){ var self = {};
    $(".content").delegate("img", "click.Resize", function(){
        self.resizeOn(this);
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
