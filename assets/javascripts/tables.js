// WebSync: Tables Plugin
// WebSync uses RequireJS for modules.
// define( [pluginName], [requiredModules], definition);
// pluginName is an optional argument that should only be used if the module is being bundled/loaded without RequireJS. It should match the path it's being required as.
define('/assets/tables.js',['edit','websync'],function(edit,websync){ var self = {};
    // Save all variables and information to the self object.

    // Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.Tables", clickHandler);
	// Unbind Example: $("*").unbind(".Tables");
    $(".ribbon").append($('<div id="Table" class="Table container"><button class="btn" title="Delete Table"><i class="icon-trash"></i> Table</button><div class="btn-group"><button class="btn" type="button" title="Insert Row Above"><i class="icon-plus"></i></button></span><button class="btn" type="button" title="Delete Row"><i class="icon-trash"></i> Row</button><button class="btn" type="button" title="Insert Row Below"><i class="icon-plus"></i></button></div>     <div class="btn-group"><button class="btn" type="button" title="Insert Column Left"><i class="icon-plus"></i></button></span><button class="btn" type="button" title="Delete Column"><i class="icon-trash"></i> Column</button><button class="btn" type="button" title="Insert Column Right"><i class="icon-plus"></i></button></div></div>'));
    $(".content").append($('<div id="table_cursor" class="Table"></div><div id="table_selection" class="Table"></div><div id="table_clip" style="position:absolute; left:-1000px;top:-1000px;"></div>'));
    $("#Insert").append($('<button id="table" title="Table" class="btn Table"><i class="icon-table"></i></button>'))
    $("#table").bind("click.Tables",function(e){
        console.log(e);
        var new_table = $("<table><tbody><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody></table>")
        WebSync.insertAtCursor(new_table)
    });
	$('.Table [title="Insert Row Above"]').bind("click.Tables",function(e){
		if(self.selected){
			var html = "<tr>";
			var size = self.tableSize();
			for(var i=0;i<size[0];i++){
				html+="<td></td>";
			}
			html+="</tr>";
			$(html).insertBefore( self.selectedElem.parentElement);
            self.posCache={};
			self.cursorMove(0,-1);
		}
	});
	$('.Table [title="Insert Row Below"]').bind("click.Tables",function(e){
		if(self.selected){
			var html = "<tr>";
			var size = self.tableSize();
			for(var i=0;i<size[0];i++){
				html+="<td></td>";
			}
			html+="</tr>";
			$(html).insertAfter( self.selectedElem.parentElement);
            self.posCache={};
			self.cursorMove(0,1);
		}
	});
	$('.Table [title="Delete Row"]').bind("click.Tables",function(e){
		if(self.selected){
			self.selectedElem.parentElement.remove();
            self.posCache={};
		}
		self.clearSelect();
	});
	$('.Table [title="Insert Column Left"]').bind("click.Tables",function(e){
		if(self.selected){
			var size = self.tableSize();
			var pos = self.selectedPos();
			for(var i=0;i<size[1];i++){
				$("<td></td>").insertBefore(self.selectedElem.parentElement.parentElement.children[i].children[pos[0]]);
			}
			self.cursorMove(-1,0);
            self.posCache={};
		}
	});
	$('.Table [title="Insert Column Right"]').bind("click.Tables",function(e){
		if(self.selected){
			var size = self.tableSize();
			var pos = self.selectedPos();
			for(var i=0;i<size[1];i++){
				$("<td></td>").insertAfter(self.selectedElem.parentElement.parentElement.children[i].children[pos[0]]);
			}
            self.posCache={};
			self.cursorMove(1,0);
		}
	});
	$('.Table [title="Delete Column"]').bind("click.Tables",function(e){
		if(self.selected){
			var size = self.tableSize();
			var pos = self.selectedPos();
			var parentElem = self.selectedElem.parentElement.parentElement
			for(var i=0;i<size[1];i++){
				parentElem.children[i].children[pos[0]].remove();
			}
            self.posCache={};
			self.clearSelect();
		}
	});
	$('.Table [title="Delete Table"]').bind("click.Tables",function(e){
		if(self.selected){
			self.selectedElem.parentElement.parentElement.parentElement.remove();
			self.clearSelect();
		}
	});
    self.lastSize = "";
    self.observer = function(){
        var bounding_data = JSON.stringify(self.selectedElem.getBoundingClientRect());
        if(bounding_data!=self.lastSize){
            setTimeout(function(){
                self.cursorUpdate();
            },1);
            setTimeout(function(){
                self.headerUpdate();
            },2);
            self.lasttSize=bounding_data;
        }
    };
    $(".content").delegate("table","click.Tables",function(e){
        if(!self.selectedElem || self.selectedElem.contentEditable!="true"){
            $('a:contains("Table")').click();
        }
        e.stopPropagation();
    });
    $(".content").delegate("td","mouseenter.Tables",function(e){
        if(self.selectionActive&&self.primaryTable()===self.primaryTable(this)){
            self.selectionEnd = this;
            self.updateSelectedArea();
        }
    });
    $(".content").delegate("td","mouseleave.Tables",function(e){
    });
    $(".content").delegate(".Table.axis#x th", "mousemove.Tables", function(e){
        var position = $(this).offset();
        $('.Table.axis th.resize').removeClass('resize');
        if(Math.abs(e.pageX-position.left)<5 || Math.abs(e.pageX-(position.left+$(this).width()))<5){
            $(this).addClass("resize");
        }
    });
    $(".content").delegate(".Table.axis#y th", "mousemove.Tables", function(e){
        var position = $(this).offset();
        console.log(e.pageY, position.top);
        $('.Table.axis th.resize').removeClass('resize');
        if(Math.abs(e.pageY-position.top)<5 || Math.abs(e.pageY-(position.top+$(this).height()))<5){
            $(this).addClass("resize");
        }
    });
    $(".content").delegate("td","mousedown.Tables",function(e){
        console.log(e);
        if(this!=self.selectedElem){
            self.cursorSelect(this);
            self.selectedElem.contentEditable=true;
			self.setEndOfContenteditable(self.selectedElem);
            self.selectedElem.contentEditable="inherit";
        }
        self.selectionActive=true;
        self.selectionEnd = null;
        self.updateSelectedArea();
        e.preventDefault();
    });
    $(".content").delegate("td","mouseup.Tables",function(e){
        self.selectionActive=false;
    });
    self.selectionActive = false;
    $(".content").bind("click.Tables",function(e){
        //console.log(e);
        self.clearSelect();
    });
    $(".content").delegate("td","contextmenu.Tables",function(e){
        if(this!=self.selectedElem){
            self.cursorSelect(this);
        }
        if(self.selectedElem.contentEditable!="true"){
            //e.preventDefault();
            //$(this).contextmenu();
        }
    });
    $(".content").delegate("td","dblclick.Tables",function(e){
		if(self.selectedElem.contentEditable!="true"){
			self.selectedEditable(true);
		}
    });
    $(".content").delegate(".Table.axis#x th.resize", "mousedown.Tables", function(e){
        self.drag = true;
        self.active = this;
        self.origX = e.pageX;
        self.origWidth = $(this).width();
    });
    $(".content").delegate(".Table.axis#y th.resize", "mousedown.Tables", function(e){
        self.drag = true;
        self.active = this;
        self.origY = e.pageY;
        self.origHeight = $(this).height();
    });
    $(document).bind('mousemove.Tables', function(e){
        if(self.drag){
            if(self.origX){
                $(self.active).width(e.pageX-self.origX+self.origWidth);
            }
            if(self.origY){
                $(self.active).height(e.pageY-self.origY+self.origHeight);
            }
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
    $(".content").delegate(".Table.axis#x th:not('resize')", "click.Tables", function(e){
        var pos = self.selectedPos(this);
        var size = self.tableSize();
        self.cursorSelect(self.posToElem(pos[0],0));
        if(!e.shiftKey){
            self.selectionEnd = self.posToElem(pos[0],size[1]-1);
        }
        self.updateSelectedArea();
    });
    $(".content").delegate(".Table.axis#y th:not('resize')", "click.Tables", function(e){
        var pos = self.selectedPos(this);
        var size = self.tableSize();
        self.cursorSelect(self.posToElem(0,pos[1]));
        if(!e.shiftKey){
            self.selectionEnd = self.posToElem(size[0]-1,pos[1]);
        }
        self.updateSelectedArea();
    });
    $(document).bind("paste.Tables",function(e){
        if(self.selected){
            console.log($(e.originalEvent.clipboardData.getData('text/html')));
        }
    });
    $(".content").bind("keydown.Tables",function(e){
        if(self.selectedElem){
            if(self.selected){ //&&!e.shiftKey){
                var editting = false;
                if(self.selectedElem.contentEditable){
                    editting=self.selectedElem.contentEditable=="true";
                }
                if(e.keyCode==13&&!e.shiftKey){
                    self.cursorMove(0,1);
                } else if(e.keyCode==9){
                    // Tab key
                    self.selectedEditable(false);
                    self.cursorMove(1-2*e.shiftKey,0);
                    e.preventDefault();
                } else if(e.keyCode==27){
                    // Escape
                    self.selectedEditable(false);
                } else if(e.keyCode==37&&!editting){
                    // Left arrow
                    self.cursorMove(-1,0);
                    e.preventDefault();
                }else if(e.keyCode==39&&!editting){
                    // Right arrow
                    self.cursorMove(1,0);
                    e.preventDefault();
                }else if(e.keyCode==38&&!editting){
                    // Up arrow
                    self.cursorMove(0,-1);
                    e.preventDefault();
                }else if(e.keyCode==40&&!editting){
                    // Down arrow
                    self.cursorMove(0,1);
                    e.preventDefault();
                } else {
                    if((!self.selectedElem.contentEditable||self.selectedElem.contentEditable=="inherit")&&_.indexOf([16,17,18,91,92],e.keyCode)==-1&&!(e.keyCode==67&&e.ctrlKey)){
                        self.selectedEditable(true);

                        $(self.selectedElem).focus();
                        //WebSync.setCaretPosition(self.selectedElem,0);
                    }
                    setTimeout(self.cursorUpdate,1);
                }
            } else {
                if(!self.selectedElem.contentEditable||self.selectedElem.contentEditable=="false"){
                    self.selectedEditable(true);

                    $(self.selectedElem).focus();
                    //WebSync.setCaretPosition(self.selectedElem,0);
                }
            }
        }
    });

    WebSync.updateRibbon();
    $("#ribbon_buttons a:contains('Table')").parent().hide();
	// Function: void [plugin=edit].disable();
    // Disables the plugin. This has to be set for possible plugin unloading.
	self.disable = function(){
		var elem = $(".Table").remove();
		WebSync.updateRibbon();
		$("*").unbind(".Tables");
		$("*").undelegate(".Tables");
	}
	// Helper methods:
	self.cursorSelect = function(td){
        $("#ribbon_buttons a:contains('Table')").parent().fadeIn(200);
		// Cleanup last elem.
		if(self.selectedElem){
			self.selectedEditable(false);
		}
		document.getSelection().removeAllRanges();
		self.selected = true;
		self.selectedElem = td;
        $(self.selectedElem).focus();
		self.selectedEditable(false);
        //self.observer.observe(self.selectedElem,{characterData:true});
        self.selectedElem.addEventListener("DOMSubtreeModified",self.observer);
        if($(".Table.axis").length==0) {
            var size = self.tableSize();
            var nodes = '<table class="Table axis" id="x"><thead><tr>';
            for(var i=0;i<size[0];i++){
                var elem = self.posToElem(i,0);
                var bounding = elem.getBoundingClientRect();
                nodes+='<th style="width: '+(bounding.width-1).toFixed(0)+'px">'+self.columnLabel(i)+'</th>';
            }
            nodes+='</tr></thead></table><table class="Table axis" id="y"><thead>';
            for(var i=0;i<size[1];i++){
                var elem = self.posToElem(0,i);
                nodes+='<tr><th style="height: '+($(elem).height()+1)+'px">'+(i+1)+'</th></tr>';
            }
            nodes+='</thead></table>';
            $(".content").append($(nodes));
            $(".Table.axis").fadeIn(200);
        }
		self.cursorUpdate();
	}
    self.headerUpdate = function(){
        var size = self.tableSize();
        var x_nodes = $(".axis#x th");
        for(var i=0;i<size[0];i++){
            var elem = self.posToElem(i,0);
            var bounding = elem.getBoundingClientRect();
            x_nodes[i].style.width = (bounding.width-1)+"px";
            //x_nodes.eq(i).css({width:(bounding.width-1).toFixed(0)});//'+self.columnLabel(i);
        }
        var y_nodes = $(".axis#y th");
        for(var i=0;i<size[1];i++){
            var elem = self.posToElem(0,i);
            var bounding = elem.getBoundingClientRect();
            y_nodes[i].style.height = (bounding.height-1)+"px";
            //y_nodes.eq(i).css({height: (bounding.height-1)});//+'px">'+(i+1);
        }
        var table = $(self.primaryTable());
        $(".Table.axis#x").width(table.width()+2);
        $(".Table.axis#y").height(table.height());
    };
	self.cursorMove = function(dColumn, dRow){
		self.selectedEditable(false);
		var pos = self.selectedPos();
		var column = pos[0];
		var row = pos[1];
		if(self.selectedElem.parentElement.parentElement.children.length>row+dRow&&self.selectedElem.parentElement.parentElement.children[0].children.length>column+dColumn&&row+dRow>=0&&column+dColumn>=0){
			var new_td = self.selectedElem.parentElement.parentElement.children[row+dRow].children[column+dColumn];
			self.cursorSelect(new_td);
		}
	}
	self.cursorUpdate = function(){
		var pos = $(self.selectedElem).position();
        pos.top += 2;
        pos.left += 2;
		//$("#table_cursor").animate({left:pos.left,top:pos.top,width:$(self.selectedElem).width()+1,height:$(self.selectedElem).height()},50,'linear').get(0).scrollIntoViewIfNeeded();
        $("#table_cursor").css({left:pos.left,top:pos.top}).height($(self.selectedElem).height()-2).width($(self.selectedElem).width()-1).get(0).scrollIntoViewIfNeeded();
        self.updateSelectedArea();
        var table = $(self.primaryTable());
        var offset = table.offset();
        if(!($(".Table.axis#x").get(0).style.left)){
            $(".Table.axis#x").offset({left:offset.left,top:offset.top-17});//.width(table.width()+2);
            $(".Table.axis#y").offset({left:offset.left-39,top:offset.top});//.height(table.height());
        }
	}
	self.selectedEditable = function(edit){
		if(!edit){
			self.selectedElem.contentEditable="inherit";
			$("#table_cursor").css({borderStyle: 'solid', outlineStyle: 'solid'});
			$('#ribbon_buttons a:contains("Table")').click();
		}else{
			self.selectedElem.contentEditable=true;
			$("#table_cursor").css({borderStyle: 'dashed', outlineStyle: 'dashed'});
			$('#ribbon_buttons a:contains("Text")').click();
			self.setEndOfContenteditable(self.selectedElem);
		}
	}
    self.clearSelect = function(){
		if(self.selected){
			self.selected = false;
			self.selectedEditable(false);
			$("#table_cursor").offset({left:-10000});
            self.selectedElem.removeEventListener("DOMSubtreeModified",self.observer);
			delete self.selectedElem;
            $("#ribbon_buttons a:contains('Table')").parent().fadeOut(200);
			$('#ribbon_buttons a:contains("Text")').click();
            self.selectedElem=null;
            self.updateSelectedArea();
            $(".Table.axis").fadeOut(200).promise().done(function(){
                $(".Table.axis#x").remove();
                $(".Table.axis#y").remove();
            });
		}
	}
    self.updateSelectedArea = function(){
        $(".Table.axis th").removeClass("active");
        if(self.selectedElem===self.selectionEnd||!self.selectionEnd||!self.selected||self.primaryTable()!=self.primaryTable(self.selectionEnd)){
            $("#table_selection").hide();
            if(self.selected){
                $($(".Table.axis#x").children().children().children()[self.selectedPos()[0]]).addClass("active");
                $($(".Table.axis#y").children().children()[self.selectedPos()[1]]).children().addClass("active");
            }
        }
        else {
            var pos = $(self.selectedElem).position();//offset();
            var endPos = $(self.selectionEnd).position();//offset();
            var baseWidth = $(self.selectionEnd).width();
            var baseHeight = $(self.selectionEnd).height();
            if(pos.left>endPos.left){
                var tmp_left = pos.left;
                pos.left = endPos.left;
                endPos.left = tmp_left;
                baseWidth = $(self.selectedElem).width();
            }
            if(pos.top>endPos.top){
                var tmp_top = pos.top;
                pos.top = endPos.top;
                endPos.top = tmp_top;
                baseHeight = $(self.selectedElem).height();
            }
            var height = endPos.top+baseHeight -pos.top;
            var width = endPos.left+baseWidth -pos.left;
            $("#table_selection").show().css({left:pos.left,top:pos.top}).height(height).width(width);
            //$("#table_selection").show().animate({top:pos.top,left:pos.left,height:height,width:width},50,'linear');//offset(pos).height(height).width(width);
            // Set hidden selection area contents to mini-table.
            var selection_html = "<table><tbody>";
            var tpos_start = self.selectedPos();
            var tpos_end = self.selectedPos(self.selectionEnd);

            var top = tpos_start[1] < tpos_end[1] ? tpos_start[1] : tpos_end[1];
            var bottom = tpos_start[1] > tpos_end[1] ? tpos_start[1] : tpos_end[1];
            var left = tpos_start[0] < tpos_end[0] ? tpos_start[0] : tpos_end[0];
            var right = tpos_start[0] > tpos_end[0] ? tpos_start[0] : tpos_end[0];
            $(".Table.axis#x").children().children().children().slice(left,right+1).addClass("active");
            $(".Table.axis#y").children().children().slice(top,bottom+1).children().addClass("active");
            for(var y=top;y<=bottom;y++){
                selection_html+="<tr>";
                for(var x=left;x<=right;x++){
                    selection_html+="<td>"+self.selectedElem.parentElement.parentElement.children[y].children[x].innerHTML+"</td>";
                }
                selection_html+="</tr>";
            }
            selection_html+="</tbody></table>";
            $("#table_clip").html(selection_html);
            // Hidden selection area for copying.
            var range = rangy.createRange();
            range.selectNodeContents($("#table_clip").get(0));
            var sel = rangy.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
    self.setEndOfContenteditable = function(contentEditableElement)
    {
        var range,selection;
        if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
        {
            range = document.createRange();//Create a range (a range is a like the selection but invisible)
            range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
            range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
            selection = window.getSelection();//get the selection object (allows you to change selection)
            selection.removeAllRanges();//remove any selections already made
            selection.addRange(range);//make the range you have just created the visible selection
        }
        else if(document.selection)//IE 8 and lower
        {
            range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
            range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
            range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
            range.select();//Select the range (make it the visible selection
        }
    }
    self.primaryTable = function(elem){
        return (elem||self.selectedElem).parentElement.parentElement.parentElement;
    }
    self.posToElem = function(x, y){
        return self.selectedElem.parentElement.parentElement.children[y].children[x];
    }
    self.posCache = {};
	self.selectedPos = function(targetElem){
        var child = (targetElem||self.selectedElem);
        if(self.posCache[child]){
            return self.posCache[child];
        }
        else {
            var column = 0;
            while( (child = child.previousSibling) != null )
                column++;
            child = (targetElem||self.selectedElem).parentElement
            var row = 0
            while( (child = child.previousSibling) != null )
                row++;
            self.posCache[child]=[column,row];
            return [column,row];
        }
	}
	self.tableSize = function(){
		return [self.selectedElem.parentElement.children.length,self.selectedElem.parentElement.parentElement.children.length]
	}
    // Taken from Stack Overflow
    // http://stackoverflow.com/questions/8603480/how-to-create-a-function-that-converts-a-number-to-a-bijective-hexavigesimal
    var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    self.columnLabel = function(a) {
      // First figure out how many digits there are.
      a += 1; // This line is funky
      c = 0;
      var x = 1;
      while (a >= x) {
        c++;
        a -= x;
        x *= 26;
      }

      // Now you can do normal base conversion.
      var s = "";
      for (var i = 0; i < c; i++) {
        s = alpha.charAt(a % 26) + s;
        a = Math.floor(a/26);
      }

      return s;
    }

    // Return self so other modules can hook into this one.
    return self;
});
