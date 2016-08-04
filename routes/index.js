const nconf = require('nconf');
const db = require('../libs/database');

exports.index = (req, res, next) => {
  if (req.session && req.session.access_token) {
    res.render('rules', {smsMonthlyLimit: nconf.get('SMS_MONTHLY_LIMIT')});
  } else {
    res.render('index');
  }
};


exports.share = (req, res, next) => {
  if (!req.params.share_id) {
    return next();
  }

  return db.getShare(req.params.share_id)
    .then((doc) => {
      if (!doc) {
        return next();
      }

      req.session.share_id = doc.share_id;
      req.session.shared_automatic_id = doc.automatic_id;
      req.session.share_expires = doc.expires;

      return res.render('share', {
        mapboxAccessToken: nconf.get('MAPBOX_ACCESS_TOKEN'),
        shareId: doc.share_id,
        loggedIn: false
      });
    })
    .catch(next);
};


exports.authenticate = (req, res, next) => {
  if (!req.session.automatic_id) {
    if (req.xhr) {
      const err = new Error('Not logged in');
      err.status = 401;
      return next(err);
    }
    return res.redirect('/');
  }

  return next();
};


exports.force_https = (req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.path}`);
  }
  return next();
};


exports.check_dev_token = (req, res, next) => {
  // Allows local dev environent to specify access token
  if (process.env.TOKEN) {
    req.session.access_token = process.env.TOKEN;
  }
  if (process.env.USER_ID) {
    req.session.automatic_id = process.env.USER_ID;
  }
  next();
};
