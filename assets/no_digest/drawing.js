define(['websync'],function(){ var self = {};
    $("#Insert").append(" <button id='drawing_mode' class='btn btn-default Drawing' title='Draw'><i class='fa fa-pencil'></i></button>");
    self.active = false;
    $("#drawing_mode").click(function(){
        $(this).toggleClass("active");
        self.active = !self.active;
    });
    WebSync.registerDOMException(".drawing", function(obj){
        return $(obj).mathquill("latex");
    }, function(json){
        setTimeout(function(){
            $(".make-editable").removeClass("make-editable").mathquill("editable");
        },1);
        return '<span class="Drawing Equation-Editable make-editable" contenteditable="false">'+json+'</span>';
    });
    self.disable = function(){
		$("*").unbind(".Drawing");
		$("*").undelegate(".Drawing");
        $(".Drawing").remove();
        WebSync.unregisterDOMException(".drawing");

	}
    // Return self so other modules can hook into this one.
    return self;
});
