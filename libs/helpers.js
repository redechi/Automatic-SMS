var crypto = require('crypto');
var debug = require('debug')('automaticsms');
var request = require('request');
var _ = require('underscore');
var nconf = require('nconf');
var moment = require('moment-timezone');
var querystring = require('querystring');
var sign = require('./sign');


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


exports.randomAlphanumeric = function(length) {
  var value = crypto.randomBytes(length).toString('base64')
    .replace(/\+/g, '_')
    .replace(/\//g, '-');

  return value.substr(0, length);
};
