/*jslint browser: true*/
/*global define, $, _, openpgp, escape, FileReader*/

//= require templates/crypto

define('crypto', function() {
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

  $(document.body).append(JST['templates/crypto']({}));
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
  _.delay(function() {
    require('websync').registerMessageEvent('keys', function(data) {
      console.log(data);
      var $tbody = $('#keys tbody').html('');
      _.each(_.union(data.keys.public, data.keys.private), function(data) {
        var unarmored = openpgp.key.readArmored(data.body);
        var userid = unarmored.keys[0].users[0].userId.userid;
        $tbody.append('<tr><td>' +
          data.type +
          '</td><td>' +
          userid +
          '</td><td>' +
          moment(data.created) +
          '</td><tr>');
      });
    }).registerMessageEvent('info', function(data) {
      require('websync').connection.sendJSON({
        type: 'keys',
        action: 'get'
      });
    });
  }, 1);
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
