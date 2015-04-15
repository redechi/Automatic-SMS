var debug = require('debug')('automaticsms'),
    request = require('request'),
    _ = require('underscore'),
    nconf = require('nconf'),
    moment = require('moment-timezone'),
    querystring = require('querystring'),
    sign = require('./sign');


exports.calculateDistanceMi = function(lat1, lon1, lat2, lon2) {
  function toRadians(degree) {
    return (degree * (Math.PI / 180));
  }
  var radius = 3959.0; //Earth Radius in mi
  var radianLat1 = toRadians(lat1);
  var radianLon1 = toRadians(lon1);
  var radianLat2 = toRadians(lat2);
  var radianLon2 = toRadians(lon2);
  var radianDistanceLat = radianLat1 - radianLat2;
  var radianDistanceLon = radianLon1 - radianLon2;
  var sinLat = Math.sin(radianDistanceLat / 2.0);
  var sinLon = Math.sin(radianDistanceLon / 2.0);
  var a = Math.pow(sinLat, 2.0) + Math.cos(radianLat1) * Math.cos(radianLat2) * Math.pow(sinLon, 2.0);
  var d = radius * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return d;
};


exports.getTripDuration = function(rule, lat, lon, cb) {
  var automatic_id = rule.automatic_id;
  var query = {
    origin: lat + ',' + lon,
    destination: rule.homeAddress,
    departure_time: 'now'
  };
  var path;

  if(nconf.get('GOOGLE_MAPS_CLIENT_ID')) {
    query.client = nconf.get('GOOGLE_MAPS_CLIENT_ID');
    path = '/maps/api/directions/json?' + querystring.stringify(query);
    path += '&signature=' + sign(nconf.get('GOOGLE_MAPS_API_KEY'), path);
  } else {
    path = '/maps/api/directions/json?' + querystring.stringify(query);
  }

  request({
    uri: 'https://maps.googleapis.com' + path,
    method: 'GET',
    followAllRedirects: true,
    json: true,
    timeout: 5000
  }, function(e, response, body) {
    if(response && response.statusCode) {
      debug('[' + automatic_id + '][getTripDuration] ' + response.statusCode);
    }

    if(!body || !body.routes || !body.routes.length) {
      cb(new Error('Cannot get directions to ' + rule.homeAddress));
    } else {
      var duration_s = _.reduce(body.routes[0].legs, function(memo, leg) {
        return memo += (leg.duration_in_traffic) ? leg.duration_in_traffic.value : leg.duration.value;
      }, 0);

      cb(null, Math.round(duration_s/60));
    }
  });
};


exports.getMinutes = function(time) {
  return time.minutes() + time.hours() * 60;
};


exports.formatDurationHoursMinutes = function(minutes) {
  var duration = moment.duration(minutes, 'minutes');
  return Math.floor(duration.asHours()) + ':' + moment(duration.minutes(), 'm').format('mm');
};


exports.cleanPhone = function(phone) {
  return (phone || '').replace(/[+()\. ,:-]+/g, '');
};
