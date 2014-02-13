// WebSync: Free form drawing/note taking functionality.
define(['websync'],function(){ var self = {};

    // Define some variables. The interval is how often the points are taken. This is probably going to be removed.
    self.interval = 50;
    self.active = false;
    self.points = {};

    // Toggle button to enable drawing mode. Might be moved under the text editing tab.
    $("#Insert").append(" <button id='drawing_mode' class='btn btn-default Drawing' title='Draw'><i class='fa fa-pencil'></i></button>");
    $("#drawing_mode").click(function(){
        $(this).toggleClass("active");
        self.active = !self.active;
    });

    // Bind mouse to the content container.
    $(".content_container").bind("mousedown.Drawing",function(e){
        if(self.active){
            self.drag = true;
            self.last_time = new Date();
            // The active_id is the identifier used for each line.
            self.active_id = (new Date()).getTime().toString();
            self.points[self.active_id]=[];
            if($(e.target).attr("contenteditable")=="true"){
                self.parent = e.target;
            } else {
                self.parent = $(e.target).parents("[contenteditable=true]");
            }
            self.canvas = document.createElement("canvas");
            $(self.canvas).addClass("Drawing").data("drawid",self.active_id).prependTo(self.parent);
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
    // Add a point to a line based on event.
    self.savePoint = function(e){
        var corner = $(".content_container").offset();
        var point = [e.pageX-corner.left-100,e.pageY-corner.top-100]
        self.points[self.active_id].push(point);
        self.drawPoints(self.active_id, self.canvas);
        e.preventDefault();
    }
    // Draw a line to a canvas based on a series of [x,y] coordinate pairs.
    self.drawPoints = function(id, canvas){
        var points = self.points[id];
        // Find corners of the drawing
        var top, left, bottom, right;
        _.each(points,function(point){
            if(point[0]-5 < left || !left) left = point[0]-5;
            if(point[0]+5 > right || !right) right = point[0]+5;
            if(point[1]-5 < top || !top) top = point[1]-5;
            if(point[1]+5 > bottom || !bottom) bottom = point[1]+5;
        });
        // This is a hack to clear canvas.
        canvas.width = 100;
        $(canvas).css({position: "absolute", left: left, top: top}).attr("width",right-left).attr("height", bottom-top);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = "#000000";
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = 3;
        _.each(points, function(point, index){
            if(points[index+1]){
                if(index==0) ctx.moveTo(point[0]-left,point[1]-top);
                ctx.lineTo(points[index+1][0]-left,points[index+1][1]-top);
            }
        });
        ctx.stroke();
    }
    // Register a DOM serialization exception. This allows us to store custom JSON instead of JSONized HTML.
    WebSync.registerDOMException(".Drawing", function(obj){
        var id = $(obj).data("drawid")
        var position = $(obj).position();
        return {id: id, points: self.points[id], left: position.left, top: position.top};
    }, function(json){
        self.points[json.id] = json.points;
        setTimeout(function(){
            var canvas = $("[data-drawid='"+alphaNumeric(json.id)+"']");
            // Draw the points.
            self.drawPoints(json.id, canvas[0]);
            // Set the position of the line.
            canvas.css({left: json.left, top: json.top});
        },1);
        return '<canvas class="Drawing" data-drawid="'+alphaNumeric(json.id)+'"></canvas>';
    });
    // Code to disable the function.
    self.disable = function(){
		$("*").unbind(".Drawing");
		$("*").undelegate(".Drawing");
        $(".Drawing").remove();
        WebSync.unregisterDOMException(".drawing");

	}
    // Return self so other modules can hook into this one.
    return self;
});
