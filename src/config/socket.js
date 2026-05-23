const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');
const logger = require('../utils/logger');

let io = null;

const setupSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup Redis adapter for horizontal scaling
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter configured for horizontal scaling');
  } catch (error) {
    logger.warn('Redis adapter not configured, running in single-instance mode');
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.join(`user:${decoded.userId}`);

      if (decoded.role === 'admin') {
        socket.join('admins');
      }

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}, User: ${socket.userId}`);

    // Join ticket rooms for real-time updates
    socket.on('join-ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      logger.info(`Socket ${socket.id} joined ticket room: ${ticketId}`);
    });

    socket.on('leave-ticket', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      logger.info(`Socket ${socket.id} left ticket room: ${ticketId}`);
    });

    socket.on('typing', (data) => {
      socket.to(`ticket:${data.ticketId}`).emit('user-typing', {
        userId: socket.userId,
        ticketId: data.ticketId
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

const emitTicketUpdate = (ticketId, event, data) => {
  if (io) {
    io.to(`ticket:${ticketId}`).emit(event, data);
    io.to('admins').emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

module.exports = { setupSocketIO, getIO, emitTicketUpdate, emitToUser };
