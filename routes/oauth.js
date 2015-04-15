var request = require('request'),
    nconf = require('nconf'),
    db = require('../libs/database');


var oauth2 = require('simple-oauth2')({
  clientID: nconf.get('AUTOMATIC_CLIENT_ID'),
  clientSecret: nconf.get('AUTOMATIC_CLIENT_SECRET'),
  site: 'https://accounts.automatic.com',
  tokenPath: '/oauth/access_token'
});


var authorization_uri = oauth2.authCode.authorizeURL({
  scope: 'scope:user:profile scope:trip scope:location scope:vehicle:profile scope:vehicle:events'
});


exports.authorize = function(req, res, next) {
  res.redirect(authorization_uri);
};


exports.logout = function(req, res, next) {
  req.session.destroy();
  res.redirect('/');
};


exports.disconnect = function(req, res, next) {
  db.destroyUser(req.session.automatic_id, function() {
    req.session.destroy();
    res.redirect('/');
  });
};


exports.redirect = function(req, res, next) {
  if(req.query.denied === 'true') {
    return res.redirect('/?alert=User denied access to Automatic');
  }

  oauth2.authCode.getToken({
    code: req.query.code
  }, function(e, result) {
    if(e) return next(e);

    var token = oauth2.accessToken.create(result);

    var user = {
      automatic_access_token: token.token.access_token,
      automatic_refresh_token: token.token.refresh_token,
      automatic_expires_at: token.token.expires_at,
      automatic_id: token.token.user.id
    };

    req.session.access_token = user.automatic_access_token;
    req.session.automatic_id = user.automatic_id;

    db.saveUser(user, function(e, user) {
      if(e) return next(e);
      res.redirect('/');
    });
  });
};
