const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) return res.status(403).json({ message: 'Admins only' });
  next();
};

module.exports = { protect, adminOnly };
