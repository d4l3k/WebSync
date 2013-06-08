/**
 *  jQuery mutationObserver 1.0.1
 *	https://github.com/timbonicus/jquery-mutationobserver
 *
 *	Dual licensed under the MIT and GPL licenses.
 *	http://en.wikipedia.org/wiki/MIT_License
 *	http://en.wikipedia.org/wiki/GNU_General_Public_License
 */
(function($) {
    var jQueryMutationFns = ['after', 'append', 'before', 'empty', 'html', 'prepend', 'remove']
    var mutationObservers = []

    $.each(jQueryMutationFns, function(i, fn) {
        var originalFn = $.fn[fn]
        $.fn[fn] = function() {
            var result = originalFn.apply(this, arguments)
            fire(this)
            return result
        }
    })

    function fire($element) {
        $.each(mutationObservers, function(i, observer) {
            if ($element.closest(observer.el).length)
                observer.listener()
        })
    }

    $.fn.mutationObserver = function(listenerFn) {
        if (this.length == 0)
            return this
        if (this.length > 1)
            return $.each(this, function(i, obj) { $(obj).mutationObserver(listenerFn) })

        mutationObservers.push({el: this, listener: $.proxy(listenerFn, this)})
    }
}(jQuery));
