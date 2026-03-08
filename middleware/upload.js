const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isAudio = file.mimetype.startsWith('audio/');
    return {
      folder: 'rangrez-group',
      resource_type: isAudio ? 'video' : 'image',
      allowed_formats: ['jpg','jpeg','png','gif','webp','mp3','wav','ogg','webm','m4a'],
      transformation: isAudio ? [] : [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/gif','image/webp',
    'audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4','audio/x-m4a'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });
