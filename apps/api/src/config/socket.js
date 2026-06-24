/**
 * Socket.IO Server Configuration
 * Real-time WebSocket layer for in-app notifications.
 * Users join tenant-scoped rooms; notifications are broadcast per-tenant and per-user.
 */
const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/user.model');
const logger = require('./logger');
const env = require('./env');

let io = null;

/**
 * Initialize Socket.IO on the existing HTTP server.
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware — verify JWT before allowing connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('firstName lastName email role tenantId department');
      if (!user || !user.isActive) return next(new Error('Invalid user'));

      socket.userId = user._id.toString();
      socket.tenantId = decoded.tenantId || user.tenantId;
      socket.userRole = user.role;
      socket.userName = `${user.firstName} ${user.lastName}`;
      next();
    } catch (err) {
      logger.warn('Socket auth failed', { error: err.message });
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, tenantId, userRole, userName } = socket;

    // Join tenant room and personal room
    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${userId}`);
    socket.join(`role:${tenantId}:${userRole}`);

    logger.debug('🔌 Socket connected', { userId, tenantId, role: userRole });

    // Handle notification read acknowledgement
    socket.on('notification:read', (notificationId) => {
      socket.to(`user:${userId}`).emit('notification:updated', { id: notificationId, isRead: true });
    });

    // Handle marking all as read
    socket.on('notification:readAll', () => {
      io.to(`user:${userId}`).emit('notification:allRead');
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.debug('🔌 Socket disconnected', { userId, reason });
    });
  });

  logger.info('🔌 Socket.IO initialized');
  return io;
};

/**
 * Emit notification to a specific user (by userId)
 */
const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit notification to all users with a specific role in a tenant
 */
const emitToRole = (tenantId, role, event, data) => {
  if (!io) return;
  io.to(`role:${tenantId}:${role}`).emit(event, data);
};

/**
 * Emit notification to all users in a tenant
 */
const emitToTenant = (tenantId, event, data) => {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, data);
};

/**
 * Get the Socket.IO instance
 */
const getIO = () => io;

module.exports = {
  initializeSocket,
  emitToUser,
  emitToRole,
  emitToTenant,
  getIO,
};
