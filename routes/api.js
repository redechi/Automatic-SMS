const request = require('request');
const db = require('../libs/database');
const apiURL = 'https://api.automatic.com';


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


exports.user = (req, res, next) => {
  request.get({
    uri: `${apiURL}/user/me`,
    headers: {Authorization: `bearer ${req.session.access_token}`},
    json: true
  }, (err, r, body) => {
    if (err) return next(err);
    return res.json(body);
  });
};


exports.rules = (req, res, next) => {
  db.getRules(req.session.automatic_id)
    .then((docs) => res.json(docs || []))
    .catch(next);
};


exports.createRule = (req, res, next) => {
  const rule = formatRule(req);

  db.createRule(rule)
    .then((doc) => res.json(doc))
    .catch(next);
};


exports.updateRule = (req, res, next) => {
  const rule = formatRule(req);

  db.updateRule(req.body._id, req.session.automatic_id, rule)
    .then((doc) => res.json(doc))
    .catch(next);
};

exports.destroyRule = (req, res, next) => {
  db.destroyRule(req.body._id, req.session.automatic_id)
    .then(() => res.json({}))
    .catch(next);
};


exports.counts = (req, res, next) => {
  db.getRecentCount(req.session.automatic_id)
    .then((docs) => res.json(docs || {}))
    .catch(next);
};
