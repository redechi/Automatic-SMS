var _ = require('underscore');
var async = require('async');
var db = require('./database');
var cookieParser = require('cookie-parser');
var nconf = require('nconf');
var parseCookie = cookieParser(nconf.get('SESSION_SECRET'));


exports.setupClientWebsocket = function(app) {
  var wss = app.get('wss');

  wss.on('connection', function(client) {
    client.send(JSON.stringify({
      msg: 'Socket Opened'
    }));
    parseCookie(client.upgradeReq, null, function(err) {
      var sessionID = client.upgradeReq.signedCookies['connect.sid'];
      var store = app.get('store');
      store.get(sessionID, function(e, session) {
        if(session && session.automatic_id) {
          client.automatic_id = session.automatic_id;
        }
      });
    });

    client.on('message', function(data) {
      var message;
      try {
        message = JSON.parse(data);
      } catch(e) {}

      // if a shareId, attach that shareId to client
      if(message && message.shareId) {
        parseCookie(client.upgradeReq, null, function(err) {
          var sessionID = client.upgradeReq.signedCookies['connect.sid'];
          var store = app.get('store');
          store.get(sessionID, function(e, session) {
            client.shared_automatic_id = session.shared_automatic_id;
            client.share_expires = session.share_expires;
            client.share_id = session.share_id;
          });
        });
      }
    });
  });


  wss.sendEvent = function(data) {
    if (data && data.user && data.user.id) {
      var clients = _.filter(this.clients, function(c) {
        if(c.shared_automatic_id && c.shared_automatic_id === data.user.id && new Date(c.share_expires) > new Date()) {
          // user has valid share URL
          return true;
        } else {
          return false;
        }
      });
      clients.forEach(function (client) {
        client.send(JSON.stringify(data));
      });
    }
  };

  setInterval(function() {
    async.each(wss.clients, function(client, cb) {
      if(client.share_id) {
        db.getShare(client.share_id, function(e, doc) {
          if(!doc) {
            client.terminate();
          }
          cb();
        });
      }
    });
  }, 10000);
};
