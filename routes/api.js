var request = require('request'),
    db = require('../libs/database'),
    helpers = require('../libs/helpers'),
    _ = require('underscore'),
    apiURL = 'https://api.automatic.com';


function formatRule(req) {
  return {
    automatic_id: req.session.automatic_id,
    enabled: req.body.enabled === 'true',
    title: req.body.title,
    daySunday: req.body.daySunday === 'true',
    dayMonday: req.body.dayMonday === 'true',
    dayTuesday: req.body.dayTuesday === 'true',
    dayWednesday: req.body.dayWednesday === 'true',
    dayThursday: req.body.dayThursday === 'true',
    dayFriday: req.body.dayFriday === 'true',
    daySaturday: req.body.daySaturday === 'true',
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    allDay: req.body.allDay === 'true',
    automaticEvent: req.body.automaticEvent,
    countryCode: req.body.countryCode,
    phone: req.body.phone,
    message: req.body.message,
    includeMap: req.body.includeMap === 'true',
    address: req.body.address,
    radius: req.body.radius,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    anywhere: req.body.anywhere === 'true',
    timezone: req.body.timezone
  };
}


exports.user = function(req, res, next) {
  request.get({
    uri: apiURL + '/user/me',
    headers: {Authorization: 'bearer ' + req.session.access_token},
    json: true
  }, function(e, r, body) {
    if(e) return next(e);
    res.json(body);
  });
};


exports.rules = function(req, res, next) {
  db.getRules(req.session.automatic_id, function(e, docs) {
    res.json(docs || []);
  });
};


exports.createRule = function(req, res, next) {
  var rule = formatRule(req);

  db.createRule(rule, function(e, doc) {
    if(e) return next(e);
    res.json(doc);
  });
};


exports.updateRule = function(req, res, next) {
  var rule = formatRule(req);

  db.updateRule(req.body._id, req.session.automatic_id, rule, function(e, doc) {
    if(e) return next(e);
    res.json(doc);
  });
};



exports.destroyRule = function(req, res, next) {
  db.destroyRule(req.body._id, req.session.automatic_id, function(e) {
    if(e) return next(e);
    res.json({});
  });
};


exports.counts = function(req, res, next) {
  db.getRecentCount(req.session.automatic_id, function(e, docs) {
    if(e) return next(e);
    res.json(docs || {});
  });
};
