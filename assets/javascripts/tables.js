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
			self.cursorMove(0,1);
		}
	});
	$('.Table [title="Delete Row"]').bind("click.Tables",function(e){
		if(self.selected){
			self.selectedElem.parentElement.remove();
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
		}
	});
	$('.Table [title="Insert Column Right"]').bind("click.Tables",function(e){
		if(self.selected){
			var size = self.tableSize();
			var pos = self.selectedPos();
			for(var i=0;i<size[1];i++){
				$("<td></td>").insertAfter(self.selectedElem.parentElement.parentElement.children[i].children[pos[0]]);
			}
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
			self.clearSelect();
		}
	});
	$('.Table [title="Delete Table"]').bind("click.Tables",function(e){
		if(self.selected){
			self.selectedElem.parentElement.parentElement.parentElement.remove();
			self.clearSelect();
		}
	});
    self.observer = new MutationObserver(function(mutations) {
        setTimeout(function(){
			self.cursorUpdate();
		},1);
    });
    $(".page").delegate("table","click.Tables",function(e){
        if(self.selectedElem.contentEditable!="true"){
            $('a:contains("Table")').click();
        }
        e.stopPropagation();
    });
    $(".page").delegate("td","mouseenter.Tables",function(e){
        if(self.selectionActive){
            self.selectionEnd = this;
            self.updateSelectedArea();
        }
    });
    $(".page").delegate("td","mouseleave.Tables",function(e){
    });
    $(".page").delegate("td","mousedown.Tables",function(e){
        if(this!=self.selectedElem){
            self.cursorSelect(this);
        }
        self.selectionActive=true;
        self.selectionEnd = null;
        self.updateSelectedArea();
        e.preventDefault();
    });
    $(".page").delegate("td","mouseup.Tables",function(e){
        self.selectionActive=false;
    });
    self.selectionActive = false;
    $(".page").bind("click.Tables",function(e){
        //console.log(e);
        self.clearSelect();
    });
    $(".content_well").delegate("td","contextmenu.Tables",function(e){
        if(this!=self.selectedElem){
            self.cursorSelect(this);
        }
        if(self.selectedElem.contentEditable!="true"){
            //e.preventDefault();
            //$(this).contextmenu();
        }
    });
    $(".content_well").delegate("td","dblclick.Tables",function(e){
		if(self.selectedElem.contentEditable!="true"){
			self.selectedEditable(true);
		}
    });
    $(".content_well").bind("keydown.Tables",function(e){
        //console.log(e);
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
                    if((!self.selectedElem.contentEditable||self.selectedElem.contentEditable=="inherit")&&_.indexOf([16,17,18,91,92],e.keyCode)==-1){
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
    $(".menu li a:contains('Table')").parent().hide();
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
        $(".menu li a:contains('Table')").parent().fadeIn(200);
		// Cleanup last elem.
		if(self.selectedElem){
			self.selectedEditable(false);
		}
		document.getSelection().empty();
		self.selected = true;
		self.selectedElem = td;
		self.selectedEditable(false);
		self.cursorUpdate();
        self.observer.observe(self.selectedElem,{characterData:true});
	}
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
		var pos = $(self.selectedElem).offset();
        pos.top += 1;
        pos.left += 1;
		$("#table_cursor").offset(pos).height($(self.selectedElem).height()).width($(self.selectedElem).width()+1).get(0).scrollIntoViewIfNeeded();
        self.updateSelectedArea();
	}
	self.selectedEditable = function(edit){
		if(!edit){
			self.selectedElem.contentEditable="inherit";
			$("#table_cursor").css({borderStyle: 'solid', outlineStyle: 'solid'});
			$('a:contains("Table")').click();
		}else{
			self.selectedElem.contentEditable=true;
			$("#table_cursor").css({borderStyle: 'dashed', outlineStyle: 'dashed'});
			$('a:contains("Text")').click();
			self.setEndOfContenteditable(self.selectedElem);
		}
	}
    self.clearSelect = function(){
		if(self.selected){
			self.selected = false;
			self.selectedEditable(false);
			$("#table_cursor").offset({left:-10000});
			delete self.selectedElem;
            $(".menu li a:contains('Table')").parent().fadeOut(200);
			$('a:contains("Text")').click();
            self.observer.disconnect();
            self.updateSelectedArea();
		}
	}
    self.updateSelectedArea = function(){
        if(self.selectedElem===self.selectionEnd||!self.selectionEnd||!self.selected){
            $("#table_selection").offset({left:-1000});
        }
        else {
            var pos = $(self.selectedElem).offset();
            var endPos = $(self.selectionEnd).offset();
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
            $("#table_selection").offset(pos).height(height).width(width);
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
	self.selectedPos = function(targetElem){
        var child = (targetElem||self.selectedElem);
		var column = 0;
		while( (child = child.previousSibling) != null )
			column++;
		child = (targetElem||self.selectedElem).parentElement
		var row = 0
		while( (child = child.previousSibling) != null )
			row++;
		return [column,row];
	}
	self.tableSize = function(){
		return [self.selectedElem.parentElement.children.length,self.selectedElem.parentElement.parentElement.children.length]
	}

    // Return self so other modules can hook into this one.
    return self;
});
