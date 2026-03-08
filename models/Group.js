const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
