window.newDoc = function(type) {
  var iframe = $('<iframe></iframe>');
  iframe.appendTo('body');
  iframe.attr('src', '/new/'+type)
  return iframe;
}
