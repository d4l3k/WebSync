// Web-Sync: Tables Plugin
WebSync.register({
	// Plugin name
	name: "Tables",
	// Enable: This is where everything should be setup.
	// Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.tables", clickHandler);
	// Unbind Example: $(document).unbind(".tables");
	enable: function(){
		$(document).bind("click.tables",function(e){
			console.log(e);
		});
	},
	// Disable: Plugin should clean itself up.
	disable: function(){
		$(document).unbind(".tables");
	}
});
