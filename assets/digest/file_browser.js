/*global $, _, window, JST*/

//= require lodash/dist/lodash.min.js
//= require moment/moment.js

//= require templates/file-browser

(function() {
  function updateSearchResults() {
    var options = {
      public: window.location.pathname === '/public',
      deleted: window.location.pathname === '/deleted',
      q: $('.file_list .search input').val()
    };
    var url = _.template('/apifiles?public=${public}&deleted=${deleted}&q=${q}', options);
    $.get(url, function(resp) {
      var results = JSON.parse(resp);
      $('.files table').html(JST['templates/file-browser']({
        results: results,
        deleted: options.deleted,
        public: options.public
      }));
    });
  }
  function searchHandler() {
    _.defer(updateSearchResults);
  }

  setTimeout(function() {
    updateSearchResults();
    $('.file_list .search input').keydown(searchHandler);
    $('.file_list .search button').click(searchHandler);
  }, 0);
}());
