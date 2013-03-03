// Web-Sync: Tables Plugin
WebSync.register(function(){ var module = this;
	// Plugin name
	this.name = "Tables"
	// Enable: This is where everything should be setup.
	// Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.Tables", clickHandler);
	// Unbind Example: $("*").unbind(".Tables");
	this.enable = function(){		
		$("#Insert").append($('<button id="table" title="Table" class="btn Table"><i class="icon-table"></i></button>'))
		$("#table").bind("click.Tables",function(e){
			console.log(e);
			var new_table = $("<table><tbody><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody></table>")
			WebSync.insertAtCursor(new_table)
		});
		$("table").bind("click.Tables",function(e){
			if(module.selectedElem.contentEditable!="true"){
				$('a:contains("Table")').click();
			}
			e.stopPropagation();
		});
		$(".page").bind("click.Tables",function(e){
			console.log(e);
			module.clearSelect();
		});
		$("td").bind("click.Tables",function(e){
			console.log(e);
			if(this!=module.selectedElem){
				module.cursorSelect(this);
			}
		});
		$("td").bind("contextmenu.Tables",function(e){
			if(this!=module.selectedElem){
				module.cursorSelect(this);
			}
			if(module.selectedElem.contentEditable!="true"){
				e.preventDefault();
				$(this).contextmenu();
			}
		});
		$("td").bind("dblclick.Tables",function(e){
			module.selectedEditable(true);
		});
		$(document).bind("keydown.Tables",function(e){
			if(module.selected==true&&!e.shiftKey){
				var editting = module.selectedElem.contentEditable=="true"
				if(e.keyCode==13){
					module.cursorMove(0,1);
				} else if(e.keyCode==27){
					// Escape
					module.selectedEditable(false);
				} else if(e.keyCode==37&&!editting){ 
					// Left arrow
					module.cursorMove(-1,0);
					e.preventDefault();
				}else if(e.keyCode==39&&!editting){ 
					// Right arrow
					module.cursorMove(1,0);
					e.preventDefault();
				}else if(e.keyCode==38&&!editting){ 
					// Up arrow
					module.cursorMove(0,-1);
					e.preventDefault();
				}else if(e.keyCode==40&&!editting){ 
					// Down arrow
					module.cursorMove(0,1);
					e.preventDefault();
				} else {
					if(!module.selectedElem.contentEditable||module.selectedElem.contentEditable=="false"){
						module.selectedEditable(true);

						$(module.selectedElem).focus();
						//WebSync.setCaretPosition(module.selectedElem,0);
					}
					setTimeout(module.cursorUpdate,1);
				}
			}
		});
		$(".ribbon").append($('<div id="Table" class="Table container">Table Editting</div>'));
		$(document.body).append($('<div id="table_cursor" class="Table"></div><div id="tablemenu"><ul class="dropdown-menu" role="menu"><li><a tabindex="-1" href="#"><i class="icon-plus"></i>Insert Column</a></li><li><a tabindex="-1" href="#"><i class="icon-trash"></i>Delete Column</a></li><li><a tabindex="-1" href="#"><i class="icon-plus"></i>Insert Row</a></li><li><a tabindex="-1" href="#"><i class="icon-trash"></i>Delete Row</a></li><li class="divider"></li><li><a tabindex="-1" href="#"><i class="icon-pencil"></i>Customize Cell</a></li></ul></div>'));
		$("td").attr("data-target","#tablemenu");
		WebSync.updateRibbon();
	}
	// Disable: Plugin should clean itself up.
	this.disable = function(){
		var elem = $(".Table").remove();
		WebSync.updateRibbon();
		$("*").unbind(".Tables");
	}
	// Helper methods:
	this.cursorSelect = function(td){
		// Cleanup last elem.
		if(module.selectedElem){
			module.selectedEditable(false);
		}
		document.getSelection().empty();
		module.selected = true;
		module.selectedElem = td;
		module.selectedEditable(false);
		module.cursorUpdate();
	}
	this.cursorMove = function(dColumn, dRow){
		var child = module.selectedElem;
		module.selectedEditable(false);
		var column = 0;
		while( (child = child.previousSibling) != null ) 
			column++;
		child = module.selectedElem.parentElement
		var row = 0
		while( (child = child.previousSibling) != null ) 
			row++;
		if(module.selectedElem.parentElement.parentElement.children.length>row+dRow&&module.selectedElem.parentElement.parentElement.children[0].children.length>column+dColumn&&row+dRow>=0&&column+dColumn>=0){
			var new_td = module.selectedElem.parentElement.parentElement.children[row+dRow].children[column+dColumn];
			module.cursorSelect(new_td);
		}

	}
	this.cursorUpdate = function(){
		var pos = $(module.selectedElem).position();
		$("#table_cursor").offset(pos).height($(module.selectedElem).height()).width($(module.selectedElem).width()).get(0).scrollIntoViewIfNeeded();
	}
	this.selectedEditable = function(edit){
		if(!edit){
			module.selectedElem.contentEditable=false;
			$("#table_cursor").css({borderStyle: 'solid', outlineStyle: 'solid'});
			$('a:contains("Table")').click();
		}else{
			module.selectedElem.contentEditable=true;
			$("#table_cursor").css({borderStyle: 'dashed', outlineStyle: 'dashed'});
			$('a:contains("Text")').click();
		}
	}
	this.clearSelect = function(){
		if(module.selected){
			module.selected = false;
			module.selectedEditable(false);
			$("#table_cursor").offset({left:-10000});
			delete module.selectedElem;
			$('a:contains("Text")').click();
		}
	}
});
