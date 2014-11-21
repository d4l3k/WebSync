/*jslint browser: true*/
/*global define, $, _, openpgp*/
define('crypto', function() {
  var self = {};
  var key;

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
        '<form>' +
        '<p>' +
          '<label for="realName">Your Real Name</label>' +
          '<input type="text" class="form-control" id="realName" required minlength="2">' +
        '</p>' +
        '<p>' +
          '<label for="password">Passphrase</label>' +
          '<input type="password" class="form-control" id="password" required minlength="6">' +
        '</p>' +
        '<p>' +
          '<label for="password2">Repeat Passphrase</label>' +
          '<input type="password" class="form-control" id="password2" required minlength="6" equalTo="#password">' +
        '</p>' +
        '<p>' +
          '<label for="keySize">RSA Key Size</label>' +
          '<select class="form-control" id="keySize">' +
          _.map([1024, 2048, 4096], function(type) {
            return '<option>' + type + ' bit</option>';
          }).join('') +
          '</select>' +
        '</p>' +
        ' <input type="submit" class="btn btn-primary btn-block" id="doGenKey" value="Generate"></input>' +
        '</form>' +
      '</div>' +
      '<div class="doGenKey">' +
        '<p>Generating key...</p>' +
      '</div>' +
      '<div class="keyGenerated">' +
        '<p>Done generating the keys. Please save these somewhere safe</p>' +
        '<a class="btn btn-default btn-block" id="publicKey" target="_blank">Public Key</a>' +
        '<a class="btn btn-default btn-block" id="privateKey" target="_blank">Private Key</a>' +
      '</div>' +
      '<div class="uploadKey">' +
        '<p>Upload an existing key.</p>' +
        '<form>' +
        '<p>' +
        '<label for="publicKey">Public Key</label>' +
        '<textarea id="publicKey" class="form-control" required/>' +
        '</p>' +
        '<p>' +
        '<label for="privatecKey">Private Key</label>' +
        '<textarea id="privateKey" class="form-control" required/>' +
        '</p>' +
        ' <input type="submit" class="btn btn-primary btn-block" id="doUploadKey" value="Upload"></input>' +
        '</form>' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>');
  self.stage = 0;
  self.$modal = $('#encryptionModal');
  self.updateStage = function(stage) {
    if (stage !== undefined) {
      self.stage = stage;
    }
    $('#encryptionModal .modal-body').children().hide();
    $('#encryptionModal .modal-body .'+self.stage).show();
  };
  $('#encryptionModal #genKey').on('click', function() {
    self.updateStage('genKey');
  });
  $('#encryptionModal #uploadKey').on('click', function() {
    self.updateStage('uploadKey');
  });
  $('#encryptionModal #doGenKey').on('click', function(e) {
    if (self.genKeyValidator.valid()) {
      var $form = $('#encryptionModal .genKey form');
      openpgp.generateKeyPair({
        numBits: parseInt($form.find('select').val(), 10),
        userId: $form.find('#realName').val(),
        passphrase: $form.find('#password').val()
      }).then(function(result) {
        self.updateStage('keyGenerated');
        self.key = result.key;
        var puKey = result.publicKeyArmored;
        var prKey = result.privateKeyArmored;
        window.localStorage['websync-key-public'] = puKey;
        window.localStorage['websync-key-private'] = prKey;
        self.$modal.find('#publicKey').
          attr('href', 'data:,' + escape(puKey));
        self.$modal.find('#privateKey').
          attr('href', 'data:,' + escape(prKey));
        console.log(result);
      });
      self.updateStage('doGenKey');
    }
    e.preventDefault();
  });
  self.genKeyValidator = $('#encryptionModal .genKey form').validate();
  self.uploadKeyValidator = $('#encryptionModal .uploadKey form').validate();
  self.checkKeys = function() {
    if (!(window.localStorage.hasOwnProperty('websync-key-private') &&
        window.localStorage.hasOwnProperty('websync-key-public'))) {
      self.stage = 0;
      self.updateStage();
      $('#encryptionModal').modal();
    } else {
      key = openpgp.key.readArmored(window.localStorage['websync-key-private']);
    }
  };
  return self;
});
