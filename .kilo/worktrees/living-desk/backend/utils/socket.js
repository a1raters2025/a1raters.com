let io;

export const initializeSocket = (socketServer) => {
  io = socketServer;
  io.on('connection', (socket) => {
    socket.emit('socket:ready', { connectedAt: new Date().toISOString() });
  });
};

export const emitAdminUpdate = ({ title, message, type = 'info' }) => {
  if (!io) return;
  io.emit('admin:update', {
    id: `notification_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
  });
};
