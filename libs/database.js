var monk = require('monk');
var moment = require('moment');
var defaults = require('./defaults');
var db = monk(process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/automaticsms');
var users = db.get('users');
var rules = db.get('rules');
var counts = db.get('counts');
var carState = db.get('carState');


exports.getUser = function(automatic_id, cb) {
  users.findOne({automatic_id: automatic_id}, cb);
};


exports.saveUser = function(user, cb) {
  users.findAndModify(
    {automatic_id: user.automatic_id},
    {$set: user},
    {upsert: true},
    function(e, user) {
      if(e) return cb(e);
      if(!user.created_at) {
        //user is new, add created_at and insert some default rules
        users.update({_id: user._id}, {$set: {created_at: moment().valueOf()}}, function(e) {
          var defaultRules = defaults.defaultRules(user.automatic_id);
          rules.insert(defaultRules, function(e) {
            cb(e, user);
          });
        });
      } else {
        cb(e, user);
      }
    }
  );
};


exports.destroyUser = function(automatic_id, cb) {
  users.remove({automatic_id: automatic_id}, function(e) {
    if(e) return cb(e);
    rules.remove({automatic_id: automatic_id}, function(e) {
      if(e) return cb(e);
      counts.remove({automatic_id: automatic_id}, cb);
    });
  });
};


exports.getRules = function(automatic_id, cb) {
  rules.find({automatic_id: automatic_id}, {sort: {_id: 1}}, cb);
};


exports.getRule = function(rule_id, cb) {
  rules.findById(rule_id, cb);
};


exports.getActiveRules = function(automatic_id, cb) {
  rules.find({automatic_id: automatic_id, enabled: true}, {sort: {_id: 1}}, cb);
};


exports.createRule = function(rule, cb) {
  rules.insert(rule, cb);
};


exports.updateRule = function(rule_id, automatic_id, rule, cb) {
  rules.findAndModify(
    {_id: rule_id, automatic_id: automatic_id},
    {$set: rule},
    cb
  );
};


exports.destroyRule = function(rule_id, automatic_id, cb) {
  rules.remove({_id: rule_id, automatic_id: automatic_id}, cb);
};


exports.logRuleTrigger = function(rule_id) {
  rules.update({_id: rule_id}, {$inc: {count: 1}});
};


exports.getRecentCount = function(automatic_id, cb) {
  counts.findOne({automatic_id: automatic_id}, {sort: {month: -1}}, cb);
};


exports.incrementCounts = function(automatic_id) {
  var month = moment().startOf('month');
  counts.findAndModify(
    {automatic_id: automatic_id, month: month.toDate()},
    {$inc: {count: 1}},
    {upsert: true}
  );
};


exports.getCarState = function(automatic_id, cb) {
  carState.findOne({automatic_id: automatic_id}, cb);
};


exports.setCarState = function(webhook, cb) {
  var automatic_id = webhook.user.id,
      event = webhook.type,
      ts = webhook.created_at;

  carState.findAndModify(
    {automatic_id: automatic_id},
    {
      $set: {
        event: event,
        automatic_id: automatic_id,
        ts: ts
      }
    },
    {upsert: true},
    cb
  );
};
