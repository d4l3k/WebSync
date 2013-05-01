// WebSync: Chat Plugin
// WebSync uses RequireJS for modules.
// define( [pluginName], [requiredModules], definition);
// pluginName is an optional argument that should only be used if the module is being bundled/loaded without RequireJS. It should match the path it's being required as.
define(['websync'],function(edit,websink){ var self = {};
    // Save all variables and information to the self object.

    // Plugins should use a jQuery namespace for ease of use.
	// Bind Example: $(document).bind("click.Tables", clickHandler);
	// Unbind Example: $("*").unbind(".Tables");
    self.open = false;
    $('body').append($('<div id="chat" class="sidebar"><div id="user_list"></div><div id="chat_well"></div><div class="chat_input input-append"><input class="span2" id="appendedInputButton" type="text"><button id="msg_btn" class="btn" type="button">Send</button></div></div>'));
    $('#settings').prepend($('<li><a id="chat_btn" title="Chat"><img src="http://i.imgur.com/FNE5L42.png"></img> <span id="user_count" class="badge">1</span></a></li>'));
    $("#chat").offset({left:window.innerWidth+1});
    $("#chat img").tooltip();
    $(document).bind('client_load.Chat',function(e,data){
        console.log("Client_load",data);
        var client = data.client;
        var client_dom = $("#client_"+client);
        var user = WebSync.clients[client];
        var user_info = WebSync.users[user.id];
        if(client_dom.length>0){
            if(user_info.displayName){
                client_dom.children().attr('data-original-title',_.escape(user_info.displayName));
            }
        } else {
            self.addUser(client);
        }
        self.updateUserList();
    });
    $("#msg_btn").bind('click.Chat',function(e){
        self.msg();
    });
    $(".chat_input input").bind('keypress.Chat',function(e){
        if(e.which==13){
            self.msg();
        }
    });
    $(document).bind("client_event_chat_msg.Chat",function(e,data){
        self.clientMsg(data.from,data.data);
    });
    self.msg = function(){
        var msg = $(".chat_input input").val();
        if(msg.length>0){
            WebSync.broadcastEvent('chat_msg',msg);
            self.clientMsg(WebSyncAuth.id,msg);
            $(".chat_input input").val("");
        }
    }
    self.addUser = function(client){
        var user = WebSync.clients[client];
        var user_info = WebSync.users[user.id];
        var display_name = user_info.displayName;
        if(!display_name){
            display_name = user.email;
        }
        display_name = _.escape(display_name);
        $("#user_list").append('<a target="_blank" id="client_'+client+'" href="https://secure.gravatar.com/'+user.id+'"><img data-toggle="tooltip" data-placement="bottom" title="'+display_name+'" src="https://secure.gravatar.com/avatar/'+user.id+'?size=38&d=http://i.imgur.com/xzn2nB0.png"></img></a>').children().last().children().tooltip();
    }
    $(document).bind('client_leave.Chat',function(e,data){
        console.log("Client leaving",data);
        $("#client_"+data.client).remove();
        self.updateUserList();
    });
    $(document).bind('noconnection.Chat',function(){
        $("#user_list").empty();
        self.updateUserList();
    });
    self.updateUserList = function(){setTimeout(function(){
        $("#user_count").text(_.size(WebSync.clients));
        $("#chat_well").css({top: $("#user_list").height()-5});
    },100);};
    self.clientMsg = function(client, msg){
        var user = WebSync.clients[client];
        var user_info = WebSync.users[user.id];
        var display_name = user_info.displayName;
        if(!display_name){
            display_name = user.email;
        }
        display_name = _.escape(display_name);
        $("#chat_well").append('<p><a target="_blank" href="https://secure.gravatar.com/'+user.id+'"><img src="https://secure.gravatar.com/avatar/'+user.id+'?size=38&d=http://i.imgur.com/xzn2nB0.png"></img><span>'+display_name+':</span></a> '+_.escape(msg)+'</p>');
        if(!self.open){
            $("#user_count").addClass("badge-pulse");
        }
        $("#chat_well").animate({scrollTop:$("#chat_well").get(0).scrollHeight},200);
    }
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
            $("#user_count").removeClass("badge-pulse");
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
    $.each(WebSync.clients,function(k, v){
        self.addUser(k);
        self.updateUserList();
    });

    // Return self so other modules can hook into this one.
    return self;
});
