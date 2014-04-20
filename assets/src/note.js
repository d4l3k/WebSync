// WebSync: Notebook layout handler
define("/assets/note.js", ['websync'], function(websync) {
    var self = {};
    $(".content").hide().addClass("content-note").fadeIn();
    $("body").addClass("layout-note");
    $("body").append('<div id="context-menu"><ul class="dropdown-menu" role="menu"><li><a tabindex="-1" href="#">Rename</a></li><li><a tabindex="-1" href="#">Delete</a></li></ul></div>');
    $(".content").append($('<div id="note-well" class="content_container"></div>'));
    $('body').append($('<div id="note-nav" class="sidebar"><button id="addSection" class="btn btn-default" type="button"><i class="fa fa-plus"></i> Section</button> <button id="addPage" class="btn btn-default" type="button"><i class="fa fa-plus"></i> Page</button> <button class="btn btn-default toggle-sidebar"><i class="fa fa-bars fa-lg"></i></button><div id="notesView" class="panel panel-default"></div></div>'));
    var hidden = false;
    $("#note-nav .toggle-sidebar").click(function() {
        var pos = -250;
        var button_pos = -47
        if (hidden) {
            pos = 0;
            button_pos = 5;
        }
        $(this).animate({
            right: button_pos
        });
        $("#note-nav").animate({
            left: pos
        });
        $(".content_well").animate({
            left: pos + 250
        }, function() {
            $(document).trigger("resize");
        });
        hidden = !hidden;
    });
    self.updateNav = function() {
        var html = "<ul class='nav nav-list'>";
        var active_section = $(".note-section:visible")[0];
        var active_page = $(".note-page:visible")[0];
        $(".note-section").each(function(index, section) {
            var sect = $(section);
            var name = (section.dataset.name || "Unnamed Section");
            html += "<li " + (section == active_section ? "class='active2'" : "") + "><a class='section' data-index=" + index + ">" + name + "</a><ul class='nav nav-list'>"
            sect.children().each(function(index, page) {
                var page_name = ($(page).children().filter(".note-title").text().trim() || $(page).children().filter(":not('.note-title')").first().text().trim() || "Unnamed Page");
                html += "<li " + (page == active_page ? "class='active'" : "") + "><a class='page' data-index=" + index + ">" + page_name + "</a></li>";
            });
            html += "</ul></li>";
        });
        html += "</ul>";
        var nav = $("#notesView").html(html);
        var selectedElem = null;
        $("#notesView a").contextmenu({
            target: "#context-menu",
            before: function(e, element) {
                console.log(e, element);
                if ($(element).hasClass("page")) {
                    $("#context-menu li:contains('Rename')").hide();
                } else {
                    $("#context-menu li:contains('Rename')").show();
                }
                selectedElem = element[0];
                return true;
            },
            onItem: function(e, element) {
                var op = element[0].innerText;
                var target = null;
                if ($(selectedElem).hasClass("page")) {
                    var page = $(selectedElem).data().index;
                    var section = $(selectedElem).parent().parent().parent().children().first().data().index;
                    target = $(".note-section").eq(section).children().eq(page);
                } else if ($(selectedElem).hasClass("section")) {
                    var section = $(selectedElem).data().index;
                    target = $(".note-section").eq(section);
                }
                if (op == "Delete") {
                    target.remove();
                    self.updateNav();
                } else if (op == "Rename") {
                    var finish_rename = function(e) {
                        // Enter or Escape
                        if (!e.keyCode || e.keyCode == 13 || e.keyCode == 27) {
                            e.preventDefault();
                            $(selectedElem).unbind("blur.Note").unbind("keydown.Note");
                            target[0].dataset.name = $(selectedElem).text();
                            self.updateNav();
                        }
                    }
                    $(selectedElem).attr("contenteditable", true).focus().bind("blur.Note", finish_rename).bind("keydown", finish_rename);
                }
            }
        });
    }
    // Check for empty notes to remove.
    self.deselectNoteBubble = function() {
        $("#note-well .note-page section").attr("contenteditable", null).filter(":not('.note-title')").each(function(index, section) {
            if ($(section).text().trim() == "" && $(section).find("img, canvas").length == 0) {
                $(section).remove();
            }
        });
        self.updateNav();
    }
    // Navigation helpers
    self.switchToSection = function(section) {
        $(".note-section").hide();
        $(".note-section").eq(section).show();
        $(document).trigger("clear_select");
    }
    self.switchToPage = function(section, page) {
        self.switchToSection(section);
        $(".note-page").hide();
        $(".note-section").eq(section).children().eq(page).show();
        self.updateNav();
    }
    // Data storage
    if (!WebSyncData.body) {
        WebSyncData.body = [];
    }
    WebSync.toJSON = function() {
        WebSyncData.body = DOMToJSON($("#note-well").get(0).childNodes);
    }
    WebSync.fromJSON = function(patch) {
        console.log("FROM JSON: ", patch);
        //if(!patch){
        // Fallback method.
        $(".content #note-well").get(0).innerHTML = JSONToDOM(WebSyncData.body);
        //} else {
        //    WebSync.applyPatchToDOM($(".content #note-well").get(0),patch.body);
        //}
        self.updateNav();
    }
    $(document).on("modules_loaded", function() {
        if (_.isEmpty(WebSyncData.body)) {
            $("#note-well").append("<div class='note-section'><div class='note-page'><section class='note-title frozen'></section></div>");
            self.updateNav();
        } else {
            WebSync.fromJSON();
        }
        NProgress.done();
    });
    $(".content_well").children().bind("mousedown selectstart", function(e) {
        e.stopPropagation();
    });
    $("#note-well").on("click", ".note-page section", function(e) {
        self.deselectNoteBubble();
        $(e.currentTarget).attr("contenteditable", true);
        e.stopPropagation();
    });
    $("#addSection").on("click", function(e) {
        self.deselectNoteBubble();
        $(".note-section").hide();
        $("#note-well").append("<div class='note-section'><div class='note-page'><section class='note-title frozen'></section></div>");
        self.updateNav();
    });
    $("#addPage").on("click", function(e) {
        self.deselectNoteBubble();
        $(".note-page").hide();
        $(".note-section:visible").eq(0).append("<div class='note-page'><section class='note-title frozen'></section>");
        self.updateNav();
    });
    $("#note-well").on("click", ".note-page", function(e) {
        console.log(e);
        self.deselectNoteBubble();
        var page = e.currentTarget;
        var note = $("<section></section")
        $(page).append(note);
        note.attr("contenteditable", true).focus();
        note.css({
            left: e.offsetX,
            top: e.offsetY
        });
    });
    $("#notesView").on("click", ".section", function(e) {
        var section = e.currentTarget.dataset.index;
        self.switchToPage(section, 0);
    }).on("click", ".page", function(e) {
        var section = parseInt(e.currentTarget.parentElement.parentElement.parentElement.childNodes[0].dataset.index);
        var page = e.currentTarget.dataset.index;
        self.switchToPage(section, page);
    });
    return self;
});
