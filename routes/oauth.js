const request = require('request');
const nconf = require('nconf');
const db = require('../libs/database');


const oauth2 = require('simple-oauth2')({
  clientID: nconf.get('AUTOMATIC_CLIENT_ID'),
  clientSecret: nconf.get('AUTOMATIC_CLIENT_SECRET'),
  site: 'https://accounts.automatic.com',
  tokenPath: '/oauth/access_token'
});


const authorizationUri = oauth2.authCode.authorizeURL({
  scope: 'scope:public scope:user:profile scope:location scope:current_location scope:vehicle:profile scope:vehicle:events scope:trip scope:behavior'
});


exports.authorize = (req, res, next) => {
  res.redirect(authorizationUri);
};


exports.logout = (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
};


exports.disconnect = (req, res, next) => {
  db.destroyUser(req.session.automatic_id)
    .then(() => {
      req.session.destroy();
      res.redirect('/');
    })
    .catch(next);
};


exports.redirect = (req, res, next) => {
  if (req.query.denied === 'true') {
    return res.render('index', {alert: 'User denied access to Automatic'});
  }

  oauth2.authCode.getToken({
    code: req.query.code
  }, (e, result) => {
    if (e) return next(e);

    // Attach `token` to the user's session for later use
    const token = oauth2.accessToken.create(result);

    req.session.access_token = token.token.access_token;

    // Get Automatic user id
    request.get({
      uri: 'https://api.automatic.com/user/me/',
      headers: {Authorization: 'bearer ' + req.session.access_token},
      json: true
    }, (e, r, body) => {
      if (e) return next(e);

      req.session.automatic_id = body.id;

      const user = {
        automatic_access_token: token.token.access_token,
        automatic_refresh_token: token.token.refresh_token,
        automatic_expires_at: token.token.expires_at,
        automatic_id: req.session.automatic_id
      };

      db.saveUser(user)
        .then(() => res.redirect('/'))
        .catch(next);
    });
  });
};
