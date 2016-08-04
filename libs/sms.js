const debug = require('debug')('automaticsms');
const nconf = require('nconf');
const twilio = require('twilio')(nconf.get('TWILIO_SID'), nconf.get('TWILIO_TOKEN'));
const db = require('./database');


exports.sendSMS = (automaticId, phone, message) => {
  twilio.sendMessage({
    to: phone,
    from: nconf.get('TWILIO_NUMBER'),
    body: message
  }, (err, responseData) => {
    if (err) return debug(err);

    debug('[' + phone + '][sendSMS] ' + responseData.errorCode);
    debug('[' + phone + '][sendSMS] ' + responseData.body);

    return db.incrementCounts(automaticId);
  });
};
