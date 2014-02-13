// WebSync: Page layout handler
define("/assets/spreadsheet.js", ['websync', "/assets/tables.js"], function(websync, tables) {
    var self = this;
    console.log("Spreadsheet loaded");
    $(".content").hide().addClass("content-spreadsheet").fadeIn();
    $(".content").append($('<div id="spreadsheetWell" class="content_container"><table><tbody id="tableInner"></tbody></table></div>'));
    $(".content").append($('<div id="top_corner"></div>'));
    if (!WebSyncData.body) {
        WebSyncData.body = [];
    }
    WebSync.toJSON = function() {
        var json_set = [];
        var rows = $("#tableInner").get(0).childNodes;
        _.each(rows, function(row, index) {
            json_set[index] = [];
            _.each(row.childNodes, function(cell, index2) {
                json_set[index][index2] = DOMToJSON(cell.childNodes);
            });
        })
        WebSyncData.body = json_set;
        //WebSyncData.body = DOMToJSON($("#tableInner").get(0).childNodes);
    }
    WebSync.fromJSON = function() {
        var html_set = "";
        _.each(WebSyncData.body, function(row) {
            html_set += "<tr>"
            _.each(row, function(cell) {
                html_set += "<td>" + JSONToDOM(cell) + "</td>";
            });
            html_set += "</tr>";
        });
        $("#tableInner").get(0).innerHTML = html_set; //=JSONToDOM(WebSyncData.body);
    }

    $(document).on("modules_loaded", function() {
        if (_.isEmpty(WebSyncData.body)) {
            console.log("Appending!!!");
            for (var r = 0; r < 50; r++) {
                var row = $("<tr></tr>").appendTo($("#tableInner"));
                for (var c = 0; c < 50; c++) {
                    $("<td></td>").appendTo(row);
                }
            }
        } else {
            WebSync.fromJSON();
        }
        NProgress.done();
    });
    if (WebSyncAuth.view_op == 'edit') {
        //$(".slide").attr("contenteditable",true);
    }
    $(".content_well").children().bind("mousedown selectstart", function(e) {
        e.stopPropagation();
    });
    self.updateHeaders = function(e) {
        $(".axis#y").offset({
            left: -1
        });
        $(".axis#x").offset({
            top: $('.content_well').offset().top + 1
        });
        $("#top_corner").offset({
            left: -1,
            top: $('.content_well').offset().top - 1
        });
    }
    self.updateHeaders();
    $(".content_well").scroll(self.updateHeaders);
    $(".navbar-fixed-top").css({
        "border-bottom": "1px solid #aaa"
    })
    setTimeout(function() {
        $("#spreadsheetWell tr:first-child td:first-child").trigger("mousedown").trigger("mouseup");
    }, 100);
    return self;
});
