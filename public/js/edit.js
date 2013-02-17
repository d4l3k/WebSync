
WebSync = {
	start: function(){
		WebSync.connection = new WebSocket("ws://"+window.location.host+window.location.pathname);
		WebSync.connection.onopen = function(e){
			console.log(e);
			WebSync.diffInterval = setInterval(WebSync.checkDiff,1000);
		}
		WebSync.connection.onclose = function(e){
			console.log(e);
			clearInterval(WebSync.diffInterval);
		}
		WebSync.connection.onmessage = function(e){
			console.log(e);
		}
		WebSync.connection.onerror = function(e){
			console.log(e);
		}
		WebSync.old_html = $(".content p").html();
		$(".content p").keypress(function(e){
			console.log(e);
		});
	},
	checkDiff: function(){
		var new_html = $(".content p").html();
		if(new_html!=WebSync.old_html){
			console.log("Updates!");
			WebSync.connection.send(JSON.stringify({type: "text_update",text: new_html}))
			WebSync.old_html=new_html;
		}
	},
	old_html: ""
}

$(document).ready(WebSync.start);
