const monk = require('monk');
const moment = require('moment');
const defaults = require('./defaults');
const helpers = require('./helpers');
const db = monk(process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/automaticsms');

const counts = db.get('counts');
const rules = db.get('rules');
const shares = db.get('shares');
const users = db.get('users');

exports.saveUser = (user) => {
  return users.findOneAndUpdate(
    {automatic_id: user.automatic_id},
    {$set: user},
    {upsert: true, returnNewDocument: true}
  )
    .then((result) => {
      if (!result.created_at) {
        // User is new, add created_at and insert some default rules
        return users.update({_id: result._id}, {$set: {created_at: moment().valueOf()}})
          .then(() => {
            const defaultRules = defaults.defaultRules(result.automatic_id);
            return rules.insert(defaultRules);
          });
      }

      return result;
    }
  );
};


exports.destroyUser = (automaticId) => {
  return users.remove({automatic_id: automaticId})
    .then(() => {
      return rules.remove({automatic_id: automaticId});
    })
    .then(() => {
      return counts.remove({automatic_id: automaticId});
    });
};


exports.getRules = (automaticId) => {
  return rules.find({automatic_id: automaticId}, {sort: {_id: 1}});
};


exports.getActiveRules = (automaticId) => {
  return rules.find({automatic_id: automaticId, enabled: true}, {sort: {_id: 1}});
};


exports.createRule = (rule) => {
  return rules.insert(rule);
};


exports.updateRule = (ruleId, automaticId, rule) => {
  return rules.findOneAndUpdate(
    {_id: ruleId, automatic_id: automaticId},
    {$set: rule}
  );
};


exports.destroyRule = (ruleId, automaticId) => {
  return rules.remove({_id: ruleId, automatic_id: automaticId});
};


exports.getRecentCount = (automaticId) => {
  return counts.findOne({automatic_id: automaticId}, {sort: {month: -1}});
};


exports.incrementCounts = (automaticId) => {
  const month = moment().startOf('month');
  return counts.findOneAndUpdate(
    {automatic_id: automaticId, month: month.toDate()},
    {$inc: {count: 1}},
    {upsert: true}
  );
};


exports.getShare = (shareId) => {
  return shares.findOne({
    share_id: shareId,
    expires: {$gte: new Date()}
  });
};


exports.createShare = (share) => {
  // Force expiration after 12 hours
  share.expires = moment().add(12, 'hours').toDate();
  share.share_id = helpers.randomAlphanumeric(8);

  return shares.insert(share);
};


exports.deleteShare = (automaticId) => {
  return shares.remove({automatic_id: automaticId});
};
