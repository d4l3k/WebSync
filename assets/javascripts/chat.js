// Web-Sync: Chat Plugin
// WebSync uses RequireJS for modules.
// define( [pluginName], [requiredModules], definition);
// pluginName is an optional argument that should only be used if the module is being bundled/loaded without RequireJS. It should match the path it's being required as.
define(['websync'],function(edit,websync){ var self = {};
    // Save all variables and information to the self object.

    // Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.Tables", clickHandler);
	// Unbind Example: $("*").unbind(".Tables");
    self.open = false;
    $('body').append($('<div id="chat" class="sidebar"><div id="user_list"><a target="_blank" href="https://secure.gravatar.com/b280c8b6b26d1ec3d2fcd45f5c56053f"><img data-toggle="tooltip" data-placement="bottom" src="https://secure.gravatar.com/avatar/b280c8b6b26d1ec3d2fcd45f5c56053f?size=38" title="Tristan Rice"></img></a><a target="_blank" href="https://secure.gravatar.com/119eaf07c4c2572aa80ee79d4d011dc2"><img data-toggle="tooltip" data-placement="bottom" src="https://secure.gravatar.com/avatar/119eaf07c4c2572aa80ee79d4d011dc2?size=38" title="arkaniad"></img></a></div><div id="chat_well"><p><a target="_blank" href="https://secure.gravatar.com/b280c8b6b26d1ec3d2fcd45f5c56053f"><img src="https://secure.gravatar.com/avatar/b280c8b6b26d1ec3d2fcd45f5c56053f?size=38"></img><span>Tristan Rice:</span></a>Blah blah blah.</p></div><div class="chat_input input-append"><input class="span2" id="appendedInputButton" type="text"><button class="btn" type="button">Send</button></div></div>'));
    $('#settings').prepend($('<li><a id="chat_btn"><i class="icon-phone icon-large"></i><span class="badge badge-pulse">1</span></a></li>'));
    $
    $("#chat").offset({left:window.innerWidth+1});
    $("#chat img").tooltip();
    self.toggle = function(){
        $("#chat_btn").parent().toggleClass("active");
        if(self.open){
            $("#chat").animate({left:window.innerWidth+1},200);
            $(".content_well").animate({width:window.innerWidth},200,function(){
                $(".content_well").get(0).style.width=null;
            });
            self.open=false;
        } else {
            //$("#chat").animate({left:window.innerWidth-251},200);
            self.open = true;
            self.resize();
        }
    }
    $("#chat_btn").bind("click.Chat",self.toggle);
    self.resize = function(e){
        if(self.open){
            $("#chat").animate({left:window.innerWidth-251},200);
            $('.content_well').animate({width:window.innerWidth-251},200);
        }
        $("#chat").height(window.innerHeight-$(".content_well").position().top)
    }
    self.resize();
    $(window).bind('resize.Chat',self.resize);
	// Function: void [plugin=chat].disable();
    // Disables the plugin. This has to be set for possible plugin unloading.
	self.disable = function(){
		$("#chat").remove();
        $("#chat_btn").remove();
        // Reset content_well width;
        $('.content_well').get(0).style.width=null;
		$("*").unbind(".Chat");
		$("*").undelegate(".Chat");
	}

    // Return self so other modules can hook into this one.
    return self;
});
