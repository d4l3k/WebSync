/*global onmessage, postMessage, Uint8Array, openpgp, window*/
//= require worker-window.js
//= require openpgp/dist/openpgp.js

var sessionKey, sessionKeyAlgorithm, privateKey;

var openpgp = window.openpgp;

var self = {};

// WebWorkers have no native crypto methods so we need to feed it from the main thread.

var MIN_SIZE_RANDOM_BUFFER = 40000;
var MAX_SIZE_RANDOM_BUFFER = 60000;

window.openpgp.crypto.random.randomBuffer.init(MAX_SIZE_RANDOM_BUFFER);
window.openpgp.config.commentstring = 'a';

self.seedRandom = function(buf) {
  if (!(buf instanceof Uint8Array)) {
    buf = new Uint8Array(buf);
  }
  window.openpgp.crypto.random.randomBuffer.set(buf);
};

// Encryption methods

self.setPrivateKey = function(key) {
  privateKey = openpgp.key.readArmored(key).keys[0];
};

self.decryptPrivateKey = function(passphrase) {
  privateKey.decrypt(passphrase);
};

self.setSessionKey = function(key, algo) {
  sessionKey = key;
  sessionKeyAlgorithm = algo;
};

self.decryptWithSymmetricKey = function(msg) {
  if (typeof msg === 'string') {
    msg = openpgp.message.readArmored(msg);
  }
  var symEncryptedPacketlist = msg.packets.filterByTag(openpgp.enums.packet.symmetricallyEncrypted, openpgp.enums.packet.symEncryptedIntegrityProtected);
  if (symEncryptedPacketlist.length !== 0) {
    var symEncryptedPacket = symEncryptedPacketlist[0];
    symEncryptedPacket.decrypt(sessionKeyAlgorithm, sessionKey);
    var resultMsg = new openpgp.message.Message(symEncryptedPacket.packets);
    // remove packets after decryption
    symEncryptedPacket.packets = new openpgp.packet.List();
    return resultMsg.getText();
  }
};

// Encrypts a message or text with the symmetric sessionKey.
self.encryptWithSymmetricKey = function(msg) {
  if (typeof msg === 'string') {
    msg = openpgp.message.fromText(msg);
  }
  var packetlist = new openpgp.packet.List();

  var symEncryptedPacket;
  if (openpgp.config.integrity_protect) {
    symEncryptedPacket = new openpgp.packet.SymEncryptedIntegrityProtected();
  } else {
    symEncryptedPacket = new openpgp.packet.SymmetricallyEncrypted();
  }
  symEncryptedPacket.packets = msg.packets;
  symEncryptedPacket.encrypt(sessionKeyAlgorithm, sessionKey);
  packetlist.push(symEncryptedPacket);
  // remove packets after encryption
  symEncryptedPacket.packets = new openpgp.packet.List();
  return new openpgp.message.Message(packetlist);
};

self.signAndEncryptWithSymmetricKey = function(text) {
  var msg = openpgp.message.fromText(text);
  msg = msg.sign([privateKey]);
  msg = self.encryptWithSymmetricKey(msg);
  return msg.armor();
};

onmessage = function(oEvent) {
  var event = oEvent.data;

  postMessage({
    id: event.id,
    resp: self[event.func].apply(this, event.args)
  });

  if (window.openpgp.crypto.random.randomBuffer.size < MIN_SIZE_RANDOM_BUFFER) {
    postMessage({
      event: 'request-seed'
    });
  }
};