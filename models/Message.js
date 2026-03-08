const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  messageText: { type: String, trim: true, maxlength: 5000, default: '' },
  messageType: { type: String, enum: ['text', 'image', 'audio', 'voice'], default: 'text' },
  fileUrl:  { type: String, default: '' },
  fileName: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // voice message duration in seconds
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  seenBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
