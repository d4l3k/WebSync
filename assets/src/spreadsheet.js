// WebSync: Spreadsheet layout handler
define('/assets/spreadsheet.js', ['websync', '/assets/tables.js'], function(websync, tables) {
    var self = this;
    console.log('Spreadsheet loaded');
    $('.content').hide().addClass('content-spreadsheet').fadeIn();
    $('.content').append($('<div id="spreadsheetWell" class="content_container"><div class="table_content"></div></div>'));
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
            top: $('.content_well').offset().top - 1
        });
        if ($('.axis#x').length > 0) {
            var x_rect = $('.axis#x')[0].getBoundingClientRect();
            var y_rect = $('.axis#y')[0].getBoundingClientRect();
            $('.content-spreadsheet #spreadsheetWell').css({
                'padding-top': x_rect.height - 2,
                'padding-left': y_rect.width - 2
            });
        }
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
