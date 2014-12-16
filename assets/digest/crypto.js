/*jslint browser: true*/
/*global define, $, _, openpgp, escape, FileReader, JST, WebSyncAuth, moment*/

//= require templates/crypto

/*
 * There's a few things you should know before you encrypt a WebSync document and how it operates.
 * 1. It uses OpenPGP.JS
 * 2. It ONLY encrypts the actual content of the document.
 * 3. It does NOT encrypt the metadata and related content. This consists of:
 *      Title
 *      Users who can view/edit
 *      Creation/Last edit dates
 *      Images uploaded
 */

define('crypto', function() {
  'use strict';

  var self = {};
  var privateKey, publicKey, sessionKey, sessionKeyAlgorithm;

  // Add a comment to the generated pgp keys.
  openpgp.config.commentstring += ' - Generated for https://WebSyn.ca';

  function encodeDownload(text) {
    return 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(text);
  }

  function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', encodeDownload(text));
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
    $('#encryptionModal .modal-body .' + self.stage).show();
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
    var callbacks = self.checkKeysCallback;
    self.checkKeysCallback = [];
    _.each(callbacks, function(cb) {
      cb();
    });
    self.$modal.modal('hide');
  });
  $('#encryptionModal #doUploadKey').on('click', function(e) {
    var puKey = $('textarea#publicKey').val();
    var prKey = $('textarea#privateKey').val();
    window.localStorage['websync-key-public'] = puKey;
    window.localStorage['websync-key-private'] = prKey;
    privateKey = openpgp.key.readArmored(prKey).keys[0];
    publicKey = openpgp.key.readArmored(puKey).keys[0];
    self.setPrivateKey();
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
        privateKey = result.key;
        self.setPrivateKey();
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
  $('#encryptionModal #storePassPhrase').on('click', function() {
    if ($(this).val() === 'on') {
      $('#encryptionModal .decrypt .remember.error').show();
    } else {
      $('#encryptionModal .decrypt .remember.error').hide();
    }
  });
  $('#encryptionModal #doDecryptPassphrase').on('click', function(e) {
    var pass = $('#encryptionModal #passphrase').val();
    var storePass = $('#encryptionModal #storePassPhrase').val() === 'on';
    var success = privateKey.decrypt(pass);
    if (success) {
      self.decryptPrivateKey(pass);
      if (storePass) {
        window.localStorage['websync-passphrase'] = window.btoa(pass);
      }
      self.$modal.modal('hide');
    } else {
      $('#encryptionModal .decrypt .decrypt.error').text('Invalid passphrase!');
    }
    e.preventDefault();
  });
  self.genKeyValidator = $('#encryptionModal .genKey form').validate();
  self.uploadKeyValidator = $('#encryptionModal .uploadKey form').validate();
  _.delay(function() {
    require('websync').registerMessageEvent('keys', function(data) {
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
    }).registerMessageEvent('info', function() {
      require('websync').connection.sendJSON({
        type: 'keys',
        action: 'get'
      });
    });
  }, 1);
  self.checkKeysCallback = [];
  self.checkKeys = function(callback) {
    if (!(window.localStorage.hasOwnProperty('websync-key-private') &&
        window.localStorage.hasOwnProperty('websync-key-public') &&
        !_.include(window.location.hash, 'cryptoclean'))) {
      self.updateStage(0);
      $('#encryptionModal').modal();
      if (callback) {
        self.checkKeysCallback.push(callback);
      }
    } else {
      privateKey = openpgp.key.readArmored(window.localStorage['websync-key-private']).keys[0];
      publicKey = openpgp.key.readArmored(window.localStorage['websync-key-public']).keys[0];
      self.setPrivateKey();
      if (window.localStorage.hasOwnProperty('websync-passphrase')) {
        var pass = atob(window.localStorage['websync-passphrase']);
        privateKey.decrypt(pass);
        self.decryptPrivateKey(pass);
      }
      if (!self.keyIsDecrypted(privateKey)) {
        self.updateStage('decrypt');
        $('#encryptionModal').modal();
      }
      if (callback) {
        callback();
      }
    }
  };
  self.keyIsDecrypted = function(key) {
    return _.reduce(key.getAllKeyPackets(), function(decrypted, packet) {
      return decrypted && packet.isDecrypted;
    });
  };
  self.wrapSymmetricForKey = function(key) {
    var packetlist = new openpgp.packet.List();
    var encryptionKeyPacket = key.getEncryptionKeyPacket();
    var pkESKeyPacket = new openpgp.packet.PublicKeyEncryptedSessionKey();
    pkESKeyPacket.publicKeyId = encryptionKeyPacket.getKeyId();
    pkESKeyPacket.publicKeyAlgorithm = encryptionKeyPacket.algorithm;
    pkESKeyPacket.sessionKey = sessionKey;
    pkESKeyPacket.sessionKeyAlgorithm = sessionKeyAlgorithm;
    pkESKeyPacket.encrypt(encryptionKeyPacket);
    packetlist.push(pkESKeyPacket);
    return new openpgp.message.Message(packetlist);
  };
  self.decodeSymmetricKeys = function(keys) {
    var decrypted = false;
    _.each(keys, function(key) {
      var symKey = self.decryptSymmetricKey(key);
      if (symKey) {
        self.setSessionKey(
          symKey.sessionKey,
          symKey.sessionKeyAlgorithm);
        decrypted = true;
      }
    });
    return decrypted;
  };

  self.decryptSymmetricKey = function(msg) {
    var message = openpgp.message.readArmored(msg);
    var encryptionKeyIds = message.getEncryptionKeyIds();
    var privateKeyPacket = privateKey.getKeyPacket(encryptionKeyIds);
    var pkESKeyPacketlist = message.packets.filterByTag(openpgp.enums.packet.publicKeyEncryptedSessionKey);
    var pkESKeyPacket;
    for (var i = 0; i < pkESKeyPacketlist.length; i++) {
      if (pkESKeyPacketlist[i].publicKeyId.equals(privateKeyPacket.getKeyId())) {
        pkESKeyPacket = pkESKeyPacketlist[i];
        pkESKeyPacket.decrypt(privateKeyPacket);
        break;
      }
    }
    if (pkESKeyPacket) {
      return pkESKeyPacket;
    } else {
      return false;
    }
  };

  var worker = new Worker('/assets/crypto-worker.js');
  var callbacks = {};
  worker.onmessage = function(oEvent) {
    var event = oEvent.data;
    if (event.event === 'request-seed') {
      self.seedRandom(RANDOM_SEED_REQUEST);
    } else {
      var callback = callbacks[event.id];
      if (callback) {
        callback(event.resp);
        delete callbacks[event.id];
      }
    }
  };

  function execute(func, args, callback) {
    var id = btoa(Math.random());
    if (callback) {
      callbacks[id] = callback;
    }
    worker.postMessage({
      id: id,
      func: func,
      args: args
    });
  }

  var INITIAL_RANDOM_SEED = 50000, // random bytes seeded to worker
    RANDOM_SEED_REQUEST = 20000; // random bytes seeded after worker request

  self.seedRandom = function(size) {
    var buf = new Uint8Array(size);
    openpgp.crypto.random.getRandomValues(buf);
    execute('seedRandom', [buf]);
  };
  self.seedRandom(INITIAL_RANDOM_SEED);

  self.setPrivateKey = function() {
    execute('setPrivateKey', [privateKey.armor()]);
  };

  self.decryptPrivateKey = function(passphrase) {
    execute('decryptPrivateKey', [passphrase]);
  };

  self.decryptWithSymmetricKey = function(msg, callback) {
    execute('decryptWithSymmetricKey', [msg], callback);
  };

  self.setSessionKey = function(key, algo) {
    sessionKey = key;
    if (_.isNumber(algo)) {
      sessionKeyAlgorithm = openpgp.enums.read(openpgp.enums.symmetric, algo);
    } else {
      sessionKeyAlgorithm = algo;
    }
    execute('setSessionKey', [key, sessionKeyAlgorithm]);
  };

  self.encryptWithSymmetricKey = function(msg, callback) {
    execute('encryptWithSymmetricKey', [msg], callback);
  };

  self.signAndEncryptWithSymmetricKey = function(msg, callback) {
    execute('signAndEncryptWithSymmetricKey', [msg], callback);
  };

  self.encryptDocument = function() {
    self.checkKeys();

    if (sessionKey || WebSyncAuth.encrypted) {
      console.warn('crypto: encryptDocument called on an already encrypted document');
      return;
    }

    // Generate symmetric key
    var symAlgo = openpgp.key.getPreferredSymAlgo([privateKey]);
    var symAlgoName = openpgp.enums.read(openpgp.enums.symmetric, symAlgo);
    self.setSessionKey(
      openpgp.crypto.generateSessionKey(symAlgoName),
      symAlgoName);
    var wrappedSym = self.wrapSymmetricForKey(publicKey);

    // To encrypt the document we need to encrypt the blob, patches and shared list.
    // TODO: Encrypt patches and shared list.
    WebSyncData.encryption_date = new Date();
    self.signAndEncryptWithSymmetricKey(JSON.stringify(WebSyncData), function(blob) {
      WS.connection.sendJSON({
        type: 'encrypt_document',
        body: {
          encrypted_blob: blob
        },
        symmetricKey: {
          publicKey: publicKey.armor(),
          key: wrappedSym.armor()
        }
      });
      WebSyncAuth.encrypted = true;
    });
  };
  return self;
});
