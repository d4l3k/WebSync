// Web-Sync: Tables Plugin
WebSync.register({
	// Plugin name
	name: "Tables",
	// Enable: This is where everything should be setup.
	// Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.Tables", clickHandler);
	// Unbind Example: $("*").unbind(".Tables");
	enable: function(){
		$("#table").bind("click.Tables",function(e){
			console.log(e);
		});
		$(".ribbon").append($('<div id="Table" class="container">Table Editting</div>'));
		WebSync.updateRibbon();
	},
	// Disable: Plugin should clean itself up.
	disable: function(){
		var elem = $("#Table").remove();
		WebSync.updateRibbon();
		$("*").unbind(".Tables");
	}
});
