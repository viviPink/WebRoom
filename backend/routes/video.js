const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Настройка multer для видео
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads/videos');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const { streamingId } = req.body;
      cb(null, `${streamingId}.webm`);
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// Хранилище для чанков
const chunkStorage = new Map();

// Обработка чанка видео
router.post('/stream/chunk', videoUpload.single('chunk'), (req, res) => {
  const { streamingId, chunkIndex } = req.body;
  
  if (!streamingId || !req.file) {
    return res.status(400).json({ error: 'Missing streamingId or chunk' });
  }
  
  if (!chunkStorage.has(streamingId)) {
    chunkStorage.set(streamingId, new Map());
  }
  
  const chunks = chunkStorage.get(streamingId);
  chunks.set(parseInt(chunkIndex, 10), req.file.path);
  
  res.json({ success: true, chunkIndex: parseInt(chunkIndex, 10) });
});

// Финализация видео
router.post('/stream/finalize', async (req, res) => {
  const { streamingId, sessionId, teacherId, title, description, duration, type } = req.body;
  
  if (!streamingId) {
    return res.status(400).json({ error: 'Missing streamingId' });
  }
  
  const chunks = chunkStorage.get(streamingId);
  if (!chunks) {
    return res.status(404).json({ error: 'No chunks found' });
  }
  
  try {
    // Собираем чанки
    const chunkPaths = Array.from(chunks.values());
    const finalPath = path.join(__dirname, '../../uploads/videos', `${streamingId}.webm`);
    
    // Если несколько чанков - объединяем
    if (chunkPaths.length > 1) {
      const writeStream = fs.createWriteStream(finalPath);
      for (const chunkPath of chunkPaths) {
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
        fs.unlinkSync(chunkPath); // удаляем чанк
      }
      writeStream.end();
    }
    
    const filePath = `/uploads/videos/${streamingId}.webm`;
    const fileSize = fs.statSync(finalPath).size;
    
    // Сохраняем в БД
    const result = await pool.query(
      `INSERT INTO "AudioRecording" 
       ("sessionId", "teacherId", "fileName", "filePath", "fileSize", "duration", "title", "description", "type", "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
       RETURNING *`,
      [sessionId, teacherId, `${streamingId}.webm`, filePath, fileSize, duration || 0, title || 'Video recording', description || '', type || 'video']
    );
    
    // Очищаем хранилище
    chunkStorage.delete(streamingId);
    
    // Уведомляем через socket
    if (req.app.locals.io) {
      req.app.locals.io.to(`session_${sessionId}`).emit('video_recording_added', {
        recording: result.rows[0],
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, recording: result.rows[0] });
  } catch (err) {
    console.error('Error finalizing video:', err);
    res.status(500).json({ error: err.message });
  }
});

// Получение видео файла
router.get('/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../../uploads/videos', req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  res.sendFile(filePath);
});

module.exports = router;