define(['websync'],function(){ var self = {};
    $("body").append('<script type="text/javascript" class="Equations" src="/assets/mathquill.min.js"></script><link rel="stylesheet" type="text/css" href="/mathquill.css">');
    $("#Insert").append($("<button id='insert_equation' class='btn btn-default Equations' title='Insert Equation'>Equation</button>"));// ÷
    $("#insert_equation").click(function(e){
        var elem = $('<span class="Equations Equation-Editable" contenteditable="false"></span>')[0]
        rangy.getSelection().getAllRanges()[0].surroundContents(elem);
        elem.dataset.latex = $(elem).text();
        elem.dataset.search_children=false;
        $(elem).mathquill('editable');
    });
    $(".Equation-Editable").attr("contenteditable",false).each(function(e){
        console.log(e);
    }).mathquill("editable");
    self.disable = function(){
		$("*").unbind(".Equations");
		$("*").undelegate(".Equations");
        $(".Equations").remove();
	}
    // Return self so other modules can hook into this one.
    return self;
});
