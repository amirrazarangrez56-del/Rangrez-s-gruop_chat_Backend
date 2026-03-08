const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');

const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch { next(new Error('Auth error')); }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🔌 Connected: ${user.name}`);
    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    socket.join(`user_${user._id}`);
    if (user.isAdmin) socket.join('admin_room');

    const group = await Group.findOne();
    if (group?.members.some(m => m.toString() === user._id.toString())) {
      io.to(`group_${group._id}`).emit('userOnline', { userId: user._id });
    }

    socket.on('joinGroup', async ({ groupId }) => {
      const grp = await Group.findById(groupId);
      if (!grp?.members.some(m => m.toString() === user._id.toString())) return;
      socket.join(`group_${groupId}`);
      socket.emit('joinedGroup', { groupId });
    });

    socket.on('sendMessage', async ({ groupId, messageText }) => {
      try {
        if (!messageText?.trim()) return;
        const grp = await Group.findById(groupId);
        if (!grp?.members.some(m => m.toString() === user._id.toString())) return;

        // Check permission
        if (!user.isAdmin) {
          const freshUser = await User.findById(user._id);
          if (!freshUser.canSendMessages) {
            return socket.emit('sendBlocked', { message: 'Admin has not allowed you to send messages yet.' });
          }
        }

        const message = await Message.create({
          senderId: user._id, groupId,
          messageText: messageText.trim(), messageType: 'text',
          deliveredTo: [user._id], seenBy: [],
        });
        const populated = await Message.findById(message._id).populate('senderId', 'name email isAdmin').lean();
        io.to(`group_${groupId}`).emit('newMessage', populated);
      } catch (err) { console.error('sendMessage error:', err); }
    });

    socket.on('messageDelivered', async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        if (!message.deliveredTo.some(id => id.toString() === user._id.toString())) {
          message.deliveredTo.push(user._id);
          await message.save();
          io.to(`user_${message.senderId}`).emit('deliveryUpdate', { messageId: message._id, deliveredTo: message.deliveredTo });
        }
      } catch {}
    });

    socket.on('markMessagesSeen', async ({ groupId }) => {
      try {
        const grp = await Group.findById(groupId);
        if (!grp?.members.some(m => m.toString() === user._id.toString())) return;
        const unseen = await Message.find({ groupId, seenBy: { $nin: [user._id] }, senderId: { $ne: user._id }, deleted: false });
        if (!unseen.length) return;
        const ids = unseen.map(m => m._id);
        await Message.updateMany({ _id: { $in: ids } }, { $addToSet: { seenBy: user._id } });
        const senderIds = [...new Set(unseen.map(m => m.senderId.toString()))];
        senderIds.forEach(sid => {
          const msgIds = unseen.filter(m => m.senderId.toString() === sid).map(m => m._id);
          io.to(`user_${sid}`).emit('seenUpdate', { messageIds: msgIds, seenBy: user._id });
        });
      } catch {}
    });

    socket.on('typing', ({ groupId }) =>
      socket.to(`group_${groupId}`).emit('userTyping', { userId: user._id, userName: user.name }));
    socket.on('stopTyping', ({ groupId }) =>
      socket.to(`group_${groupId}`).emit('userStoppedTyping', { userId: user._id }));

    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${user.name}`);
      await User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date() });
      const grp = await Group.findOne();
      if (grp) io.to(`group_${grp._id}`).emit('userOffline', { userId: user._id, lastSeen: new Date() });
    });
  });
};

module.exports = socketHandler;
