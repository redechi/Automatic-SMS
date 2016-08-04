const _ = require('underscore');
const async = require('async');
const db = require('./database');
const cookieParser = require('cookie-parser');
const nconf = require('nconf');
const parseCookie = cookieParser(nconf.get('SESSION_SECRET'));


exports.setupClientWebsocket = (app) => {
  const wss = app.get('wss');

  wss.on('connection', (client) => {
    client.send(JSON.stringify({
      msg: 'Socket Opened'
    }));
    parseCookie(client.upgradeReq, null, (err) => {
      if (err) {
        console.log(err);
      }
      const sessionID = client.upgradeReq.signedCookies['connect.sid'];
      const store = app.get('store');
      store.get(sessionID, (err, session) => {
        if (session && session.automatic_id) {
          client.automatic_id = session.automatic_id;
        }
      });
    });

    client.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch (err) {}

      // If a shareId, attach that shareId to client
      if (message && message.shareId) {
        parseCookie(client.upgradeReq, null, (err) => {
          if (err) {
            console.log(err);
          }

          const sessionID = client.upgradeReq.signedCookies['connect.sid'];
          const store = app.get('store');
          store.get(sessionID, (err, session) => {
            client.shared_automatic_id = session.shared_automatic_id;
            client.share_expires = session.share_expires;
            client.share_id = session.share_id;
          });
        });
      }
    });
  });


  wss.sendEvent = (data) => {
    if (data && data.user && data.user.id) {
      const clients = _.filter(this.clients, (c) => {
        if (c.shared_automatic_id && c.shared_automatic_id === data.user.id && new Date(c.share_expires) > new Date()) {
          // User has valid share URL
          return true;
        } else {
          return false;
        }
      });
      clients.forEach( (client) => {
        client.send(JSON.stringify(data));
      });
    }
  };

  setInterval(() => {
    async.each(wss.clients, (client, cb) => {
      if (client.share_id) {
        db.getShare(client.share_id)
          .then((doc) => {
            if (!doc) {
              client.terminate();
            }
            cb();
          });
      }
    });
  }, 10000);
};
