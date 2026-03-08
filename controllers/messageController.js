const Message = require('../models/Message');
const Group = require('../models/Group');

const getMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not a member' });
    const messages = await Message.find({ groupId })
      .populate('senderId', 'name email isAdmin')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    messages.reverse();
    res.json({ messages });
  } catch (err) { next(err); }
};

// Only admin can delete
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Only admin can delete messages' });
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();
    const io = req.app.get('io');
    io.to(`group_${message.groupId}`).emit('messageDeleted', { messageId: message._id });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

module.exports = { getMessages, deleteMessage };
