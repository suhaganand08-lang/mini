const { Server } = require('socket.io');
const { corsOrigins } = require('../config/env');

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins.length ? corsOrigins : true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('passenger:subscribe', ({ routeId } = {}, acknowledge) => {
      if (!routeId || typeof routeId !== 'string') {
        return acknowledge?.({ success: false, message: 'A valid routeId is required.' });
      }
      socket.join(`route:${routeId}`);
      return acknowledge?.({ success: true, routeId });
    });

    socket.on('passenger:unsubscribe', ({ routeId } = {}) => {
      if (!routeId || typeof routeId !== 'string') return;
      socket.leave(`route:${routeId}`);
    });
  });

  return io;
}

module.exports = { createSocketServer };
