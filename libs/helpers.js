const crypto = require('crypto');
const moment = require('moment-timezone');


exports.calculateDistanceMi = (lat1, lon1, lat2, lon2) => {
  function toRadians(degree) {
    return degree * (Math.PI / 180);
  }
  const radius = 3959.0; // Earth Radius in mi
  const radianLat1 = toRadians(lat1);
  const radianLon1 = toRadians(lon1);
  const radianLat2 = toRadians(lat2);
  const radianLon2 = toRadians(lon2);
  const radianDistanceLat = radianLat1 - radianLat2;
  const radianDistanceLon = radianLon1 - radianLon2;
  const sinLat = Math.sin(radianDistanceLat / 2.0);
  const sinLon = Math.sin(radianDistanceLon / 2.0);
  const a = Math.pow(sinLat, 2.0) + Math.cos(radianLat1) * Math.cos(radianLat2) * Math.pow(sinLon, 2.0);
  const d = radius * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return d;
};


exports.getMinutes = (time) => {
  return time.minutes() + time.hours() * 60;
};


exports.formatDurationHoursMinutes = (minutes) => {
  const duration = moment.duration(minutes, 'minutes');
  return `${Math.floor(duration.asHours())}:${moment(duration.minutes(), 'm').format('mm')}`;
};


exports.cleanPhone = (phone) => {
  return (phone || '').replace(/[+()\. ,:-]+/g, '');
};


exports.randomAlphanumeric = (length) => {
  const value = crypto.randomBytes(length).toString('base64')
    .replace(/\+/g, '_')
    .replace(/\//g, '-');

  return value.substr(0, length);
};
