/*global $, _, window, JST*/

//= require lodash/dist/lodash.min.js
//= require moment/moment.js

//= require templates/file-browser

(function() {
  var sort_type = 'date';
  var sort_dir = 'desc';
  function updateSearchResults() {
    var options = {
      public: window.location.pathname === '/public',
      deleted: window.location.pathname === '/deleted',
      q: $('.file_list .search input').val(),
      sort_type: sort_type,
      sort_dir: sort_dir
    };
    var url = _.template('/apifiles?public=${public}&deleted=${deleted}&q=${q}&sort_type=${sort_type}&sort_dir=${sort_dir}', options);
    $.get(url, function(resp) {
      var results = JSON.parse(resp);
      $('.files table').html(JST['templates/file-browser']({
        results: results,
        deleted: options.deleted,
        public: options.public,
        sort_type: sort_type,
        sort_dir: sort_dir
      }));
    });
  }
  function searchHandler() {
    _.defer(updateSearchResults);
  }

  function initialize() {
    if (!(window.$ && window.I18n)) {
      setTimeout(initialize, 10);
      return;
    }
    updateSearchResults();
    $('.file_list .search input').keydown(searchHandler);
    $('.file_list .search button').click(searchHandler);
    $('.file_list').on('click', 'th a', function(e) {
      var type = $(this).data().type;
      if (type !== sort_type) {
        sort_type = type;
      } else {
        sort_dir = sort_dir === 'asc' ? 'desc' : 'asc';
      }
      updateSearchResults();
      e.preventDefault();
    });
  }

  setTimeout(initialize, 0);
}());
