const express = require('express');
const r = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');

r.post('/upload', protect, upload.single('file'), async (req, res, next) => {
  try {
    const { groupId, messageType, duration } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file' });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not a member' });

    // Check send permission (admin always allowed)
    if (!req.user.isAdmin) {
      const user = await User.findById(req.user._id);
      if (!user.canSendMessages) return res.status(403).json({ message: 'You are not allowed to send messages' });
    }

    const isVoice = messageType === 'voice';
    const isAudio = req.file.mimetype.startsWith('audio/');
    const type = isVoice ? 'voice' : isAudio ? 'audio' : 'image';

    const message = await Message.create({
      senderId: req.user._id,
      groupId,
      messageText: type === 'image' ? '📷 Photo' : type === 'voice' ? '🎤 Voice message' : '🎵 Audio',
      messageType: type,
      fileUrl: req.file.path,
      fileName: req.file.originalname,
      duration: duration ? parseInt(duration) : 0,
      deliveredTo: [req.user._id],
      seenBy: [],
    });

    const populated = await Message.findById(message._id).populate('senderId', 'name email isAdmin');
    const io = req.app.get('io');
    io.to(`group_${groupId}`).emit('newMessage', populated);
    res.json({ message: 'Sent', data: populated });
  } catch (err) { next(err); }
});

module.exports = r;
