const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const audioDir = path.join(uploadsDir, 'audio');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioDir);
  },
  filename: function (req, file, cb) {
    const sessionId = req.body.sessionId || 'unknown';
    const teacherId = req.body.teacherId || 'unknown';
    const timestamp = Date.now();
    const randomId = uuidv4().slice(0, 8);
    const filename = `recording_${sessionId}_${teacherId}_${timestamp}_${randomId}.webm`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedMimes = [
      'audio/webm', 
      'audio/wav', 
      'audio/mp3', 
      'audio/ogg', 
      'audio/mpeg',
      'audio/x-m4a',
      'audio/aac'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Только аудио файлы разрешены. Получен тип: ${file.mimetype}`));
    }
  }
});

module.exports = { upload, audioDir };