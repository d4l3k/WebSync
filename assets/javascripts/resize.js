define(['websync'],function(){ var self = {};
    $(".content").delegate("img", "click.Resize", function(){
        self.resizeOn(this);
    });
    self.resizeOn = function(elem){
        console.log(elem);
    };
    self.disable = function(){
		$("*").unbind(".Resize");
		$("*").undelegate(".Resize");
	}
    // Return self so other modules can hook into this one.
    return self;
});
