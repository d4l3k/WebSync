/*jslint browser: true*/
/*global define, $, _, openpgp, JST, WebSyncAuth, WebSyncData, WS, moment*/

//= require templates/crypto

define('crypto', function() {
  'use strict';

  /**
   * The crypto end-to-end encryption module for WebSync. Uses openpgp.js.
   *
   * @exports crypto
   * @module crypto
   */

  var exports = {};

  // Variables to store the keys and the decrypted session key.
  var privateKey, publicKey, sessionKey, sessionKeyAlgorithm;

  // Add a comment to the generated pgp keys.
  openpgp.config.commentstring += ' - Generated for https://WebSyn.ca';

  /** Encodes a key into a URL that can be downloaded. */
  function encodeDownload(text) {
    return 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(text);
  }

  /** Downloads a file to the browser. */
  function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', encodeDownload(text));
    pom.setAttribute('download', filename);
    pom.click();
  }

  $(document.body).append(JST['templates/crypto']({}));

  /** The current stage the crypto dialog is in. */
  exports.stage = 0;
  /** The encryption dialog modal. */
  exports.$modal = $('#encryptionModal');

  /**
   * Sets the current stage the crypto dialog is in.
   * @param {String/Number} stage
   */
  exports.updateStage = function(stage) {
    if (stage !== undefined) {
      exports.stage = stage;
    }
    if (stage === 'saveOptions') {
      var puKey = window.localStorage['websync-key-public'];
      var prKey = window.localStorage['websync-key-private'];
      exports.$modal.find('#publicKey').
      attr('href', encodeDownload(puKey));
      exports.$modal.find('#privateKey').
      attr('href', encodeDownload(prKey));
    }
    $('#encryptionModal .modal-body').children().hide();
    $('#encryptionModal .modal-body .' + exports.stage).show();
  };
  $('#encryptionModal #genKey').on('click', function() {
    exports.updateStage('genKey');
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
    var callbacks = exports.checkKeysCallback;
    exports.checkKeysCallback = [];
    _.each(callbacks, function(cb) {
      cb();
    });
    exports.$modal.modal('hide');
  });
  $('#encryptionModal #doUploadKey').on('click', function(e) {
    var puKey = $('textarea#publicKey').val();
    var prKey = $('textarea#privateKey').val();
    window.localStorage['websync-key-public'] = puKey;
    window.localStorage['websync-key-private'] = prKey;
    privateKey = openpgp.key.readArmored(prKey).keys[0];
    publicKey = openpgp.key.readArmored(puKey).keys[0];
    exports.setPrivateKey();
    exports.updateStage('saveOptions');
    e.preventDefault();
  });
  $('#encryptionModal #uploadKey').on('click', function() {
    exports.updateStage('uploadKey');
  });
  $('#encryptionModal #doGenKey').on('click', function(e) {
    if (exports.genKeyValidator.valid()) {
      var $form = $('#encryptionModal .genKey form');
      openpgp.generateKeyPair({
        numBits: parseInt($form.find('select').val(), 10),
        userId: $form.find('#realName').val(),
        passphrase: $form.find('#password').val()
      }).then(function(result) {
        exports.updateStage('keyGenerated');
        privateKey = result.key;
        exports.setPrivateKey();
        var puKey = result.publicKeyArmored;
        var prKey = result.privateKeyArmored;
        window.localStorage['websync-key-public'] = puKey;
        window.localStorage['websync-key-private'] = prKey;
        download('websync-publickey.key', puKey);
        download('websync-privatekey.key', prKey);
      });
      exports.updateStage('saveOptions');
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
      exports.decryptPrivateKey(pass);
      if (storePass) {
        window.localStorage['websync-passphrase'] = window.btoa(pass);
      }
      exports.$modal.modal('hide');
    } else {
      $('#encryptionModal .decrypt .decrypt.error').text('Invalid passphrase!');
    }
    e.preventDefault();
  });

  /** The generation key form validator. */
  exports.genKeyValidator = $('#encryptionModal .genKey form').validate();

  /** The upload key form validator. */
  exports.uploadKeyValidator = $('#encryptionModal .uploadKey form').validate();

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
  /** An array for the check keys callbacks to be stored in. */
  exports.checkKeysCallback = [];

  /**
   * Checks to see if the keys are present and decrypted. If not it will prompt the user.
   * Once the keys are available it will call the callback.
   * @param {Function} callback - The function to be called once the keys are ready.
   */
  exports.checkKeys = function(callback) {
    if (!(window.localStorage.hasOwnProperty('websync-key-private') &&
        window.localStorage.hasOwnProperty('websync-key-public') &&
        !_.include(window.location.hash, 'cryptoclean'))) {
      exports.updateStage(0);
      $('#encryptionModal').modal();
      if (callback) {
        exports.checkKeysCallback.push(callback);
      }
    } else {
      privateKey = openpgp.key.readArmored(window.localStorage['websync-key-private']).keys[0];
      publicKey = openpgp.key.readArmored(window.localStorage['websync-key-public']).keys[0];
      exports.setPrivateKey();
      if (window.localStorage.hasOwnProperty('websync-passphrase')) {
        var pass = atob(window.localStorage['websync-passphrase']);
        privateKey.decrypt(pass);
        exports.decryptPrivateKey(pass);
      }
      if (!exports.keyIsDecrypted(privateKey)) {
        exports.updateStage('decrypt');
        $('#encryptionModal').modal();
      }
      if (callback) {
        callback();
      }
    }
  };

  /**
   * Checks if a key and all of its sub keys are decrypted.
   * @param {openpgp.key.Key} key - The key to check.
   * @return {Boolean}
   */
  exports.keyIsDecrypted = function(key) {
    return _.reduce(key.getAllKeyPackets(), function(decrypted, packet) {
      return decrypted && packet.isDecrypted;
    });
  };

  /**
   * Encrypts a session key for the specified public key.
   * @param {openpgp.key.Key} key - The public key to encrypt the session key for.
   * @return {openpgp.message.Message}
   */
  exports.wrapSymmetricForKey = function(key) {
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

  /**
   * Scans a number of encrypted session keys until it finds one it can decrypt and returns it.
   * @param {Array} keys - The encrypted session keys.
   * @return {String}
   */
  exports.decodeSymmetricKeys = function(keys) {
    var decrypted = false;
    _.each(keys, function(key) {
      var symKey = exports.decryptSymmetricKey(key);
      if (symKey) {
        exports.setSessionKey(
          symKey.sessionKey,
          symKey.sessionKeyAlgorithm);
        decrypted = true;
      }
    });
    return decrypted;
  };

  /**
   * Decrypts a symmetric key using the current private key.
   * @param {String} message - The armored encrypted key message.
   * @return {openpgp.key.Key | false}
   */
  exports.decryptSymmetricKey = function(msg) {
    var message = openpgp.message.readArmored(msg);
    var encryptionKeyIds = message.getEncryptionKeyIds();
    var privateKeyPacket = privateKey.getKeyPacket(encryptionKeyIds);
    var pkESKeyPacketlist = message.packets.filterByTag(openpgp.enums.packet.publicKeyEncryptedSessionKey);
    var pkESKeyPacket, i;
    for (i = 0; i < pkESKeyPacketlist.length; i++) {
      if (pkESKeyPacketlist[i].publicKeyId.equals(privateKeyPacket.getKeyId())) {
        pkESKeyPacket = pkESKeyPacketlist[i];
        pkESKeyPacket.decrypt(privateKeyPacket);
        break;
      }
    }
    if (pkESKeyPacket) {
      return pkESKeyPacket;
    }
    return false;
  };

  var worker = new Worker('/assets/crypto-worker.js');
  var callbacks = {};
  worker.onmessage = function(oEvent) {
    var event = oEvent.data;
    if (event.event === 'request-seed') {
      exports.seedRandom(RANDOM_SEED_REQUEST);
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

  /**
   * Seeds the crypto worker with the needed random values.
   * @param {Integer} size - The number of bytes to send.
   */
  exports.seedRandom = function(size) {
    var buf = new Uint8Array(size);
    openpgp.crypto.random.getRandomValues(buf);
    execute('seedRandom', [buf]);
  };
  exports.seedRandom(INITIAL_RANDOM_SEED);

  /**
   * Sends the private key to the web worker so it can decrypt messages.
   */
  exports.setPrivateKey = function() {
    execute('setPrivateKey', [privateKey.armor()]);
  };

  /**
   * Decrypts the private key on the web worker.
   * @param {String} passphrase - The passphrase to the private key.
   */
  exports.decryptPrivateKey = function(passphrase) {
    execute('decryptPrivateKey', [passphrase]);
  };

  /**
   * Sets the symmetric key locally and on the web worker.
   * @params {String} key - The session key
   * @params {String | Integer} algorithm - The algorithm used for the session key. Ex: 'aes256' or 9.
   */
  exports.setSessionKey = function(key, algo) {
    sessionKey = key;
    if (_.isNumber(algo)) {
      sessionKeyAlgorithm = openpgp.enums.read(openpgp.enums.symmetric, algo);
    } else {
      sessionKeyAlgorithm = algo;
    }
    execute('setSessionKey', [key, sessionKeyAlgorithm]);
  };

  /**
   * Decrypts a message with the symmetric key.
   * @params {String | Array} message - The armored message, or list of messages.
   * @params {Function} callback - The function to call with the decrypted message.
   */
  exports.decryptWithSymmetricKey = function(msg, callback) {
    if (_.isString(msg)) {
      execute('decryptWithSymmetricKey', [msg], callback);
    } else {
      var count = msg.length;
      var num_decrypted = 0;
      var decrypted = new Array(count);
      _.each(msg, function(msg, i) {
        execute('decryptWithSymmetricKey', [msg], function(decrypted_msg) {
          decrypted[i] = decrypted_msg;
          num_decrypted += 1;
          if (num_decrypted === count) {
            callback(decrypted);
          }
        });
      });
    }
  };

  /**
   * Encrypts a message with the symmetric key.
   * @params {String} message - The message.
   * @params {Function} callback - The function to call with the encrypted message.
   */
  exports.encryptWithSymmetricKey = function(msg, callback) {
    execute('encryptWithSymmetricKey', [msg], callback);
  };

  /**
   * Encrypts and signs a message with the symmetric key.
   * @params {String} message - The message.
   * @params {Function} callback - The function to call with the encrypted message.
   */
  exports.signAndEncryptWithSymmetricKey = function(msg, callback) {
    execute('signAndEncryptWithSymmetricKey', [msg], callback);
  };

  /**
   * Converts the current document into an encrypted one.
   */
  exports.encryptDocument = function() {
    WS.info('Encrypting the document...');
    exports.checkKeys();

    if (sessionKey || WebSyncAuth.encrypted) {
      console.warn('crypto: encryptDocument called on an already encrypted document');
      return;
    }

    // Generate symmetric key
    var symAlgo = openpgp.key.getPreferredSymAlgo([privateKey]);
    var symAlgoName = openpgp.enums.read(openpgp.enums.symmetric, symAlgo);
    exports.setSessionKey(
      openpgp.crypto.generateSessionKey(symAlgoName),
      symAlgoName);
    var wrappedSym = exports.wrapSymmetricForKey(publicKey);

    // To encrypt the document we need to encrypt the blob, patches and shared list.
    // TODO: Encrypt patches and shared list.
    WebSyncAuth.encrypted = true;
    WebSyncData.encryption_date = new Date();
    exports.signAndEncryptWithSymmetricKey(JSON.stringify(WebSyncData), function(blob) {
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
      WS.success('This document is now encrypted!');
      exports.updateLockButton();
    });
  };

  /** Updates the icon and tooltip on the lock button. */
  exports.updateLockButton = function() {
    if (WebSyncAuth.encrypted) {
      $('#cryptoBtn i').removeClass('fa-unlock');
      $('#cryptoBtn').attr('title', 'Encrypted');
    }
  };
  $('nav #settings').prepend('<li>' +
    '<a id="cryptoBtn" title="Click to Encrypt"><i class="fa fa-lock fa-unlock fa-lg"></i></a>' +
    '</li>');
  exports.updateLockButton();
  $('#cryptoBtn').click(function() {
    if (!WebSyncAuth.encrypted) {
      exports.checkKeys(function() {
        exports.updateStage('encrypt');
        $('#encryptionModal').modal();
      });
    }
  });
  $('#doEncryptDocument').click(function(e) {
    exports.encryptDocument();
    $('#encryptionModal').modal('hide');
    e.preventDefault();
  });
  return exports;
});
