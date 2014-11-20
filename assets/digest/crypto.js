/*jslint browser: true*/
/*global define, $, _*/
define('crypto', function() {
  var self = {};

  $(document.body).append('<div class="modal fade" id="encryptionModal" tabindex="-1" role="dialog" aria-labelledby="insertModalLabel" aria-hidden="true">' +
    '<div class="modal-dialog">' +
    '<div class="modal-content">' +
    '<div class="modal-header">' +
    '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
    '<h4 class="modal-title">Create or Upload Encryption Keys</h4>' +
    '</div>' +
    '<div class="modal-body">' +
      '<div class="0">' +
      '<p>Hi! To configure end-to-end encryption in WebSync</p>' +
      '<button type="button" class="btn btn-primary btn-block" id="genKey">Generate a Key</button>' +
      '<button type="button" class="btn btn-default btn-block" id="uploadKey">Upload a Key</button>' +
      '</div>' +
      '<div class="genKey">' +
        '<label for="realName">Your Real Name</label>' +
        '<input type="text" class="form-control" id="realName">' +
        '<label for="password">Passphrase</label>' +
        '<input type="password" class="form-control" id="password">' +
        '<label for="password2">Repeat Passphrase</label>' +
        '<input type="password" class="form-control" id="password2">' +
        '<label for="keySize">RSA Key Size</label>' +
        '<select class="form-control" id="keySize">' +
        _.map([1024, 2048, 4096], function(type) {
          return '<option>' + type + ' bit</option>';
        }).join('') +
        '</select>' +
        ' <button type="button" class="btn btn-primary btn-block" id="doGenKey">Generate</button>' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>');
  self.stage = 0;
  self.updateStage = function() {
    $('#encryptionModal .modal-body').children().hide();
    $('#encryptionModal .modal-body .'+self.stage).show();
    if (self.stage === 0) {
    } else if (self.stage === 1) {
    }
  };
  $('#encryptionModal #genKey').on('click', function(e) {
    self.stage = 'genKey';
    self.updateStage();
  });

  self.checkKeys = function() {
    if (!(window.localStorage.hasOwnProperty('websync-key-private') &&
        window.localStorage.hasOwnProperty('websync-key-public'))) {
      self.stage = 0;
      self.updateStage();
      $('#encryptionModal').modal();
    }
  };
  return self;
});
