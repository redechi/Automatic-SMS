var _ = require('underscore');
var debug = require('debug')('automaticsms');
var moment = require('moment');
var nconf = require('nconf');
var db = require('./database');
var helpers = require('./helpers');
var sms = require('./sms');


module.exports = function (app) {
  var automaticSocketURL = nconf.get('AUTOMATIC_WEBSOCKET_URL') + '?token=' + nconf.get('AUTOMATIC_CLIENT_ID') + ':' + nconf.get('AUTOMATIC_CLIENT_SECRET');
  var automaticSocket = require('socket.io-client')(automaticSocketURL);

  automaticSocket.on('connect', function () {
    debug('Automatic Websocket Connected', nconf.get('AUTOMATIC_WEBSOCKET_URL'));
  });

  automaticSocket.on('location:updated', function(data) {
    var browserSocket = app.get('wss');
    if (browserSocket) {
      browserSocket.sendEvent(data);
    }

    lookupRule(data);
  });

  automaticSocket.on('ignition:on', lookupRule);

  automaticSocket.on('ignition:off', function(data) {
    if(data && data.user && data.user.id) {
      // stop sharing location
      db.deleteShare(data.user.id, function(e) {
        if(e) {
          console.error(e);
        }
      });
    }

    lookupRule(data);
  });

  automaticSocket.on('trip:finished', function(data) {
    if(data && data.user && data.user.id) {
      // stop sharing location
      db.deleteShare(data.user.id, function(e) {
        if(e) {
          console.error(e);
        }
      });
    }

    lookupRule(data);
  });

  automaticSocket.on('error', function (data) {
    console.error('Automatic Websocket Error:', data);
  });

  automaticSocket.on('reconnecting', function (attemptNumber) {
    debug('Automatic Websocket Reconnecting! - attempt ' + attemptNumber);
  });

  automaticSocket.on('reconnect_error', function (error) {
    debug('Automatic Websocket Reconnection error!\n', error);
  });

  automaticSocket.on('reconnect', function (attemptNumber) {
    debug('Automatic Websocket Reconnected on attempt ' + attemptNumber);
  });

  automaticSocket.on('disconnect', function () {
    debug('Automatic Websocket Disconnected');
  });
};


function getAutomaticEvent(type) {
  if(type === 'ignition:on' || type === 'location:updated') {
    return 'ignitionOn';
  } else if(type === 'ignition:off' || type === 'trip:finished') {
    return 'ignitionOff';
  }
}


function formatMessage(rule, cb) {
  var message = rule.message;
  if(rule.includeMap) {
    db.createShare({automatic_id: rule.automatic_id}, function(e, share) {
      if(e) return cb(e);

      message += ' ' + nconf.get('URL') + '/l/' + share.share_id;
      cb(null, message);
    });
  } else {
    cb(null, message);
  }
}


function doesRuleApply(rule, event, automaticEvent) {
  try {
    var automatic_id = event.user.id;
    var event_id = event.id;
    var eventTime = moment.tz(event.created_at, (rule.timezone || event.time_zone));
    var eventDayOfWeek = eventTime.format('dddd');
    var eventTimeMinutes = helpers.getMinutes(eventTime);
    var ruleStartMinutes = (rule.allDay === true) ? 0 : helpers.getMinutes(moment(rule.startTime, 'h:mma'));
    var ruleEndMinutes = (rule.allDay === true) ? 1440 : helpers.getMinutes(moment(rule.endTime, 'h:mma'));
    var radius = 0.25;

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
    var distance = helpers.calculateDistanceMi(event.location.lat, event.location.lon, rule.latitude, rule.longitude);
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


function findRules(event, automaticEvent) {
  var automatic_id = event.user.id;
  var event_id = event.id;
  var lat = (event && event.location) ? event.location.lat : null;
  var lon = (event && event.location) ? event.location.lon : null;

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
        return doesRuleApply(rule, event, automaticEvent);
      });

      if(!rule) {
        debug('[' + automatic_id + '][' + event_id + '][findRules] No matching rule');
        return;
      }

      if(!rule.countryCode) {
        rule.countryCode = 1;
      }

      var phone = '+' + rule.countryCode + rule.phone;

      formatMessage(rule, function(e, message) {
        if(e) return next(e);

        debug('[' + automatic_id + '][' + event_id + '][sendSMS] Sending ' + phone + ': ' + message);
        sms.sendSMS(automatic_id, phone, message);
      });
    });
  });
}


function lookupRule(event) {
  var ignoreAfter = 15 * 60 * 1000; // 15 minutes
  var resetAfter = 60 * 60 * 1000; //1 hour

  if(!event.user) {
    return debug('Invalid Event');
  }

  var automatic_id = event.user.id;
  var event_id = event.id;
  var type = event.type;

  if((Date.now() - event.created_at) > ignoreAfter) {
    return debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored as it was over 15 minutes old');
  }

  db.getCarState(automatic_id, function(e, state) {
    if(e) return next(e);

    if(!state) {
      debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered due to lack of initial state');
      db.setCarState(event, function(e) {
        if(e) return next(e);
        var automaticEvent = getAutomaticEvent(type);
        if(automaticEvent) {
          findRules(event, automaticEvent);
        }
      });
    } else if(type === 'ignition:on') {
      db.setCarState(event, function(e) {
        if(e) return next(e);
        if(state.event === 'location:updated') {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous location:updated event');
        } else {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from ignition:on with no previous location:updated');
          findRules(event, 'ignitionOn');
        }
      });
    } else if(type === 'location:updated') {
      db.setCarState(event, function(e) {
        if(e) return next(e);
        if(state.event === 'ignition:on') {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous ignition:on event');
        } else if(state.event === 'location:updated' && (Date.now() - state.ts) < resetAfter) {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous location:updated event less than 1 hour ago');
        } else {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from location:updated with no previous ignition:on');
          findRules(event, 'ignitionOn');
        }
      });
    } else if(type === 'ignition:off') {
      db.setCarState(event, function(e) {
        if(e) return next(e);
        if(state.event === 'trip:finished') {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous trip:finished event');
        } else {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from ignition:off with no previous trip:finished');
          findRules(event, 'ignitionOff');
        }
      });
    } else if(type === 'trip:finished') {
      db.setCarState(event, function(e) {
        if(e) return next(e);
        if(state.event === 'ignition:off') {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' ignored due to previous ignition:off event');
        } else {
          debug('[' + automatic_id + '][' + event_id + '][carState] ' + type + ' triggered from trip:finished with no previous ignition:off');
          findRules(event, 'ignitionOff');
        }
      });
    }
  });
}
