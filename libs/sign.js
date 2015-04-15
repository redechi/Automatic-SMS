var crypto = require('crypto');
var URLSafeBase64 = require('urlsafe-base64');

module.exports = function(privateKeyInModifiedBase64, theString) {
  var privateKeyInABuffer = URLSafeBase64.decode(privateKeyInModifiedBase64);
  var hashInABuffer = crypto.createHmac('sha1', privateKeyInABuffer).update(theString).digest();
  var hashEncodedWebSafe = URLSafeBase64.encode(hashInABuffer);

  return hashEncodedWebSafe;
};
