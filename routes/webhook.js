var debug = require('debug')('automaticsms'),
    request = require('request'),
    _ = require('underscore'),
    moment = require('moment-timezone'),
    nconf = require('nconf'),
    twilio = require('twilio'),
    sms = require('../libs/sms'),
    db = require('../libs/database'),
    helpers = require('../libs/helpers');


function formatMessage(rule, lat, lon, cb) {
  var message = rule.message;
  if(rule.includeETA) {
    // first get directions from google maps to get driving time
    helpers.getTripDuration(rule, lat, lon, function(e, travelTimeMin) {
      if(e) {
        return cb(null, message);
      }

      if(travelTimeMin >= 60) {
        var travelTimeHours = helpers.formatDurationHoursMinutes(travelTimeMin);
        message += ' ETA: ' + travelTimeHours + ' hours';
      } else {
        message += ' ETA: ' + travelTimeMin + ' min';
      }

      cb(null, message);
    });
  } else {
    cb(null, message);
  }
}


function doesRuleApply(rule, webhook, automaticEvent) {
  try {
    var automatic_id = webhook.user.id,
        event_id = webhook.id,
        eventTime = moment.tz(webhook.created_at, (rule.timezone || webhook.time_zone)),
        eventDayOfWeek = eventTime.format('dddd'),
        eventTimeMinutes = helpers.getMinutes(eventTime),
        ruleStartMinutes = (rule.allDay === true) ? 0 : helpers.getMinutes(moment(rule.startTime, 'h:mma')),
        ruleEndMinutes = (rule.allDay === true) ? 1440 : helpers.getMinutes(moment(rule.endTime, 'h:mma')),
        radius = 0.25;

    // check that automatic Event type is correct
    if(automaticEvent !== rule.automaticEvent) {
      debug('[' + automatic_id + '][' + event_id + '][ruleCheck] Rejected: Rule is ' + rule.automaticEvent + ', not ' + automaticEvent);
      return false;
    }

    // check if it is the correct day of the week
    if(rule['day' + eventDayOfWeek] === false) {
      debug('[' + automatic_id + '][' + event_id + '][ruleCheck] Rejected: Rule is not on correct day of week');
      return false;
    }

    // check if within time range
    if(eventTimeMinutes < ruleStartMinutes || eventTimeMinutes > ruleEndMinutes) {
      debug('[' + automatic_id + '][' + event_id + '][ruleCheck] Rejected: Rule falls outside of time range (' + ruleStartMinutes + ' - ' + ruleEndMinutes + '), time is ' + eventTimeMinutes);
      return false;
    }

    // check that location is within radius
    var distance = helpers.calculateDistanceMi(webhook.location.lat, webhook.location.lon, rule.latitude, rule.longitude);
    if(rule.anywhere !== true && distance > radius) {
      debug('[' + automatic_id + '][' + event_id + '][ruleCheck] Rejected: Rule radius ' + radius + ' does not include this location ' + distance);
      return false;
    }

    return true;
  } catch(e) {
    debug(e);
    return false;
  }
}


function findRules(req, automaticEvent) {
  var automatic_id = req.body.user.id,
      event_id = req.body.id,
      lat = (req.body && req.body.location) ? req.body.location.lat : null,
      lon = (req.body && req.body.location) ? req.body.location.lon : null;

  db.getRecentCount(automatic_id, function(e, count) {
    if(count && moment().startOf('month').isSame(moment(count.month)) && count.count > nconf.get('SMS_MONTHLY_LIMIT')) {
      debug('[' + automatic_id + '][' + event_id + '][findRules] Monthly limit reached');
      return false;
    }

    db.getActiveRules(automatic_id, function(e, rules) {
      if(!rules || !rules.length) {
        debug('[' + automatic_id + '][' + event_id + '][findRules] No rules found');
        return;
      }

      //find the first rule that applies
      var rule = _.find(rules, function(rule) {
        return doesRuleApply(rule, req.body, automaticEvent);
      });

      if(!rule) {
        debug('[' + automatic_id + '][' + event_id + '][findRules] No matching rule');
        return;
      }

      if(!rule.countryCode) {
        rule.countryCode = 1;
      }

      var phone = '+' + rule.countryCode + rule.phone;

      formatMessage(rule, lat, lon, function(e, message) {
        if(e) return next(e);

        debug('[' + automatic_id + '][' + event_id + '][sendSMS] Sending ' + phone + ': ' + message);
        sms.sendSMS(automatic_id, phone, message);
      });
    });
  });
}


function getAutomaticEvent(type) {
  if(type === 'ignition:on' || type === 'location:changed') {
    return 'ignitionOn';
  } else if(type === 'ignition:off' || type === 'trip:finished') {
    return 'ignitionOff';
  }
}


exports.incoming = function(req, res, next) {
  var ignoreAfter = 15 * 60 * 1000, // 15 minutes
      resetAfter = 60 * 60 * 1000; //1 hour

  if(!req.body || !req.body.user) {
    return res.send('Invalid Webhook');
  }

  if((Date.now() - req.body.created_at) > ignoreAfter) {
    var automatic_id = req.body.user.id,
        event_id = req.body.id,
        type = req.body.type;

    debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored as it was over 15 minutes old');
    res.sendStatus(200);
  } else {
    var automatic_id = req.body.user.id,
        event_id = req.body.id,
        type = req.body.type;

    db.getCarState(automatic_id, function(e, state) {
      if(e) return next(e);

      if(!state) {
        debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered due to lack of initial state');
        db.setCarState(req.body, function(e) {
          if(e) return next(e);
          var automaticEvent = getAutomaticEvent(type);
          if(automaticEvent) {
            findRules(req, automaticEvent);
          }
        });
      } else if(type === 'ignition:on') {
        db.setCarState(req.body, function(e) {
          if(e) return next(e);
          if(state.event === 'location:changed') {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous location:changed event');
          } else {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from ignition:on with no previous location:changed');
            findRules(req, 'ignitionOn');
          }
        });
      } else if(type === 'location:changed') {
        db.setCarState(req.body, function(e) {
          if(e) return next(e);
          if(state.event === 'ignition:on') {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous ignition:on event');
          } else if(state.event === 'location:changed' && (Date.now() - state.ts) < resetAfter) {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous location:changed event less than 1 hour ago');
          } else {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from location:changed with no previous ignition:on');
            findRules(req, 'ignitionOn');
          }
        });
      } else if(type === 'ignition:off') {
        db.setCarState(req.body, function(e) {
          if(e) return next(e);
          if(state.event === 'trip:finished') {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous trip:finished event');
          } else {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from ignition:off with no previous trip:finished');
            findRules(req, 'ignitionOff');
          }
        });
      } else if(type === 'trip:finished') {
        db.setCarState(req.body, function(e) {
          if(e) return next(e);
          if(state.event === 'ignition:off') {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous ignition:off event');
          } else {
            debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from trip:finished with no previous ignition:off');
            findRules(req, 'ignitionOff');
          }
        });
      }
    });
    res.sendStatus(200);
  }
};
