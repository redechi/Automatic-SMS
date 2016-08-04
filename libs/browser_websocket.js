const _ = require('underscore');
const async = require('async');
const db = require('./database');
const debug = require('debug')('automaticsms');
const nconf = require('nconf');
const socketio = require('socket.io');

let io;


function cleanupSockets() {
  async.each(io.sockets.sockets, (socket, cb) => {
    db.getValidShare(socket.shareId)
      .then((share) => {
        if (!share) {
          debug(`Disconnecting Browser Socket ${socket.shareId}`);
          socket.disconnect();
        }
        cb();
      })
      .catch((err) => {
        debug(`Disconnecting Browser Socket ${socket.shareId}`);
        socket.disconnect();
        cb();
      });
  });
}


exports.setupWebsocket = (server) => {
  io = socketio(server);

  io.on('connection', (socket) => {
    socket.on('initialize', (data) => {
      if (data && data.shareId) {
        debug(`Initialzing Socket for shareId ${data.shareId}`);
        socket.shareId = data.shareId;
        db.getValidShare(data.shareId)
          .then((share) => {
            if (share && share.automatic_id) {
              debug(`Joining room ${share.automatic_id}`);
              socket.join(share.automatic_id);
            }
          })
          .catch(console.error)
      }
    });
  });

  // periodically disconnect clients when their share is removed from db.
  setInterval(cleanupSockets, 10000);
};

exports.sendAutomaticEvent = (data) => {
  if (!data || !data.user || !data.user.id) {
    console.error('Invalid Event');
    console.error(data);
  }
  debug(`Sending event to ${data.user.id}`);
  io.to(data.user.id).emit('event', data);
};
