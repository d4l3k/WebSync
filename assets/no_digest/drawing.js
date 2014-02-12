define(['websync'],function(){ var self = {};
    $("#Insert").append(" <button id='drawing_mode' class='btn btn-default Drawing' title='Draw'><i class='fa fa-pencil'></i></button>");
    self.interval = 100;
    self.active = false;
    $("#drawing_mode").click(function(){
        $(this).toggleClass("active");
        self.active = !self.active;
    });
    $(".content_container").bind("mousedown.Drawing",function(e){
        if(self.active){
            self.drag = true;
            self.points = [];
            self.last_time = new Date();
            console.log("MOUSEDOWN", e);
            if($(e.target).attr("contenteditable")=="true"){
                self.parent = e.target;
            } else {
                self.parent = $(e.target).parents("[contenteditable=true]");
            }
            self.savePoint(e);
        }
    }).bind("mousemove.Drawing", function(e){
        if(self.active&&self.drag){
            var date = new Date();
            //if(date - self.last_time > self.interval){
                self.savePoint(e);
                self.last_time = date;
            //}
        }
    }).bind("mouseup.Drawing", function(e){
        if(self.active&&self.drag){
            self.drag = false;
            self.savePoint(e);
        }
    });
    self.savePoint = function(e){
        var corner = $(".content_container").offset();
        var point = [e.pageX-corner.left-100,e.pageY-corner.top-100]
        console.log(corner,point, e);
        self.points.push(point);
        self.drawPoints(self.points);
        e.preventDefault();
    }
    self.drawPoints = function(points){
        if(self.canvas) $(self.canvas).remove();
        self.canvas = document.createElement("canvas");
        var top, left, bottom, right;
        _.each(points,function(point){
            if(point[0]-5 < left || !left) left = point[0]-5;
            if(point[0]+5 > right || !right) right = point[0]+5;
            if(point[1]-5 < top || !top) top = point[1]-5;
            if(point[1]+5 > bottom || !bottom) bottom = point[1]+5;
        });
        //.width(right-left).height(bottom-top)
        $(self.canvas).css({position: "absolute", left: left, top: top}).attr("width",right-left).attr("height", bottom-top).prependTo(self.parent);
        var ctx = self.canvas.getContext('2d');
        ctx.fillStyle = "#000000";
        ctx.lineWidth = 3;
        _.each(points, function(point, index){
            if(points[index+1]){
                if(index==0) ctx.moveTo(point[0]-left,point[1]-top);
                ctx.lineTo(points[index+1][0]-left,points[index+1][1]-top);
            }
        });
        ctx.stroke();
    }
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
