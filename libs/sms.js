var debug = require('debug')('automaticsms'),
    nconf = require('nconf'),
    twilio = require('twilio')(nconf.get('TWILIO_SID'), nconf.get('TWILIO_TOKEN')),
    db = require('./database');


exports.sendSMS = function(automatic_id, phone, message) {
  twilio.sendMessage({
    to: phone,
    from: nconf.get('TWILIO_NUMBER'),
    body: message
  }, function(e, responseData) {
    if(e) return debug(e);

    db.incrementCounts(automatic_id);

    debug('[' + phone + '][sendSMS] ' + responseData.errorCode);
    debug('[' + phone + '][sendSMS] ' + responseData.body);
  });
};
