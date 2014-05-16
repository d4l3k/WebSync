// WebSync: Spreadsheet layout handler
define('/assets/spreadsheet.js', ['websync', '/assets/tables.js'], function(websync, tables) {
    var self = this;
    console.log('Spreadsheet loaded');
    $('.content').hide().addClass('content-spreadsheet').fadeIn();
    $('.content').append($('<div id="spreadsheetWell" class="content_container"><div class="table_content"></div></div>'));
    $('.content').append($('<div id="top_corner"></div>'));
    if (!WebSyncData.body) {
        WebSyncData.body = [];
    }
    WebSync.toJSON = function() {
        WebSyncData.body = [WS.domExceptions.TABLE.dump($('.table_content table')[0])];
        //WebSyncData.body = DOMToJSON($("#tableInner").get(0).childNodes);
    };
    WebSync.fromJSON = function() {
        $('.table_content').html(WS.domExceptions.TABLE.load(WebSyncData.body[0]));
    };

    $(document).on('modules_loaded', function() {
        if (_.isEmpty(WebSyncData.body)) {
            console.log('Appending!!!');
            $('.table_content').html('<table><tbody></tbody></table>');
            for (var r = 0; r < 50; r++) {
                var row = $('<tr></tr>').appendTo($('.table_content > table > tbody'));
                for (var c = 0; c < 50; c++) {
                    $('<td></td>').appendTo(row);
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
    $('.content_well').children().bind('mousedown selectstart', function(e) {
        e.stopPropagation();
    });
    self.updateHeaders = function(e) {
        $('.axis#y').offset({
            left: -1
        });
        $('.axis#x').offset({
            top: $('.content_well').offset().top + 1
        });
        $('#top_corner').offset({
            left: -1,
            top: $('.content_well').offset().top - 1
        });
    };
    self.updateHeaders();
    $('.content_well').scroll(self.updateHeaders);
    $('.navbar-fixed-top').css({
        'border-bottom': '1px solid #aaa'
    });
    setTimeout(function() {
        $('#spreadsheetWell tr:first-child td:first-child').trigger('mousedown').trigger('mouseup');
    }, 100);
    return self;
});
