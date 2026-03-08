// authRoutes.js
const express = require('express');
const r = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
r.post('/register', register);
r.post('/login', login);
r.get('/me', protect, getMe);
module.exports = r;
