define(['websync'],function(){ var self = {};
    $("body").append('<script type="text/javascript" class="Equations" src="/assets/mathquill.min.js"></script><link rel="stylesheet" type="text/css" href="/mathquill.css">');
    $("#Insert").append($("<button id='insert_equation' class='btn Equations' title='Insert Equation'><i class='icon-btc'></i></button>"));// ÷
    $("#insert_equation").click(function(e){
        var elem = $('<span class="Equations mathquill-editable" contenteditable="false"></span>')[0]
        rangy.getSelection().getAllRanges()[0].surroundContents(elem);
        $(elem).mathquill();
    });
    self.disable = function(){
		$("*").unbind(".Equations");
		$("*").undelegate(".Equations");
        $(".Equations").remove();
	}
    // Return self so other modules can hook into this one.
    return self;
});
