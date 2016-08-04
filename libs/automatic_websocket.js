const _ = require('underscore');
const debug = require('debug')('automaticsms');
const moment = require('moment');
const nconf = require('nconf');

const browserWebsocket = require('./browser_websocket');
const db = require('./database');
const helpers = require('./helpers');
const sms = require('./sms');


function formatMessage(rule, cb) {
  let message = rule.message;
  if (rule.includeMap) {
    db.createShare({automatic_id: rule.automatic_id})
      .then((share) => {
        message += ` ${nconf.get('URL')}/l/${share.shareId}`;
        cb(null, message);
      })
      .catch(cb);
  } else {
    cb(null, message);
  }
}


function doesRuleApply(rule, event, automaticEvent) {
  try {
    const automaticId = event.user.id;
    const eventId = event.id;
    const eventTime = moment.tz(event.created_at, rule.timezone || event.time_zone);
    const eventDayOfWeek = eventTime.format('dddd');
    const eventTimeMinutes = helpers.getMinutes(eventTime);
    const ruleStartMinutes = rule.allDay === true ? 0 : helpers.getMinutes(moment(rule.startTime, 'h:mma'));
    const ruleEndMinutes = rule.allDay === true ? 1440 : helpers.getMinutes(moment(rule.endTime, 'h:mma'));
    const radius = 0.25;

    // Check that automatic Event type is correct
    if (automaticEvent !== rule.automaticEvent) {
      debug('[' + automaticId + '][' + eventId + '][ruleCheck] Rejected: Rule is ' + rule.automaticEvent + ', not ' + automaticEvent);
      return false;
    }

    // Check if it is the correct day of the week
    if (rule['day' + eventDayOfWeek] === false) {
      debug('[' + automaticId + '][' + eventId + '][ruleCheck] Rejected: Rule is not on correct day of week');
      return false;
    }

    // Check if within time range
    if (eventTimeMinutes < ruleStartMinutes || eventTimeMinutes > ruleEndMinutes) {
      debug('[' + automaticId + '][' + eventId + '][ruleCheck] Rejected: Rule falls outside of time range (' + ruleStartMinutes + ' - ' + ruleEndMinutes + '), time is ' + eventTimeMinutes);
      return false;
    }

    // Check that location is within radius
    if (rule.anywhere !== true) {
      if (!event.location) {
        debug('[' + automaticId + '][' + eventId + '][ruleCheck] Rejected: Rule requires location and event has no location');
        return false;
      }
      const distance = helpers.calculateDistanceMi(event.location.lat, event.location.lon, rule.latitude, rule.longitude);
      if (distance > radius) {
        debug('[' + automaticId + '][' + eventId + '][ruleCheck] Rejected: Rule radius ' + radius + ' does not include this location ' + distance);
        return false;
      }
    }

    return true;
  } catch (err) {
    debug(err);
    return false;
  }
}


function findRules(event, automaticEvent) {
  const automaticId = event.user.id;
  const eventId = event.id;

  db.getRecentCount(automaticId)
    .then((count) => {
      if (count && moment().startOf('month').isSame(moment(count.month)) && count.count > nconf.get('SMS_MONTHLY_LIMIT')) {
        debug('[' + automaticId + '][' + eventId + '][findRules] Monthly limit reached');
        return false;
      }

      db.getActiveRules(automaticId)
        .then((rules) => {
          if (!rules || !rules.length) {
            debug('[' + automaticId + '][' + eventId + '][findRules] No rules found');
            return;
          }

          // Find the first rule that applies
          const rule = _.find(rules, (r) => {
            return doesRuleApply(r, event, automaticEvent);
          });

          if (!rule) {
            debug('[' + automaticId + '][' + eventId + '][findRules] No matching rule');
            return;
          }

          if (!rule.countryCode) {
            rule.countryCode = 1;
          }

          const phone = `+${rule.countryCode}${rule.phone}`;

          formatMessage(rule, (err, message) => {
            if (err) {
              console.error(err);
            };

            debug('[' + automaticId + '][' + eventId + '][sendSMS] Sending ' + phone + ': ' + message);
            sms.sendSMS(automaticId, phone, message);
          });
        });
    });
}


function lookupRule(event) {
  if (!event.user) {
    return debug('Invalid Event');
  }

  const automaticId = event.user.id;
  const eventId = event.id;
  const type = event.type;

  if (moment().subtract(15, 'minutes').isAfter(moment(event.created_at))) {
    debug('[' + automaticId + '][' + eventId + '][carState] ' + type + ' ignored as it was over 15 minutes old');
  } else if (type === 'ignition:on') {
    debug('[' + automaticId + '][' + eventId + '][carState] ' + type + ' triggered from ignition:on');
    findRules(event, 'ignitionOn');
  } else if (type === 'ignition:off') {
    debug('[' + automaticId + '][' + eventId + '][carState] ' + type + ' triggered from ignition:off');
    findRules(event, 'ignitionOff');
  }
}


exports.connect = () => {
  const automaticSocketURL = nconf.get('AUTOMATIC_WEBSOCKET_URL') + '?token=' + nconf.get('AUTOMATIC_CLIENT_ID') + ':' + nconf.get('AUTOMATIC_CLIENT_SECRET');
  const automaticSocket = require('socket.io-client')(automaticSocketURL);

  automaticSocket.on('connect', () => {
    debug('Automatic Websocket Connected', nconf.get('AUTOMATIC_WEBSOCKET_URL'));
  });

  automaticSocket.on('location:updated', (data) => {
    browserWebsocket.sendAutomaticEvent(data);

    lookupRule(data);
  });

  automaticSocket.on('ignition:on', lookupRule);

  automaticSocket.on('ignition:off', (data) => {
    browserWebsocket.sendAutomaticEvent(data);

    if (data && data.user && data.user.id) {
      // Stop sharing location
      db.deleteShare(data.user.id)
        .catch(console.error);
    }

    lookupRule(data);
  });

  automaticSocket.on('trip:finished', (data) => {
    if (data && data.user && data.user.id) {
      // Stop sharing location
      db.deleteShare(data.user.id)
        .catch(console.error);
    }

    lookupRule(data);
  });

  automaticSocket.on('error', (data) => {
    console.error('Automatic Websocket Error:', data);
  });

  automaticSocket.on('reconnecting', (attemptNumber) => {
    debug('Automatic Websocket Reconnecting! - attempt ' + attemptNumber);
  });

  automaticSocket.on('reconnect_error', (err) => {
    debug('Automatic Websocket Reconnection error!\n', err);
  });

  automaticSocket.on('reconnect', (attemptNumber) => {
    debug('Automatic Websocket Reconnected on attempt ' + attemptNumber);
  });

  automaticSocket.on('disconnect', () => {
    debug('Automatic Websocket Disconnected');
  });
};
