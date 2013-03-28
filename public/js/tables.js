// Web-Sync: Tables Plugin
WebSync.register("Tables",function(){ var self = this;
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
		$(document).delegate("table","click.Tables",function(e){
			if(self.selectedElem.contentEditable!="true"){
				$('a:contains("Table")').click();
			}
			e.stopPropagation();
		});
		$(".page").bind("click.Tables",function(e){
			console.log(e);
			self.clearSelect();
		});
		$(document).delegate("td","click.Tables",function(e){
			console.log(e);
			console.log(this);
			if(this!=self.selectedElem){
				self.cursorSelect(this);
			}
		});
		$(document).delegate("td","contextmenu.Tables",function(e){
			if(this!=self.selectedElem){
				self.cursorSelect(this);
			}
			if(self.selectedElem.contentEditable!="true"){
				e.preventDefault();
				$(this).contextmenu();
			}
		});
		$(document).delegate("td","dblclick.Tables",function(e){
			self.selectedEditable(true);
		});
		$(document).bind("keydown.Tables",function(e){
			if(self.selectedElem){
				if(self.selected==true&&!e.shiftKey){
					var editting = false;
					if(self.selectedElem.contentEditable){
						edditing=self.selectedElem.contedEditable=="true";
					}
					if(e.keyCode==13){
						self.cursorMove(0,1);
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
						if(!self.selectedElem.contentEditable||self.selectedElem.contentEditable=="false"){
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
					setTimeout(self.cursorUpdate,1);
				}
			}
		});
		$(".ribbon").append($('<div id="Table" class="Table container">Table Editting</div>'));
		$(document.body).append($('<div id="table_cursor" class="Table"></div><div id="tablemenu"><ul class="dropdown-menu" role="menu"><li><a tabindex="-1" href="#"><i class="icon-plus"></i>Insert Column</a></li><li><a tabindex="-1" href="#"><i class="icon-trash"></i>Delete Column</a></li><li><a tabindex="-1" href="#"><i class="icon-plus"></i>Insert Row</a></li><li><a tabindex="-1" href="#"><i class="icon-trash"></i>Delete Row</a></li><li class="divider"></li><li><a tabindex="-1" href="#"><i class="icon-pencil"></i>Customize Cell</a></li></ul></div>'));
		$("td").attr("data-target","#tablemenu");
		$("#tablemenu a").bind("click.Tables",function(e){
			e.preventDefault();
		});
		$('#tablemenu a:contains("Insert Column")').bind("click.Tables",function(e){
		});
		$('#tablemenu a:contains("Delete Column")').bind("click.Tables",function(e){
		});
		$('#tablemenu a:contains("Insert Row")').bind("click.Tables",function(e){
		});
		$('#tablemenu a:contains("Delete Row")').bind("click.Tables",function(e){
		});
		WebSync.updateRibbon();
	}
	// Disable: Plugin should clean itself up.
	this.disable = function(){
		var elem = $(".Table").remove();
		WebSync.updateRibbon();
		$("*").unbind(".Tables");
		$("*").undelegate(".Tables");
	}
	// Helper methods:
	this.cursorSelect = function(td){
		// Cleanup last elem.
		if(self.selectedElem){
			self.selectedEditable(false);
		}
		document.getSelection().empty();
		self.selected = true;
		self.selectedElem = td;
		self.selectedEditable(false);
		self.cursorUpdate();
	}
	this.cursorMove = function(dColumn, dRow){
		self.selectedEditable(false);
		var pos = self.selectedPos();
		var column = pos[0];
		var row = pos[1];
		if(self.selectedElem.parentElement.parentElement.children.length>row+dRow&&self.selectedElem.parentElement.parentElement.children[0].children.length>column+dColumn&&row+dRow>=0&&column+dColumn>=0){
			var new_td = self.selectedElem.parentElement.parentElement.children[row+dRow].children[column+dColumn];
			self.cursorSelect(new_td);
		}

	}
	this.cursorUpdate = function(){
		var pos = $(self.selectedElem).position();
		$("#table_cursor").offset(pos).height($(self.selectedElem).height()).width($(self.selectedElem).width()).get(0).scrollIntoViewIfNeeded();
	}
	this.selectedEditable = function(edit){
		if(!edit){
			self.selectedElem.contentEditable=false;
			$("#table_cursor").css({borderStyle: 'solid', outlineStyle: 'solid'});
			$('a:contains("Table")').click();
		}else{
			self.selectedElem.contentEditable=true;
			$("#table_cursor").css({borderStyle: 'dashed', outlineStyle: 'dashed'});
			$('a:contains("Text")').click();
			WebSync.setEndOfContenteditable(self.selectedElem);
		}
	}
	this.clearSelect = function(){
		if(self.selected){
			self.selected = false;
			self.selectedEditable(false);
			$("#table_cursor").offset({left:-10000});
			delete self.selectedElem;
			$('a:contains("Text")').click();
		}
	}
	this.selectedPos = function(){
		var child = self.selectedElem;
		var column = 0;
		while( (child = child.previousSibling) != null )
			column++;
		child = self.selectedElem.parentElement
		var row = 0
		while( (child = child.previousSibling) != null )
			row++;
		return [column,row];
	}
	this.tableSize = function(){
		return [self.selectedElem.parentElement.children.length,self.selectedElem.parentElement.parentElement.children.length]
	}
});
