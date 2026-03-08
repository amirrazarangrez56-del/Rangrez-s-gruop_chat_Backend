const User = require('../models/User');
const Group = require('../models/Group');
const { generateToken } = require('../utils/generateToken');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: 'Email already registered' });

    const isAdmin = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
    // Admin can always send messages; others need permission
    const user = await User.create({ name, email, password, isAdmin, canSendMessages: isAdmin });

    if (isAdmin) {
      let group = await Group.findOne();
      if (!group) {
        await Group.create({ name: "Rangrez's Group", description: "Welcome to Rangrez's Group!", admin: user._id, members: [user._id] });
      } else {
        if (!group.members.includes(user._id)) group.members.push(user._id);
        group.admin = user._id;
        await group.save();
      }
    }

    const token = generateToken(user._id);
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, canSendMessages: user.canSendMessages } });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'All fields required' });
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
    user.isOnline = true; user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, canSendMessages: user.canSendMessages } });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe };
