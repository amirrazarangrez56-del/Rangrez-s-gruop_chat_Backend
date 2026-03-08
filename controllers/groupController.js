const Group = require('../models/Group');
const User = require('../models/User');

const getGroup = async (req, res, next) => {
  try {
    const group = await Group.findOne()
      .populate('members', 'name email isOnline lastSeen isAdmin canSendMessages')
      .populate('admin', 'name email')
      .populate('joinRequests', 'name email createdAt');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
    const hasPendingRequest = group.joinRequests.some(r => r._id.toString() === req.user._id.toString());
    res.json({ group, isMember, hasPendingRequest });
  } catch (err) { next(err); }
};

const requestJoin = async (req, res, next) => {
  try {
    const group = await Group.findOne();
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const userId = req.user._id;
    if (group.members.includes(userId)) return res.status(400).json({ message: 'Already a member' });
    if (group.joinRequests.includes(userId)) return res.status(400).json({ message: 'Request already pending' });
    group.joinRequests.push(userId);
    await group.save();
    const io = req.app.get('io');
    io.to('admin_room').emit('joinRequestNotification', { userId: req.user._id, userName: req.user.name, userEmail: req.user.email });
    res.json({ message: 'Request sent' });
  } catch (err) { next(err); }
};

const getJoinRequests = async (req, res, next) => {
  try {
    const group = await Group.findOne().populate('joinRequests', 'name email createdAt');
    res.json({ joinRequests: group?.joinRequests || [] });
  } catch (err) { next(err); }
};

const approveRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const group = await Group.findOne();
    const idx = group.joinRequests.findIndex(id => id.toString() === userId);
    if (idx === -1) return res.status(400).json({ message: 'No pending request' });
    group.joinRequests.splice(idx, 1);
    if (!group.members.includes(userId)) group.members.push(userId);
    await group.save();
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('requestApproved', { groupId: group._id });
    const user = await User.findById(userId, 'name');
    res.json({ message: `${user?.name} approved` });
  } catch (err) { next(err); }
};

const rejectRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const group = await Group.findOne();
    const idx = group.joinRequests.findIndex(id => id.toString() === userId);
    if (idx === -1) return res.status(400).json({ message: 'No pending request' });
    group.joinRequests.splice(idx, 1);
    await group.save();
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('requestRejected', { message: 'Your request was rejected' });
    res.json({ message: 'Rejected' });
  } catch (err) { next(err); }
};

const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const group = await Group.findOne();
    if (group.admin.toString() === userId) return res.status(400).json({ message: 'Cannot remove admin' });
    const idx = group.members.findIndex(id => id.toString() === userId);
    if (idx === -1) return res.status(400).json({ message: 'Not a member' });
    group.members.splice(idx, 1);
    await group.save();
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('removedFromGroup', { message: 'You were removed' });
    io.to(`group_${group._id}`).emit('memberRemoved', { userId, groupId: group._id });
    const user = await User.findById(userId, 'name');
    res.json({ message: `${user?.name} removed` });
  } catch (err) { next(err); }
};

// Admin toggles send permission for a member
const toggleSendPermission = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) return res.status(400).json({ message: 'Cannot restrict admin' });
    user.canSendMessages = !user.canSendMessages;
    await user.save({ validateBeforeSave: false });
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('sendPermissionChanged', { canSendMessages: user.canSendMessages });
    io.to('admin_room').emit('memberPermissionUpdated', { userId, canSendMessages: user.canSendMessages });
    res.json({ message: `${user.name} can ${user.canSendMessages ? 'now' : 'no longer'} send messages`, canSendMessages: user.canSendMessages });
  } catch (err) { next(err); }
};

module.exports = { getGroup, requestJoin, getJoinRequests, approveRequest, rejectRequest, removeMember, toggleSendPermission };
