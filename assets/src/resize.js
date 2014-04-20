define(['websync'], function() {
    var self = {};
    $("#Text").append('<button id="floatElement" title="Toggle Float" class="btn btn-default"><i class="fa fa-arrows"></i></button>');
    $("#floatElement").click(function() {
        if (self.active) {
            $(self.active).toggleClass("float").trigger("resize");
            var tmp = self.active;
            tmp.style.top = null;
            tmp.style.left = null;
            self.resizeOff();
            self.resizeOn(tmp);
        }
    });

    // Bind mouse to the content container. This waits to make sure that the .content_container has been added (happens in the layout plugin).
    $(document).on("modules_loaded", function() {
        $(".content_container").delegate("img, iframe, table, .note-page section, canvas", "click.Resize", function(e) {
            if (WebSyncAuth.view_op == "edit") {
                self.resizeOn(this);
                e.stopPropagation();
            }
        });
    });
    $(".content").bind("click.Resize", function() {
        self.resizeOff();
    });
    $(document).bind("clear_select.Resize", function(e){
        self.resizeOff();
    });
    $(".content").delegate(".Resize.handle", "click.Resize", function(e) {
        e.stopPropagation();
    });
    $(".content").delegate(".Resize.handle.dragable i.fa-arrows", "mousedown.Resize", function(e) {
        self.drag = true;
        self.origMove = $(self.active).position();
        self.origMouse = {
            left: e.pageX,
            top: e.pageY
        };
        e.preventDefault();
    });
    $(".content").delegate(".Resize.handle.dragable i.fa-trash-o", "mousedown.Resize", function(e) {
        $(self.active).remove();
        self.resizeOff();
        e.preventDefault();
    });
    $(".content").delegate(".Resize.handle.bottom", "mousedown.Resize", function(e) {
        console.log(e);
        self.drag = true;
        self.origY = e.pageY;
        self.origHeight = $(self.active).outerHeight();
        e.preventDefault();
    });
    $(".content").delegate(".Resize.handle.right", "mousedown.Resize", function(e) {
        console.log(e);
        self.drag = true;
        self.origX = e.pageX;
        self.origWidth = $(self.active).outerWidth();
        e.preventDefault();
    });
    $(document).bind("mousemove.Resize", function(e) {
        if (self.drag) {
            if (self.origY) {
                $(self.active).outerHeight((e.pageY - self.origY) / WebSync.zoom + self.origHeight);
            }
            if (self.origX) {
                $(self.active).outerWidth((e.pageX - self.origX) / WebSync.zoom + self.origWidth);
            }
            if (self.origMove) {
                var x_offset = e.pageX - self.origMouse.left;
                var y_offset = e.pageY - self.origMouse.top;
                var new_position = {
                    left: self.origMove.left + x_offset,
                    top: self.origMove.top + y_offset
                }
                $(self.active).css(new_position);
            }
            $(self.active).trigger("resize");
            self.updateHandles();
            e.preventDefault();
        }
    });
    $(document).bind("mouseup.Resize", function(e) {
        if (self.drag) {
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
    self.resizeOn = function(elem) {
        self.resizeOff();
        self.active = elem;
        // Add handle DIVs
        $(".content").append('<div class="Resize handle top left' + ($(elem).css("position") == "absolute" ? " dragable\"><i class='fa fa-arrows'></i><i class='fa fa-trash-o'></i>" : "\">") + '</div>');
        $(".content").append('<div class="Resize handle top middle"></div>');
        $(".content").append('<div class="Resize handle top right"></div>');
        $(".content").append('<div class="Resize handle right middle"></div>');
        $(".content").append('<div class="Resize handle right bottom"></div>');
        $(".content").append('<div class="Resize handle bottom middle"></div>');
        $(".content").append('<div class="Resize handle bottom left"></div>');
        $(".content").append('<div class="Resize handle left middle"></div>');
        self.updateHandles();
        self.active.addEventListener("DOMSubtreeModified", self.observer);
    };
    self.updateHandles = function() {
        if (!self.active) return;
        var offset = $(self.active).offset();
        console.log(self.active);
        if(self.active.getBoundingClientRect){
            var rect = self.active.getBoundingClientRect();
            console.log(rect);
            var width = rect.width;
            var height = rect.height;
            var top = rect.top;
            var left = rect.left;
            console.log(offset.top -4, offset.left + width -3)
            $(".Resize.handle.top").offset({
                top: offset.top - 4
            });
            $(".Resize.handle.left").offset({
                left: offset.left - 4
            });
            $(".Resize.handle.right").offset({
                left: offset.left + width - 3
            });
            $(".Resize.handle.bottom").offset({
                top: offset.top + height - 3
            });
            $(".Resize.handle.right.middle, .Resize.handle.left.middle").offset({
                top: offset.top + height/2 - 4
            });
            $(".Resize.handle.top.middle, .Resize.handle.bottom.middle").offset({
                left: offset.left + width/2 - 4
            });
            $(".Resize.handle.top.left.dragable").offset({
                left: offset.left - 8,
                top: offset.top - 8
            });
        // Fallback method. TODO: Remove.
        } else {
            $(".Resize.handle.top").offset({
                top: offset.top - 4
            });
            $(".Resize.handle.left").offset({
                left: offset.left - 4
            });
            $(".Resize.handle.right").offset({
                left: offset.left + $(self.active).outerWidth() * WebSync.zoom - 3
            });
            $(".Resize.handle.bottom").offset({
                top: offset.top + $(self.active).outerHeight() * WebSync.zoom - 3
            });
            $(".Resize.handle.right.middle, .Resize.handle.left.middle").offset({
                top: offset.top + $(self.active).outerHeight() * WebSync.zoom / 2 - 4
            });
            $(".Resize.handle.top.middle, .Resize.handle.bottom.middle").offset({
                left: offset.left + $(self.active).outerWidth() * WebSync.zoom / 2 - 4
            });
            $(".Resize.handle.top.left.dragable").offset({
                left: offset.left - 8,
                top: offset.top - 8
            });
        }
    }
    $(document).on("zoom.Resize", self.updateHandles);
    $(document).on("resize.Resize", self.updateHandles);
    self.observer = function() {
        var bounding_data = JSON.stringify(self.active.getBoundingClientRect());
        if (bounding_data != self.lastSize) {
            setTimeout(function() {
                self.updateHandles();
            }, 1);
            self.lasttSize = bounding_data;
        }
    };
    self.resizeOff = function() {
        self.drag = false;
        self.origX = null;
        self.origY = null;
        self.origWidth = null;
        self.origHeight = null;
        $(".Resize.handle").remove();
        if (self.active) {
            self.active.removeEventListener("DOMSubtreeModified", self.observer);
        }
        self.active = null;
    }
    self.disable = function() {
        self.resizeOff();
        $("*").unbind(".Resize");
        $("*").undelegate(".Resize");
    }
    // Return self so other modules can hook into this one.
    return self;
});
