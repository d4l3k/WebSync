/*jslint browser: true*/
/*global define, $, _, openpgp, escape, FileReader*/
define('crypto', ['websync'], function(WS) {
  var self = {};
  var key;

  function encodeDownload(text) {
    return 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(text);
  }
  function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href',encodeDownload(text));
    pom.setAttribute('download', filename);
    pom.click();
  }

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
      '<div class="saveOptions">' +
        '<p>Done. Please save these somewhere safe.</p>' +
        '<a class="btn btn-default btn-block" id="publicKey" target="_blank" download="websync-publickey.key">Public Key</a>' +
        '<a class="btn btn-default btn-block" id="privateKey" target="_blank" download="websync-publickey.key">Private Key</a>' +
        '<p>In addition to storing the encrypted keys in the browser, WebSync can also store them on the server. This makes using multiple computer easier and makes it so you can retrieve them in case you ever lose them.' +
        '<div class="checkbox">' +
          '<label>' +
            '<input type="checkbox" id="storePrivOnServer" checked> Store encrypted keys on server.' +
          '</label>' +
        '</div>' +
        ' <button class="btn btn-primary btn-block" id="saveAndFinish">Finish</button>' +
      '</div>' +
      '<div class="uploadKey">' +
        '<p>Upload an existing key.</p>' +
        '<form>' +
        '<p>' +
        '<label for="publicKey">Public Key <input id="pubkeyfile" type="file"/></label>' +
        '<textarea id="publicKey" class="form-control" required/>' +
        '</p>' +
        '<p>' +
        '<label for="privateKey">Private Key <input id="privkeyfile" type="file"/></label>' +
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
    if (stage === 'saveOptions') {
      var puKey = window.localStorage['websync-key-public'];
      var prKey = window.localStorage['websync-key-private'];
      self.$modal.find('#publicKey').
        attr('href', encodeDownload(puKey));
      self.$modal.find('#privateKey').
        attr('href', encodeDownload(prKey));
    }
    $('#encryptionModal .modal-body').children().hide();
    $('#encryptionModal .modal-body .'+self.stage).show();
  };
  $('#encryptionModal #genKey').on('click', function() {
    self.updateStage('genKey');
  });
  $('#encryptionModal #pubkeyfile').on('change', function(e) {
    var f = e.target.files[0];
    var r = new FileReader();
    r.onload = function(e) {
      var contents = e.target.result;
      $('textarea#publicKey').val(contents);
    };
    r.readAsText(f);
  });
  $('#encryptionModal #privkeyfile').on('change', function(e) {
    var f = e.target.files[0];
    var r = new FileReader();
    r.onload = function(e) {
      var contents = e.target.result;
      $('textarea#privateKey').val(contents);
    };
    r.readAsText(f);
  });
  $('#encryptionModal #saveAndFinish').on('click', function() {
    var save_priv = $('#storePrivOnServer').val() === 'on';
    var puKeys = [window.localStorage['websync-key-public']];
    var prKeys = [];
    if (save_priv) {
      prKeys = [window.localStorage['websync-key-private']];
    }
    require('websync').connection.sendJSON({
      type: 'keys',
      action: 'add',
      keys: {
        public: puKeys,
        private: prKeys
      }
    });
    self.$modal.modal('hide');
  });
  $('#encryptionModal #doUploadKey').on('click', function(e) {
    var puKey = $('textarea#publicKey').val();
    var prKey = $('textarea#privateKey').val();
    window.localStorage['websync-key-public'] = puKey;
    window.localStorage['websync-key-private'] = prKey;
    key = openpgp.key.readArmored(prKey);
    self.updateStage('saveOptions');
    e.preventDefault();
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
        key = result.key;
        var puKey = result.publicKeyArmored;
        var prKey = result.privateKeyArmored;
        window.localStorage['websync-key-public'] = puKey;
        window.localStorage['websync-key-private'] = prKey;
        download('websync-publickey.key', puKey);
        download('websync-privatekey.key', prKey);
      });
      self.updateStage('saveOptions');
    }
    e.preventDefault();
  });
  self.genKeyValidator = $('#encryptionModal .genKey form').validate();
  self.uploadKeyValidator = $('#encryptionModal .uploadKey form').validate();
  self.checkKeys = function() {
    if (!(window.localStorage.hasOwnProperty('websync-key-private') &&
        window.localStorage.hasOwnProperty('websync-key-public') &&
        !_.include(window.location.hash, 'cryptoclean'))) {
      self.stage = 0;
      self.updateStage();
      $('#encryptionModal').modal();
    } else {
      key = openpgp.key.readArmored(window.localStorage['websync-key-private']);
    }
  };
  return self;
});
