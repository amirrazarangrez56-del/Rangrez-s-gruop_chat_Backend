const express = require('express');
const r = express.Router();
const { getMessages, deleteMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
r.get('/:groupId', protect, getMessages);
r.delete('/delete/:messageId', protect, deleteMessage);
module.exports = r;
