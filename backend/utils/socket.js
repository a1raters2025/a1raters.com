import jwt from "jsonwebtoken";
import { User } from "../models/userSchema.js";

let io;

export const initializeSocket = (socketServer) => {
  io = socketServer;
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) {
        return next(new Error("Authentication required"));
      }

      const verified = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(verified.id).select("_id role categories isApproved");
      if (!user || (user.role !== "admin" && !user.isApproved)) {
        return next(new Error("Authentication required"));
      }

      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Authentication required"));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);
    if (user.role === "user" && Array.isArray(user.categories)) {
      user.categories.forEach((category) => socket.join(`category:${category}`));
    }
    socket.emit('socket:ready', { connectedAt: new Date().toISOString() });
  });
};

export const emitAdminUpdate = ({
  title,
  message,
  type = 'info',
  targetUserId,
  targetRoles = [],
  categories = [],
}) => {
  if (!io) return;

  const rooms = new Set();
  if (targetUserId) rooms.add(`user:${targetUserId}`);
  targetRoles.forEach((role) => rooms.add(`role:${role}`));
  categories.forEach((category) => rooms.add(`category:${category}`));
  if (rooms.size === 0) rooms.add("role:admin");

  let target = null;
  for (const room of rooms) {
    target = target ? target.to(room) : io.to(room);
  }
  target.emit('admin:update', {
    id: `notification_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
  });
};

export const emitPaymentDetailsChanged = (userId) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit('payment-details:changed');
};
