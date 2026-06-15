/**
 Основной функционал сейчас:
 Аутентификация преподавателей и студентов 
 Управление курсами и сессиями 
  Чат WebSocket
 Запись и хранение аудио с вебинаров
 Транскрибация аудио через Whisper API
 Демонстрация экрана через WebRTC P2P
 Отслеживание посещаемости
  
  
  
  Middleware
   это программное обеспечение, которое действует как связующее звено между различными приложениями, системами или компонентами.
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const mediasoupManager = require('./mediasoupManager');
const XLSX = require('xlsx');

// ============================================
// СТРИМИНГОВАЯ ЗАПИСЬ - Хранилище сессий
// ============================================

// Хранилище активных стриминговых сессий
const activeStreamingSessions = new Map();

class StreamingSession {
  constructor(streamingId, type, sessionId, teacherId, teacherName) {
    this.streamingId = streamingId;
    this.type = type;
    this.sessionId = sessionId;
    this.teacherId = teacherId;
    this.teacherName = teacherName;
    this.chunks = [];
    this.chunkCount = 0;
    this.startTime = Date.now();
    this.metadata = {
      title: null,
      description: null,
      duration: 0,
      transcription: null,
      timedTranscription: null,
      timings: null
    };
    this.isFinalized = false;
  }

  addChunk(chunkBuffer, chunkIndex) {
    this.chunks[chunkIndex] = chunkBuffer;
    this.chunkCount++;
  }

  async finalize(metadata = {}) {
    if (this.isFinalized) {
      throw new Error('Session already finalized');
    }

    this.metadata = { ...this.metadata, ...metadata };
    this.metadata.duration = Math.floor((Date.now() - this.startTime) / 1000);
    
    const chunksToMerge = this.chunks.filter(chunk => chunk !== undefined);
    
    if (chunksToMerge.length === 0) {
      throw new Error('No chunks to finalize');
    }

    const tempDir = path.join(__dirname, 'temp_recordings');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${this.streamingId}_temp.webm`);
    const writeStream = fs.createWriteStream(tempFilePath);
    
    return new Promise((resolve, reject) => {
      const writeChunks = (index) => {
        if (index >= chunksToMerge.length) {
          writeStream.end(() => {
            const uploadDir = path.join(__dirname, 'uploads', 
              this.type === 'audio' ? 'audio' : 'videos');
            
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            const finalFileName = `${this.streamingId}.webm`;
            const finalPath = path.join(uploadDir, finalFileName);
            
            fs.rename(tempFilePath, finalPath, (err) => {
              if (err) {
                reject(err);
              } else {
                this.isFinalized = true;
                resolve({
                  id: this.streamingId,
                  filePath: `/uploads/${this.type === 'audio' ? 'audio' : 'videos'}/${finalFileName}`,
                  duration: this.metadata.duration,
                  title: this.metadata.title,
                  description: this.metadata.description,
                  transcription: this.metadata.transcription,
                  timedTranscription: this.metadata.timedTranscription,
                  timings: this.metadata.timings,
                  sessionId: this.sessionId,
                  teacherId: this.teacherId,
                  teacherName: this.teacherName,
                  createdAt: new Date(this.startTime).toISOString()
                });
              }
            });
          });
          return;
        }

        const chunk = chunksToMerge[index];
        writeStream.write(chunk, () => writeChunks(index + 1));
      };

      writeChunks(0);
    });
  }

  cancel() {
    this.chunks = [];
    this.isFinalized = true;
    
    const tempFilePath = path.join(__dirname, 'temp_recordings', `${this.streamingId}_temp.webm`);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// Очистка старых сессий каждые 30 минут
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [streamingId, session] of activeStreamingSessions.entries()) {
    if (now - session.startTime > ONE_HOUR && !session.isFinalized) {
      session.cancel();
      activeStreamingSessions.delete(streamingId);
      console.log(`Cleaned up stale session: ${streamingId}`);
    }
  }
}, 30 * 60 * 1000);



require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

// Настройка сертификатов
// // Пути к SSL сертификатам (см. .env)
// const certPath = process.env.CERT_PATH || './certs/certificate.crt';
// const keyPath = process.env.KEY_PATH || './certs/private.key';

// // Проверяем наличие сертификатов перед запуском сервера
// if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
//   console.error('Сертификаты не найдены');
//   process.exit(1); // Завершаем процесс с ошибкой
// }

// Читаем файлы сертификатов
// const privateKey = fs.readFileSync(keyPath, 'utf8');
// const certificate = fs.readFileSync(certPath, 'utf8');

// // Формируем объект credentials-"удостоверение личности" для HTTPS сервера
// const credentials = {
//   key: privateKey,
//   cert: certificate
// };

// инициализация самого приложения
const app = express();                       // Создаем Express приложение
// HTTP — для тоннеля (интернет, порт 3001)
const httpServer = http.createServer(app);

// директория для файлов
const uploadsDir = path.join(__dirname, 'uploads');     // Основная папка загрузок
const audioDir = path.join(uploadsDir, 'audio');        // Папка для аудиофайлов

// HTTPS — для локальной сети (порт 3002)
const certPath = process.env.CERT_PATH || './certs/certificate.crt';
const keyPath = process.env.KEY_PATH || './certs/private.key';
let httpsServer = null;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsServer = https.createServer({
    key: fs.readFileSync(keyPath, 'utf8'),
    cert: fs.readFileSync(certPath, 'utf8')
  }, app);
}

// Создаем директории, если они не существуют 
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}
// Создаем директорию для видео и временных файлов
const videosDir = path.join(uploadsDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

const tempRecordingsDir = path.join(__dirname, 'temp_recordings');
if (!fs.existsSync(tempRecordingsDir)) {
  fs.mkdirSync(tempRecordingsDir, { recursive: true });
}
// Настройка multer для материалов (сохраняем в отдельную папку)
const materialsDir = path.join(uploadsDir, 'materials');
if (!fs.existsSync(materialsDir)) {
  fs.mkdirSync(materialsDir, { recursive: true });
}

const materialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, materialsDir);
  },
  filename: function (req, file, cb) {
    const sessionId = req.body.sessionId || req.params.sessionId || 'unknown';
    const teacherId = req.body.teacherId || 'unknown';
    const timestamp = Date.now();
    const randomId = uuidv4().slice(0, 8);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(/[^a-zA-Zа-яА-Я0-9.-]/g, '_')
      .substring(0, 50);
    const filename = `material_${sessionId}_${teacherId}_${timestamp}_${randomId}${ext}`;
    cb(null, filename);
  }
});

const uploadMaterial = multer({
  storage: materialStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB
  }
});

/**
 * Загрузка материала к лекции (для преподавателя)
 * POST /api/materials/upload
 */
app.post('/api/materials/upload', uploadMaterial.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const { sessionId, teacherId, courseId, description, originalName } = req.body;
    
    if (!sessionId || !teacherId) {
      // Удаляем файл если есть ошибка
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'sessionId и teacherId обязательны' });
    }

    const filePath = `/uploads/materials/${req.file.filename}`;
    const fileSize = req.file.size;
    const fileType = req.file.mimetype;
    const displayName = originalName || req.file.originalname;

    const result = await pool.query(
      `INSERT INTO "LectureMaterial" 
       ("sessionId", "teacherId", "courseId", "fileName", "originalName", 
        "filePath", "fileSize", "fileType", "description", "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
       RETURNING *`,
      [sessionId, teacherId, courseId || null, req.file.filename, displayName, 
       filePath, fileSize, fileType, description || '']
    );

    // Отправляем уведомление через WebSocket, если сессия активна
    const roomName = `session_${sessionId}`;
    io.to(roomName).emit('material_added', {
      material: result.rows[0],
      timestamp: new Date()
    });

    res.json({
      success: true,
      material: result.rows[0],
      message: 'Материал успешно загружен'
    });
  } catch (err) {
    console.error('Ошибка загрузки материала:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch(e) {}
    }
    res.status(500).json({ 
      error: 'Ошибка сохранения материала',
      details: err.message
    });
  }
});

/**
 * Получение материалов для сессии
 * GET /api/materials/session/:sessionId
 */
app.get('/api/materials/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      `SELECT m.*, t.name as "teacherName"
       FROM "LectureMaterial" m
       LEFT JOIN "Teacher" t ON m."teacherId" = t.id
       WHERE m."sessionId" = $1
       ORDER BY m."createdAt" DESC`,
      [sessionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения материалов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получение материалов для сессии с конспектами (для студента)
 * GET /api/materials/session/:sessionId/with-summaries
 */
app.get('/api/materials/session/:sessionId/with-summaries', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Получаем материалы
    const materialsResult = await pool.query(
      `SELECT m.*, t.name as "teacherName"
       FROM "LectureMaterial" m
       LEFT JOIN "Teacher" t ON m."teacherId" = t.id
       WHERE m."sessionId" = $1
       ORDER BY m."createdAt" DESC`,
      [sessionId]
    );
    
    // Получаем конспекты (привязанные к сессии)
    const summariesResult = await pool.query(
      `SELECT ar.*
       FROM "AudioRecording" ar
       WHERE ar."sessionId" = $1
         AND (ar."aiSummary" IS NOT NULL 
           OR ar."aiBulletPoints" IS NOT NULL 
           OR ar."aiStructure" IS NOT NULL
           OR ar."timedTranscription" IS NOT NULL)
       ORDER BY ar."createdAt" DESC`,
      [sessionId]
    );
    
    res.json({
      materials: materialsResult.rows,
      summaries: summariesResult.rows
    });
  } catch (err) {
    console.error('Ошибка получения материалов с конспектами:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получение всех материалов для курса (для дашборда студента)
 * GET /api/materials/course/:courseId
 */
app.get('/api/materials/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      `SELECT m.*, s."startTime" as "sessionDate", c.title as "courseTitle", t.name as "teacherName"
       FROM "LectureMaterial" m
       JOIN "Session" s ON m."sessionId" = s.id
       JOIN "Course" c ON s."courseId" = c.id
       JOIN "Teacher" t ON m."teacherId" = t.id
       WHERE s."courseId" = $1
       ORDER BY s."startTime" DESC, m."createdAt" DESC`,
      [courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения материалов курса:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получение материалов, доступных студенту (из посещенных сессий)
 * GET /api/materials/student/:studentId
 */
app.get('/api/materials/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT DISTINCT 
        m.*,
        sess."startTime" as "sessionDate",
        c.title as "courseTitle",
        t.name as "teacherName",
        sess."subjectName"
       FROM "LectureMaterial" m
       JOIN "Session" sess ON m."sessionId" = sess.id
       JOIN "Course" c ON sess."courseId" = c.id
       JOIN "Teacher" t ON m."teacherId" = t.id
       JOIN "Attendance" a ON a."sessionId" = sess.id
       WHERE a."studentId" = $1
       ORDER BY sess."startTime" DESC, m."createdAt" DESC`,
      [studentId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения материалов студента:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Удаление материала
 * DELETE /api/materials/:materialId
 */
app.delete('/api/materials/:materialId', async (req, res) => {
  try {
    // Сначала получаем информацию о файле
    const result = await pool.query(
      'SELECT * FROM "LectureMaterial" WHERE id = $1',
      [req.params.materialId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Материал не найден' });
    }
    
    const material = result.rows[0];
    const filePath = path.join(materialsDir, material.fileName);
    
    // Удаляем файл с диска
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Удаляем запись из БД
    await pool.query('DELETE FROM "LectureMaterial" WHERE id = $1', [req.params.materialId]);
    
    res.json({ success: true, message: 'Материал удален' });
  } catch (err) {
    console.error('Ошибка удаления материала:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Обновление описания материала
 * PATCH /api/materials/:materialId
 */
app.patch('/api/materials/:materialId', async (req, res) => {
  const { materialId } = req.params;
  const { description } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE "LectureMaterial" 
       SET description = $1, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING *`,
      [description, materialId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Материал не найден' });
    }
    
    res.json({ success: true, material: result.rows[0] });
  } catch (err) {
    console.error('Ошибка обновления материала:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Раздача статических файлов материалов
app.use('/uploads/materials', express.static(materialsDir));

// настройка multer - загрузка файлов 
/**
 Конфигурация хранилища для multer
 Определяет куда и как сохранять загружаемые файлы
 */
const storage = multer.diskStorage({
  // Функция определения директории назначения
  destination: function (req, file, cb) {
    cb(null, audioDir); // Сохраняем в папку audio
  },
  // Функция генерации имени файла
  filename: function (req, file, cb) {
    // Извлекаем данные из тела запроса для формирования имени
    const sessionId = req.body.sessionId || 'unknown';
    const teacherId = req.body.teacherId || 'unknown';
    const timestamp = Date.now();
    const randomId = uuidv4().slice(0, 8); // Первые 8 символов UUID
    // Формируем имя: recording_{sessionId}_{teacherId}_{timestamp}_{randomId}.webm
    const filename = `recording_${sessionId}_${teacherId}_${timestamp}_${randomId}.webm`;
    cb(null, filename);
  }
});
// server — используем httpServer для socket.io
const server = httpServer;
/**
 Конфигурация загрузчика multer
  Ограничения: максимум 50MB, только аудио файлы
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
  

fileFilter: function (req, file, cb) {
  const allowedMimes = [
    // аудио
    'audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg',
    // видео
    'video/webm', 'video/mp4', 'video/quicktime'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый формат файла: ' + file.mimetype), false);
  }
}
});
// MIDDLEWARE (ПРОМЕЖУТОЧНОЕ ПО) 
/**
 Настройка CORS (Cross-Origin Resource Sharing)
  Разрешает запросы с любых источников, поддерживает куки/учетные данные
 */
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition', 'X-Teacher-ID']  
}));
app.options('*', cors());

// Дополнительная настройка CORS для материалов
app.use('/api/materials', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Disposition, X-Teacher-ID');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());      // Парсинг JSON тела запроса
app.use(express.static(path.join(__dirname, 'public')));

const { createProxyMiddleware } = require('http-proxy-middleware');

// Прокси для Whisper сервера с передачей teacher_id
const whisperProxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/whisper': ''
  },
  on: {
    proxyReq: (proxyReq, req, res) => {
      const teacherId = req.headers['x-teacher-id'] || req.query.teacherId;
      if (teacherId) {
        proxyReq.setHeader('X-Teacher-ID', teacherId);
      }
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).json({ error: 'Whisper server unavailable' });
    }
  }
});


app.use('/api/whisper', whisperProxy);

// Эндпоинты для работы с промптами
app.get('/api/prompts', async (req, res) => {
  try {
    const teacherId = req.headers['x-teacher-id'] || req.query.teacherId;
    const headers = { 'Content-Type': 'application/json' };
    if (teacherId) headers['X-Teacher-ID'] = teacherId;
    
    const response = await axios.get('http://localhost:5000/prompts', { 
      headers,
      timeout: 5000 
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error fetching prompts:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch prompts' });
  }
});

app.post('/api/prompts', async (req, res) => {
  try {
    const teacherId = req.headers['x-teacher-id'] || req.body.teacherId;
    const headers = { 'Content-Type': 'application/json' };
    if (teacherId) headers['X-Teacher-ID'] = teacherId;
    
    const response = await axios.post('http://localhost:5000/prompts', req.body, {
      headers,
      timeout: 5000
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error saving prompts:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save prompts' });
  }
});

app.post('/api/prompts/reset', async (req, res) => {
  try {
    const teacherId = req.headers['x-teacher-id'] || req.body.teacherId;
    const headers = { 'Content-Type': 'application/json' };
    if (teacherId) headers['X-Teacher-ID'] = teacherId;
    
    const response = await axios.post('http://localhost:5000/prompts/reset', req.body, {
      headers,
      timeout: 5000
    });
    res.json(response.data);
  } catch (err) {
    console.error('Error resetting prompts:', err.message);
    res.status(500).json({ success: false, error: 'Failed to reset prompts' });
  }
});
// =============================================================
// ЭНДПОИНТЫ ДЛЯ ПЕРСОНАЛЬНОГО ПРОМПТА ПРЕПОДАВАТЕЛЯ
// =============================================================

/**
 * Получить персональный промпт преподавателя
 * GET /api/teacher/:teacherId/custom-prompt
 */
app.get('/api/teacher/:teacherId/custom-prompt', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const result = await pool.query(
      `SELECT "customPrompt", "selectedPromptType", "selectedPromptAction" 
       FROM "Teacher" 
       WHERE id = $1`,
      [teacherId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' });
    }
    
    res.json({
      success: true,
      customPrompt: result.rows[0].customPrompt || '',
      selectedPromptType: result.rows[0].selectedPromptType || 'system',
      selectedPromptAction: result.rows[0].selectedPromptAction || 'summary'
    });
  } catch (err) {
    console.error('Ошибка получения промпта:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Сохранить персональный промпт преподавателя
 * POST /api/teacher/:teacherId/custom-prompt
 * Тело: { customPrompt, selectedPromptType, selectedPromptAction }
 */
app.post('/api/teacher/:teacherId/custom-prompt', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { customPrompt, selectedPromptType, selectedPromptAction } = req.body;
    
    const result = await pool.query(
      `UPDATE "Teacher" 
       SET "customPrompt" = $1,
           "selectedPromptType" = $2,
           "selectedPromptAction" = $3
       WHERE id = $4
       RETURNING id, "customPrompt", "selectedPromptType", "selectedPromptAction"`,
      [customPrompt || null, selectedPromptType || 'system', selectedPromptAction || 'summary', teacherId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Ошибка сохранения промпта:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Обновить выбранный тип промпта преподавателя
 * POST /api/teacher/:teacherId/prompt-type
 * Тело: { selectedPromptType, selectedPromptAction }
 */
app.post('/api/teacher/:teacherId/prompt-type', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { selectedPromptType, selectedPromptAction } = req.body;
    
    const result = await pool.query(
      `UPDATE "Teacher" 
       SET "selectedPromptType" = $1,
           "selectedPromptAction" = $2
       WHERE id = $3
       RETURNING id, "selectedPromptType", "selectedPromptAction"`,
      [selectedPromptType || 'system', selectedPromptAction || 'summary', teacherId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Ошибка обновления типа промпта:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
// Эндпоинт для улучшения текста
/**
 * Улучшение текста через AI с учетом персонального промпта преподавателя
 * POST /api/enhance-transcription
 */

app.post('/api/enhance-transcription', async (req, res) => {
  try {
    const teacherId = req.headers['x-teacher-id'] || req.body.teacher_id;
    const headers = { 'Content-Type': 'application/json' };
    if (teacherId) headers['X-Teacher-ID'] = teacherId;
    
    console.log('[ENHANCE] Request received');
    console.log('[ENHANCE] Action:', req.body.action);
    console.log('[ENHANCE] Teacher ID:', teacherId);
    
    const requestBody = {
      text: req.body.text,
      action: req.body.action,
      recordingId: req.body.recordingId,
      teacher_id: teacherId
    };
    
    // Добавляем customPrompt если есть
    if (req.body.customPrompt && req.body.customPrompt.trim()) {
      requestBody.customPrompt = req.body.customPrompt;
    }
    
    const response = await axios.post('http://localhost:5000/summarize', requestBody, {
      headers,
      timeout: 120000
    });
    
    console.log('[ENHANCE] Flask response status:', response.status);
    
    // Отправляем обратно то, что пришло от Flask
    if (response.data && response.data.success) {
      return res.json({
        success: true,
        summary: response.data.summary,  // поле summary, а не text
        action: response.data.action,
        processing_time: response.data.processing_time
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: response.data?.error || 'Unknown error from Flask' 
      });
    }
  } catch (err) {
    console.error('[ENHANCE] Error:', err.message);
    if (err.response) {
      console.error('[ENHANCE] Response status:', err.response.status);
      console.error('[ENHANCE] Response data:', err.response.data);
    }
    res.status(500).json({ 
      success: false, 
      error: 'Failed to enhance text'
    });
  }
});



app.get('/api/summarize/status', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5000/summarize/status', {
      timeout: 5000
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ available: false, message: 'LM Studio unavailable' });
  }
});

app.post('/api/correct', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:5000/correct', req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ corrected: req.body.text || '' });
  }
});

app.get('/api/whisper/health', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5000/health', { timeout: 3000 });
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ status: 'unavailable' });
  }
});

// Конфигурация multer для чанков стриминга
const chunkUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 Логирующий middleware
  Записывает все входящие запросы и их тела (для POST/PUT)
 */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', JSON.stringify(req.body, null, 2)); // Форматированный вывод тела
  }
  next(); // Передаем управление следующему middleware
});

// Раздача статических файлов из папки uploads/audio по URL /uploads/audio
app.use('/uploads/audio', express.static(audioDir));
app.use('/uploads/videos', express.static(videosDir));
// настройка Websocet (socket.io)
const io = socketIo(server, {
  cors: {
    origin: "*",              // Разрешить все источники
    methods: ["GET", "POST"], // Разрешенные методы
    credentials: true
  },
  transports: ['websocket', 'polling'], // Поддерживаемые транспорты (WebSocket и long-polling)
  pingTimeout: 60000,         // Таймаут пинга (60 сек)
  pingInterval: 25000         // Интервал пинга (25 сек)
});

// порт сервера
const HTTP_PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3002;



// Получение материалов прошлых занятий по сессии (исправленная версия)
app.get('/api/sessions/:sessionId/past-materials', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`[past-materials] Request for session ${sessionId}`);
    
    // Получаем информацию о текущей сессии
    const sessionQuery = await pool.query(
      `SELECT s."courseId", c."teacherId" 
       FROM "Session" s
       JOIN "Course" c ON s."courseId" = c.id
       WHERE s.id = $1`,
      [sessionId]
    );
    
    if (sessionQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    const { courseId, teacherId } = sessionQuery.rows[0];
    console.log(`[past-materials] courseId=${courseId}, teacherId=${teacherId}`);
    
    if (!courseId) {
      return res.json({ recordings: [], count: 0, message: 'Курс не указан' });
    }
    
    // Получаем все сессии этого курса (кроме текущей)
    const sessionsOfCourse = await pool.query(
      `SELECT id FROM "Session" WHERE "courseId" = $1 AND id != $2`,
      [courseId, sessionId]
    );
    
    const sessionIds = sessionsOfCourse.rows.map(s => s.id);
    
    if (sessionIds.length === 0) {
      return res.json({ recordings: [], count: 0, message: 'Нет других сессий курса' });
    }
    
    // Ищем записи по этим сессиям
    const recordingsQuery = await pool.query(
      `SELECT 
        r.id,
        r."sessionId",
        r."fileName",
        r."filePath",
        r."duration",
        r."title",
        r."description",
        r."type",
        r."transcription",
        r."aiSummary",
        r."aiBulletPoints",
        r."aiStructure",
        r."createdAt",
        s."teacher_comment" as "comment",
        s."startTime" as "session_date",
        c.title as "course_title"
      FROM "AudioRecording" r
      LEFT JOIN "Session" s ON r."sessionId" = s.id
      LEFT JOIN "Course" c ON s."courseId" = c.id
      WHERE r."sessionId" = ANY($1::int[])
        AND r."teacherId" = $2
      ORDER BY r."createdAt" DESC
      LIMIT 50`,
      [sessionIds, teacherId]
    );
    
    console.log(`[past-materials] Found ${recordingsQuery.rows.length} recordings`);
    
    // Для каждой записи получаем материалы сессии
    const recordingsWithMaterials = [];
    for (const rec of recordingsQuery.rows) {
      let materials = [];
      if (rec.sessionId) {
        try {
          const materialsResult = await pool.query(
            `SELECT "fileName", "originalName", "filePath", "fileType", "description"
             FROM "LectureMaterial" 
             WHERE "sessionId" = $1`,
            [rec.sessionId]
          );
          materials = materialsResult.rows.map(m => ({
            title: m.originalName || m.fileName,
            filePath: m.filePath,
            type: m.fileType
          }));
        } catch (mErr) {
          console.error(`Error loading materials for session ${rec.sessionId}:`, mErr.message);
        }
      }
      
      recordingsWithMaterials.push({
        id: rec.id,
        sessionId: rec.sessionId,
        sessionDate: rec.session_date,
        courseTitle: rec.course_title,
        title: rec.title || 'Запись занятия',
        description: rec.description || '',
        type: rec.type || (rec.filePath?.includes('video') ? 'video' : 'audio'),
        filePath: rec.filePath,
        duration: rec.duration,
        transcription: rec.transcription,
        aiSummary: rec.aiSummary,
        aiBulletPoints: rec.aiBulletPoints,
        aiStructure: rec.aiStructure,
        createdAt: rec.createdAt,
        comment: rec.comment || '',
        materials: materials
      });
    }
    
    res.json({
      success: true,
      recordings: recordingsWithMaterials,
      count: recordingsWithMaterials.length,
      courseId: courseId
    });
  } catch (err) {
    console.error('Ошибка получения прошлых материалов:', err);
    res.status(500).json({ 
      error: 'Ошибка получения материалов', 
      details: err.message 
    });
  }
});

// Получение всех записей преподавателя для выбора трансляции
app.get('/api/teacher/:teacherId/course-recordings/:courseId', async (req, res) => {
  try {
    const { teacherId, courseId } = req.params;
    
    // Получаем все сессии этого курса
    const sessionsResult = await pool.query(
      `SELECT id FROM "Session" WHERE "courseId" = $1`,
      [courseId]
    );
    
    const sessionIds = sessionsResult.rows.map(s => s.id);
    
    if (sessionIds.length === 0) {
      return res.json({ recordings: [], count: 0 });
    }
    
    // Получаем все записи этих сессий
    const recordingsResult = await pool.query(
      `SELECT 
        r.id,
        r."sessionId",
        r."title",
        r."description",
        r."filePath",
        r."duration",
        r."type",
        r."transcription",
        r."createdAt",
        s."startTime" as "sessionDate"
      FROM "AudioRecording" r
      LEFT JOIN "Session" s ON r."sessionId" = s.id
      WHERE r."sessionId" = ANY($1::int[])
        AND r."teacherId" = $2
      ORDER BY r."createdAt" DESC
      LIMIT 100`,
      [sessionIds, teacherId]
    );
    
    res.json({
      success: true,
      recordings: recordingsResult.rows,
      count: recordingsResult.rows.length
    });
  } catch (err) {
    console.error('Ошибка получения записей курса:', err);
    res.status(500).json({ error: err.message });
  }
});
/**
  соединений с PostgreSQL
  настройки берутся из переменных окружения
 */
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Обработчики событий пула
pool.on('connect', () => console.log('PostgreSQL подключен'));
pool.on('error', (err) => console.error('Ошибка PostgreSQL:', err));

// Инициализация таблиц БД (Admin, ModelConfig и др.)
const { initDatabase } = require('./config/database');
initDatabase().catch(err => console.error('Ошибка initDatabase:', err));


/**
 Создание таблицы AudioRecording, если она не существует
  Хранит метаданные загруженных аудиозаписей
 */
// const createAudioRecordingsTable = async () => {
//   try {
//     await pool.query(`CREATE TABLE IF NOT EXISTS "AudioRecording" (
//       id SERIAL PRIMARY KEY,                          // Уникальный ID записи
//       "sessionId" INTEGER,                            // ID сессии (вебинара)
//       "teacherId" INTEGER,                             // ID преподавателя
//       "fileName" VARCHAR(255) NOT NULL,                // Имя файла на диске
//       "filePath" VARCHAR(500) NOT NULL,                // Путь к файлу (URL)
//       "fileSize" INTEGER,                               // Размер файла в байтах
//       "duration" INTEGER,                               // Длительность в секундах
//       "title" VARCHAR(255),                             // Название записи
//       "description" TEXT,                               // Описание
//       "transcription" TEXT,                             // Транскрипция текста
//       "lastEditedAt" TIMESTAMP,                         // Время последнего редактирования
//       "createdAt" TIMESTAMP DEFAULT NOW()               // Время создания
//     )`);
//     console.log('Таблица AudioRecording создана/проверена');
//   } catch (err) {
//     console.error('Ошибка создания таблицы AudioRecording:', err);
//   }
// };

/**
 * Добавление колонок для транскрипции в существующую таблицу
 */
// const addTranscriptionColumns = async () => {
//   try {
//     await pool.query(`ALTER TABLE "AudioRecording" 
//       ADD COLUMN IF NOT EXISTS "transcription" TEXT, 
//       ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP;`);
//     console.log('Таблица AudioRecording проверена/обновлена для транскрипций');
//   } catch (err) {
//     console.error('Ошибка при добавлении колонок транскрипции:', err);
//   }
// };

// Выполняем инициализацию таблиц при старте
//createAudioRecordingsTable();
// addTranscriptionColumns();

const multerImport = multer({ storage: multer.memoryStorage() });
app.post('/api/teacher/groups-subjects/import', multerImport.single('file'), async (req, res) => {
  const { teacherId } = req.body;
  const file = req.file;
  
  if (!teacherId || !file) {
    return res.status(400).json({ error: 'Не указаны teacherId или файл' });
  }
  
  try {
    // Декодируем буфер в UTF-8 строку для CSV файлов
    let buffer = file.buffer;
    let fileContent = buffer.toString('utf8');
    
    // Удаляем BOM если есть
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    // Пробуем разные варианты
    let workbook;
    try {
      // Для CSV - используем строку с указанием кодировки
      if (file.originalname.endsWith('.csv')) {
        const XLSX = require('xlsx');
        // Конвертируем обратно в буфер с правильной кодировкой
        const fixedBuffer = Buffer.from(fileContent, 'utf8');
        workbook = XLSX.read(fixedBuffer, { type: 'buffer', cellText: false, cellDates: false });
      } else {
        workbook = XLSX.read(buffer, { type: 'buffer' });
      }
    } catch (parseErr) {
      console.error('Ошибка парсинга:', parseErr);
      return res.status(400).json({ error: 'Ошибка парсинга файла. Убедитесь, что файл в формате Excel или CSV' });
    }
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Используем raw: false для правильного чтения русских символов
    const data = XLSX.utils.sheet_to_json(sheet, { 
      header: 1, 
      defval: "",
      raw: false  // ВАЖНО: получаем текст, а не сырые данные
    });
    
    console.log('Первые 3 строки файла (декодированные):', data.slice(0, 3));
    
    if (data.length < 2) {
      return res.status(400).json({ error: 'Файл не содержит данных' });
    }
    
    // Получаем заголовки из первой строки
    let headers = data[0];
    
    // Если заголовки все еще битые, пробуем исправить
    if (headers && headers[0] && headers[0].includes('Ð')) {
      console.log('Заголовки повреждены, пробуем исправить кодировку...');
      // Конвертируем каждый заголовок
      headers = headers.map(h => {
        if (typeof h === 'string') {
          return h;
        }
        return h;
      });
    }
    
    console.log('Заголовки:', headers);
    
    // Находим индексы колонок (ищем по ключевым словам в любой кодировке)
    let groupIndex = -1;
    let subjectIndex = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      
      // Проверяем наличие русских букв в разных кодировках
      if (header.includes('групп') || header.includes('group') || 
          header.includes('Ð³Ñ\x80Ñ\x83Ð¿Ð¿') || header === 'группа') {
        groupIndex = i;
        console.log(`Найдена колонка группы: "${headers[i]}" на позиции ${i}`);
      }
      if (header.includes('предмет') || header.includes('subject') ||
          header.includes('Ð¿Ñ\x80ÐµÐ´Ð¼Ðµ') || header === 'предмет') {
        subjectIndex = i;
        console.log(`Найдена колонка предмета: "${headers[i]}" на позиции ${i}`);
      }
    }
    
    // Если не нашли, пробуем по первой колонке (0) и второй (1)
    if (groupIndex === -1 && headers.length > 0) groupIndex = 0;
    if (subjectIndex === -1 && headers.length > 1) subjectIndex = 1;
    
    if (groupIndex === -1 || subjectIndex === -1) {
      return res.status(400).json({ 
        error: `Не найдены колонки. Доступно: ${headers.join(', ')}. 
        Ожидаются: "Группа" и "Предмет" в первых двух колонках` 
      });
    }
    
    const results = {
      created: 0,
      skipped: 0,
      groupsCreated: 0,
      coursesCreated: 0,
      errors: []
    };
    
    // Обрабатываем строки начиная со второй
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      let groupName = row[groupIndex] ? String(row[groupIndex]).trim() : '';
      let subjectName = row[subjectIndex] ? String(row[subjectIndex]).trim() : '';
      
      // Если данные все еще битые, пробуем исправить кодировку
      if (groupName.includes('Ð')) {
        groupName = decodeURIComponent(escape(groupName));
      }
      if (subjectName.includes('Ð')) {
        subjectName = decodeURIComponent(escape(subjectName));
      }
      
      console.log(`Строка ${i + 1}: группа="${groupName}", предмет="${subjectName}"`);
      
      if (!groupName || !subjectName || groupName === '' || subjectName === '') {
        results.errors.push(`Строка ${i + 1}: пропущена группа или предмет (группа="${groupName}", предмет="${subjectName}")`);
        results.skipped++;
        continue;
      }
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 1. Найти или создать ГРУППУ
        let groupResult = await client.query(
          'SELECT id FROM "Group" WHERE name = $1',
          [groupName]
        );
        
        let groupId;
        if (groupResult.rows.length === 0) {
          const newGroup = await client.query(
            'INSERT INTO "Group" (name) VALUES ($1) RETURNING id',
            [groupName]
          );
          groupId = newGroup.rows[0].id;
          results.groupsCreated++;
          console.log(`Создана новая группа: ${groupName}`);
        } else {
          groupId = groupResult.rows[0].id;
        }
        
        // 2. Найти или создать КУРС (предмет) для этого преподавателя
        let courseResult = await client.query(
          'SELECT id FROM "Course" WHERE title = $1 AND "teacherId" = $2',
          [subjectName, teacherId]
        );
        
        let courseId;
        if (courseResult.rows.length === 0) {
          const newCourse = await client.query(
            'INSERT INTO "Course" ("teacherId", title) VALUES ($1, $2) RETURNING id',
            [teacherId, subjectName]
          );
          courseId = newCourse.rows[0].id;
          results.coursesCreated++;
          console.log(`Создан новый предмет: ${subjectName} для учителя ${teacherId}`);
        } else {
          courseId = courseResult.rows[0].id;
        }
        
        // 3. Проверить, не существует ли уже такая связь
        const existingRelation = await client.query(
          `SELECT id FROM "TeacherGroupSubject" 
           WHERE "teacherId" = $1 AND "groupId" = $2 AND "subjectName" = $3`,
          [teacherId, groupId, subjectName]
        );
        
        if (existingRelation.rows.length > 0) {
          results.skipped++;
          await client.query('ROLLBACK');
          client.release();
          console.log(`Связь уже существует: группа ${groupName}, предмет ${subjectName}`);
          continue;
        }
        
        // 4. Создать связь
        await client.query(
          `INSERT INTO "TeacherGroupSubject" ("teacherId", "groupId", "subjectName")
           VALUES ($1, $2, $3)`,
          [teacherId, groupId, subjectName]
        );
        
        results.created++;
        await client.query('COMMIT');
        client.release();
        console.log(`Создана связь: группа ${groupName}, предмет ${subjectName}`);
        
      } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        results.errors.push(`Строка ${i + 1}: ${err.message}`);
        results.skipped++;
        console.error(`Ошибка в строке ${i + 1}:`, err.message);
      }
    }
    
    res.json({
      success: true,
      results: {
        total: data.length - 1,
        created: results.created,
        skipped: results.skipped,
        groupsCreated: results.groupsCreated,
        coursesCreated: results.coursesCreated,
        errors: results.errors
      }
    });
    
  } catch (err) {
    console.error('Ошибка импорта:', err);
    res.status(500).json({ error: 'Ошибка импорта файла: ' + err.message });
  }
});

// API эндпоинты

/**
 аунтефикация преподавателя
 POST /api/teacher/login
 Вход или регистрация преподавателя 
  Если преподаватель с таким email не найден - создает нового !!!!! надо исправить тут 
  
  Тело запроса: { name, email }
  Ответ: объект Teacher
 */
/**
Аутентификация преподавателя
POST /api/teacher/login
Вход или регистрация преподавателя
Тело запроса: { id, mail, email }
Ответ: объект Teacher
*/
app.post('/api/teacher/login', async (req, res) => {
  const { name, email, universityId } = req.body;
  try {
    let query = 'SELECT * FROM "Teacher" WHERE name = $1 AND email = $2';
    const params = [name, email];
    if (universityId) {
      query += ' AND "universityId" = $3';
      params.push(universityId);
    }
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Преподаватель с таким именем и email не найден' 
      });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});



/**
 * Получение всех курсов студента (на основе его группы)
 * GET /api/student/:studentId/courses
 */
app.get('/api/student/:studentId/courses', async (req, res) => {
  const { studentId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT DISTINCT 
        c.id, 
        c.title, 
        c."teacherId",
        t.name as "teacherName"
       FROM "Student" s
       JOIN "Group" g ON s."groupId" = g.id
       JOIN "Session" sess ON sess."groupId" = g.id
       JOIN "Course" c ON sess."courseId" = c.id
       JOIN "Teacher" t ON c."teacherId" = t.id
       WHERE s.id = $1
       ORDER BY c.title`,
      [studentId]
    );
    
    res.json({
      success: true,
      courses: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('Ошибка получения курсов студента:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
/**
 * GET /api/courses/:courseId/sessions
 * Возвращает все сессии для указанного курса
 */
app.get('/api/courses/:courseId/sessions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.title as "courseTitle" 
       FROM "Session" s 
       JOIN "Course" c ON s."courseId" = c.id 
       WHERE s."courseId" = $1 
       ORDER BY s."startTime" DESC`,
      [req.params.courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения сессий курса:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});











// server.js - добавьте этот эндпоинт

/**
 * Обновление информации о преподавателе
 * PUT /api/teacher/:teacherId
 */
app.put('/api/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;
  const { name, email } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE "Teacher" SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, teacherId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка обновления преподавателя:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});








/**
  GET /api/teacher/:teacherId/courses
  Возвращает все курсы, созданные преподавателем
  
  Параметры URL: teacherId
  Ответ: массив объектов Course
 */
app.get('/api/teacher/:teacherId/courses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "Course" WHERE "teacherId" = $1',
      [req.params.teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 создание нового курса
  POST /api/teacher/courses/create
  Создает новый курс для преподавателя
  
  Тело запроса: { teacherId, title }
  созданный объект Course
 */
app.post('/api/teacher/courses/create', async (req, res) => {
  const { teacherId, title } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO "Course" ("teacherId", title) VALUES ($1, $2) RETURNING *',
      [teacherId, title]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});




/**
 * Получение пропущенных занятий для студента
 * GET /api/student/:studentId/missed-sessions
 */
app.get('/api/student/:studentId/missed-sessions', async (req, res) => {
  const { studentId } = req.params;
  
  try {
    const studentResult = await pool.query(
      'SELECT id, "full_name", "group", "groupId" FROM "Student" WHERE id = $1',
      [studentId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Студент не найден' });
    }
    
    const student = studentResult.rows[0];
    const groupId = student.groupId;
    
    if (!groupId) {
      console.log(`Студент ${studentId} не привязан к группе`);
      return res.json([]);
    }
    
    const missedQuery = `
      SELECT 
        s.id,
        s."courseId",
        s."isActive",
        s."startTime",
        s."endTime",
        s."description",
        s."groupId",
        s."subjectName",
        s."teacher_comment" as "sessionComment",
        c.title as "courseTitle",
        t.name as "teacherName",
        g.name as "groupName",
        ar."filePath" as "recordingPath",
        ar."duration",
        ar."title" as "recordingTitle",
        ar."type",
        ar."transcription",
        ar."timedTranscription",
        ar."aiSummary",
        ar."aiBulletPoints",
        ar."aiStructure",
        ar."aiQuestions",
        ar."createdAt" as "recordingCreatedAt",
        COALESCE(msr."hasReviewed", FALSE) as "hasReviewed",
        msr."reviewedAt",
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', m.id,
            'originalName', m."originalName",
            'filePath', m."filePath",
            'fileSize', m."fileSize",
            'fileType', m."fileType",
            'description', m."description",
            'createdAt', m."createdAt"
          )), '[]'::json)
          FROM "LectureMaterial" m
          WHERE m."sessionId" = s.id
        ) as materials
      FROM "Session" s
      JOIN "Course" c ON s."courseId" = c.id
      JOIN "Teacher" t ON c."teacherId" = t.id
      LEFT JOIN "Group" g ON s."groupId" = g.id
      LEFT JOIN "AudioRecording" ar ON ar."sessionId" = s.id
      LEFT JOIN "MissedSessionReview" msr ON msr."sessionId" = s.id AND msr."studentId" = $2
      WHERE s."groupId" = $1
        AND s."isActive" = false
        AND s."endTime" IS NOT NULL
        AND s.id NOT IN (
          SELECT a."sessionId" 
          FROM "Attendance" a 
          WHERE a."studentId" = $2
        )
      ORDER BY s."startTime" DESC
    `;
    
    const missedResult = await pool.query(missedQuery, [groupId, studentId]);
    
    // Парсим JSON строку materials
    const sessionsWithMaterials = missedResult.rows.map(session => ({
      ...session,
      materials: typeof session.materials === 'string' 
        ? JSON.parse(session.materials) 
        : (session.materials || [])
    }));
    
    console.log(`Найдено пропущенных занятий для студента ${studentId}: ${sessionsWithMaterials.length}`);
    console.log(`Ознакомлено: ${sessionsWithMaterials.filter(r => r.hasReviewed).length}`);
    
    res.json(sessionsWithMaterials);
  } catch (err) {
    console.error('Ошибка получения пропущенных занятий:', err);
    res.status(500).json({ error: 'Ошибка сервера', details: err.message });
  }
});


/**
 * Отметка об ознакомлении с пропущенным занятием
 * POST /api/student/:studentId/missed/:sessionId/review
 */
app.post('/api/student/:studentId/missed/:sessionId/review', async (req, res) => {
    const { studentId, sessionId } = req.params;
    
    try {
        const existing = await pool.query(
            `SELECT * FROM "MissedSessionReview" 
             WHERE "studentId" = $1 AND "sessionId" = $2`,
            [studentId, sessionId]
        );
        
        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE "MissedSessionReview" 
                 SET "hasReviewed" = TRUE, "reviewedAt" = NOW()
                 WHERE "studentId" = $1 AND "sessionId" = $2
                 RETURNING *`,
                [studentId, sessionId]
            );
        } else {
            result = await pool.query(
                `INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
                 VALUES ($1, $2, TRUE, NOW())
                 RETURNING *`,
                [studentId, sessionId]
            );
        }
        
        res.json({ 
            success: true, 
            review: result.rows[0],
            message: 'Занятие отмечено как ознакомленное'
        });
    } catch (err) {
        console.error('Ошибка отметки ознакомления:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Снять отметку об ознакомлении
 * DELETE /api/student/:studentId/missed/:sessionId/review
 */
app.delete('/api/student/:studentId/missed/:sessionId/review', async (req, res) => {
    const { studentId, sessionId } = req.params;
    
    try {
        await pool.query(
            `DELETE FROM "MissedSessionReview" 
             WHERE "studentId" = $1 AND "sessionId" = $2`,
            [studentId, sessionId]
        );
        
        res.json({ 
            success: true, 
            message: 'Отметка ознакомления снята'
        });
    } catch (err) {
        console.error('Ошибка снятия отметки:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// /**
//  * Получение пропущенных занятий с информацией об ознакомлении
//  * Обновляем существующий эндпоинт
//  */
// app.get('/api/student/:studentId/missed-sessions', async (req, res) => {
//     const { studentId } = req.params;
    
//     try {
//         const studentResult = await pool.query(
//             'SELECT id, "full_name", "group", "groupId" FROM "Student" WHERE id = $1',
//             [studentId]
//         );
        
//         if (studentResult.rows.length === 0) {
//             return res.status(404).json({ error: 'Студент не найден' });
//         }
        
//         const student = studentResult.rows[0];
//         const groupId = student.groupId;
        
//         if (!groupId) {
//             console.log(`Студент ${studentId} не привязан к группе`);
//             return res.json([]);
//         }
        
//         // Исправленный запрос с информацией об ознакомлении
//         const missedQuery = `
//             SELECT 
//                 s.id,
//                 s."courseId",
//                 s."isActive",
//                 s."startTime",
//                 s."endTime",
//                 s."description",
//                 s."groupId",
//                 s."subjectName",
//                 c.title as "courseTitle",
//                 t.name as "teacherName",
//                 g.name as "groupName",
//                 ar."filePath" as "recordingPath",
//                 ar."transcription",
//                 ar."timedTranscription",
//                 ar."aiSummary",
//                 ar."aiBulletPoints",
//                 ar."aiStructure",
//                 ar."aiQuestions",
//                 ar."createdAt" as "recordingCreatedAt",
//                 ar."title" as "recordingTitle",
//                 COALESCE(msr."hasReviewed", FALSE) as "hasReviewed",
//                 msr."reviewedAt"
//             FROM "Session" s
//             JOIN "Course" c ON s."courseId" = c.id
//             JOIN "Teacher" t ON c."teacherId" = t.id
//             LEFT JOIN "Group" g ON s."groupId" = g.id
//             LEFT JOIN "AudioRecording" ar ON ar."sessionId" = s.id AND (ar."type" = 'audio' OR ar."type" IS NULL)
//             LEFT JOIN "MissedSessionReview" msr ON msr."sessionId" = s.id AND msr."studentId" = $2
//             WHERE s."groupId" = $1
//                 AND s."isActive" = false
//                 AND s."endTime" IS NOT NULL
//                 AND s.id NOT IN (
//                     SELECT a."sessionId" 
//                     FROM "Attendance" a 
//                     WHERE a."studentId" = $2
//                 )
//             ORDER BY s."startTime" DESC
//         `;
        
//         const missedResult = await pool.query(missedQuery, [groupId, studentId]);
        
//         console.log(`Найдено пропущенных занятий для студента ${studentId}: ${missedResult.rows.length}`);
//         console.log(`Ознакомлено: ${missedResult.rows.filter(r => r.hasReviewed).length}`);
        
//         res.json(missedResult.rows);
//     } catch (err) {
//         console.error('Ошибка получения пропущенных занятий:', err);
//         res.status(500).json({ error: 'Ошибка сервера', details: err.message });
//     }
// });


// В эндпоинте POST /api/teacher/sessions/schedule
app.post('/api/teacher/sessions/schedule', async (req, res) => {
  const { teacherId, courseId, title, description, scheduledStart, duration } = req.body;
  try {
    // scheduledStart уже должен быть в ISO формате (UTC)
    // Просто используем его как есть
    const result = await pool.query(
      `INSERT INTO "ScheduledSession" 
       ("teacherId", "courseId", "title", "description", "scheduledStart", "duration", "isActive") 
       VALUES ($1, $2, $3, $4, $5, $6, false) 
       RETURNING *`,
      [teacherId, courseId, title, description, scheduledStart, duration]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка планирования сессии:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// В эндпоинте GET /api/teacher/:teacherId/sessions/scheduled
app.get('/api/teacher/:teacherId/sessions/scheduled', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ss.*, c.title as "courseTitle" 
       FROM "ScheduledSession" ss 
       JOIN "Course" c ON ss."courseId" = c.id 
       WHERE ss."teacherId" = $1 AND ss."isActive" = false
       ORDER BY ss."scheduledStart" ASC`,
      [req.params.teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения запланированных сессий:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получение запланированных сессий для студента (по группе)
 * GET /api/student/:studentId/scheduled-sessions
 */
app.get('/api/student/:studentId/scheduled-sessions', async (req, res) => {
  try {
    // Получаем группу студента
    const studentResult = await pool.query(
      'SELECT "groupId", "group" FROM "Student" WHERE id = $1',
      [req.params.studentId]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Студент не найден' });
    }
    const student = studentResult.rows[0];

    // Ищем запланированные сессии для группы студента
    const result = await pool.query(
      `SELECT ss.*, c.title as "courseTitle", t.name as "teacherName"
       FROM "ScheduledSession" ss
       JOIN "Course" c ON ss."courseId" = c.id
       JOIN "Teacher" t ON ss."teacherId" = t.id
       LEFT JOIN "TeacherGroupSubject" tgs ON tgs."teacherId" = ss."teacherId"
         AND tgs."subjectName" = c.title
       LEFT JOIN "Group" g ON tgs."groupId" = g.id
       WHERE ss."isActive" = false
         AND ss."scheduledStart" >= NOW() - INTERVAL '1 hour'
         AND (
           g.name = $1
           OR $2::integer IS NOT NULL AND tgs."groupId" = $2
         )
       ORDER BY ss."scheduledStart" ASC`,
      [student.group || '', student.groupId || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения запланированных сессий студента:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});












/**
 * Удаление запланированной сессии
 * DELETE /api/teacher/sessions/scheduled/:sessionId
 */
app.delete('/api/teacher/sessions/scheduled/:sessionId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM "ScheduledSession" WHERE id = $1',
      [req.params.sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления запланированной сессии:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Автоматический запуск запланированной сессии
 * POST /api/teacher/sessions/start-scheduled
 */
app.post('/api/teacher/sessions/start-scheduled', async (req, res) => {
  const { sessionId } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Получаем информацию о запланированной сессии
    const scheduled = await client.query(
      'SELECT * FROM "ScheduledSession" WHERE id = $1',
      [sessionId]
    );
    
    if (scheduled.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    const session = scheduled.rows[0];
    
    // Создаем активную сессию
  const activeSession = await client.query(
  'INSERT INTO "Session" ("courseId", "groupId", "subjectName", "isActive", "startTime", "description") VALUES ($1, $2, $3, true, NOW(), $4) RETURNING *',
  [session.courseId, session.groupId || null, session.subjectName || null, session.description || session.title]
);
    
    // Помечаем запланированную сессию как активную (или удаляем)
    await client.query(
      'UPDATE "ScheduledSession" SET "isActive" = true WHERE id = $1',
      [sessionId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      session: activeSession.rows[0],
      message: 'Сессия успешно запущена'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка запуска запланированной сессии:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

















/**
 Получение активных сессий преподавателя
  GET /api/teacher/:teacherId/sessions/active
  Возвращает все активные сессии преподавателя с названиями курсов
  
  Параметры URL: teacherId
  массив объектов Session с полем courseTitle
 */
app.get('/api/teacher/:teacherId/sessions/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.title as "courseTitle" 
       FROM "Session" s 
       JOIN "Course" c ON s."courseId" = c.id 
       WHERE c."teacherId" = $1 AND s."isActive" = true`,
      [req.params.teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
/**
 Получение всех активных сессий
 GET /api/sessions/active
 Возвращает все активные сессии с информацией о курсе и преподавателе
 Используется студентами для просмотра доступных вебинаров
 
 Ответ: массив объектов Session с полями courseTitle и teacherName
 */
app.get('/api/sessions/active', async (req, res) => {
  try {
    // Сначала проверим, есть ли активные сессии
    const checkQuery = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM "Session" WHERE "isActive" = true
      )
    `);
    
    console.log('Есть активные сессии?', checkQuery.rows[0].exists);
    
    const result = await pool.query(
      `SELECT 
        s.id,
        s."courseId",
        s."isActive",
        s."startTime",
        s."endTime",
        s.description,
        s."groupId",
        s."subjectName",
        c.title as "courseTitle",
        t.name as "teacherName" 
       FROM "Session" s 
       JOIN "Course" c ON s."courseId" = c.id 
       JOIN "Teacher" t ON c."teacherId" = t.id 
       WHERE s."isActive" = true
       ORDER BY s."startTime" DESC`
    );
    
    console.log(`Найдено активных сессий: ${result.rows.length}`);
    
    // Если нет активных сессий, вернем пустой массив, а не ошибку
    res.json(result.rows || []);
  } catch (err) {
    console.error('Ошибка получения активных сессий:', err);
    // Возвращаем пустой массив вместо ошибки 500, чтобы UI не ломался
    res.status(200).json([]);
  }
});

/**
 * GET /api/sessions/:sessionId
 * Получение информации о конкретной сессии
 */
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await pool.query(
      `SELECT s.*, c.title as "courseTitle", c.id as "courseId", t.name as "teacherName"
       FROM "Session" s 
       JOIN "Course" c ON s."courseId" = c.id 
       JOIN "Teacher" t ON c."teacherId" = t.id 
       WHERE s.id = $1`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка получения сессии:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
/**
 Завершение сессии
  POST /api/sessions/:sessionId/finish
  Помечает сессию как неактивную и устанавливает время окончания
  
  Параметры URL: sessionId
 обновленный объект Session
 */
app.post('/api/sessions/:sessionId/finish', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE "Session" SET "isActive" = false, "endTime" = NOW() WHERE id = $1 RETURNING *',
      [req.params.sessionId]
    );
    // Закрываем mediasoup комнату
    mediasoupManager.closeRoom(req.params.sessionId);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
  аутентификация студента
  POST /api/student/login
  Вход или регистрация студента по имени и группе
  Если студент не найден - создает нового
  
  Тело запроса: { name, group }
   объект Student
 */
app.post('/api/student/login', async (req, res) => {
  const { name, password, universityId } = req.body;
  console.log('Вход студента:', { name, password: '***', universityId });
  
  try {
    let query = 'SELECT id, "full_name", "group", "groupId", "universityId" FROM "Student" WHERE "full_name" = $1 AND "password" = $2';
    const params = [name, password];
    if (universityId) {
      query += ' AND "universityId" = $3';
      params.push(universityId);
    }
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Неверное имя или пароль' 
      });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});



/**
  Отметка о посещении студентом 
  POST /api/attendance/join
  Регистрирует присоединение студента к сессии
  Если студента нет в БД - создает его   вот это было странно !!!!!!!!!!!!!!!!!!!!!!!
  
  Тело запроса: { studentName, groupName, sessionId }
  Ответ: { success: true, attendance: объект Attendance }
 */
app.post('/api/attendance/join', async (req, res) => {
  const { studentName, groupName, sessionId } = req.body;
  try {
    // Ищем студента по имени и группе
    let studentResult = await pool.query(
      'SELECT id FROM "Student" WHERE "full_name" = $1 AND "group" = $2',
      [studentName, groupName]
    );
    let studentId;
    
    // Если студент не найден - создаем
    if (studentResult.rows.length === 0) {
      const newStudent = await pool.query(
        'INSERT INTO "Student" ("full_name", "group") VALUES ($1, $2) RETURNING id',
        [studentName, groupName]
      );
      studentId = newStudent.rows[0].id;
    } else {
      studentId = studentResult.rows[0].id;
    }

    // Создаем запись о посещении
    const attendance = await pool.query(
      'INSERT INTO "Attendance" ("studentId", "sessionId") VALUES ($1, $2) RETURNING *',
      [studentId, sessionId]
    );

    res.json({ success: true, attendance: attendance.rows[0] });
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 История посещений студента 
  GET /api/student/:studentId/history
  Возвращает все сессии, в которых участвовал студент
  
  Параметры URL: studentId
  массив объектов Session 
 */
app.get('/api/student/:studentId/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.title as "courseTitle", t.name as "teacherName" 
       FROM "Attendance" a 
       JOIN "Session" s ON a."sessionId" = s.id 
       JOIN "Course" c ON s."courseId" = c.id 
       JOIN "Teacher" t ON c."teacherId" = t.id 
       WHERE a."studentId" = $1 
       ORDER BY a."joinTime" DESC`,
      [req.params.studentId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
  Получение сообщений сессии 
  GET /api/messages/:sessionId
 Возвращает все сообщения чата для указанной сессии
  
  Параметры URL: sessionId
  Ответ: массив объектов Message с полем senderName
 */
app.get('/api/messages/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.*, 
        CASE 
          WHEN m."senderType" = 'teacher' THEN t.name 
          WHEN m."senderType" = 'student' THEN s."full_name" 
        END as "senderName" 
       FROM "Message" m 
       LEFT JOIN "Teacher" t ON m."senderId" = t.id AND m."senderType" = 'teacher' 
       LEFT JOIN "Student" s ON m."senderId" = s.id AND m."senderType" = 'student' 
       WHERE m."sessionId" = $1 
       ORDER BY m."timestamp" ASC`,
      [sessionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения сообщений:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 Загрузка аудиозаписи
  POST /api/audio/upload
  Загружает аудиофайл с вебинара и сохраняет метаданные в БД
  Использует multer middleware для обработки файла
  После сохранения оповещает всех участников сессии через WebSocket
  
  Тело запроса (multipart/form-data):
    - audio: файл
    - sessionId: ID сессии
    - teacherId: ID преподавателя
    - title: название (опционально)
    - description: описание (опционально)
    - duration: длительность (опционально)
  объект с созданной записью
 */
app.post('/api/audio/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const { 
      sessionId, 
      teacherId, 
      title, 
      description, 
      duration,
      transcription,
      timedTranscription,
      timings
    } = req.body;
    
    console.log('Загрузка аудио:', {
      sessionId,
      teacherId,
      title,
      duration,
      fileName: req.file.filename,
      fileSize: req.file.size,
      timingsType: typeof timings,
      timingsValue: timings ? timings.substring(0, 100) : 'null'
    });
    
    const filePath = `/uploads/audio/${req.file.filename}`;
    const fileSize = req.file.size;
    const durationNum = parseInt(duration) || 0;
    const teacherIdNum = parseInt(teacherId);
    const sessionIdNum = sessionId ? parseInt(sessionId) : null;
    
    // Парсим timings только если это строка и не пустая
    let timingsData = null;
    if (timings && timings !== 'undefined' && timings !== 'null' && timings !== '') {
      try {
        // Если timings уже объект, используем его
        if (typeof timings === 'object') {
          timingsData = timings;
        } else {
          timingsData = JSON.parse(timings);
        }
        console.log('Timings parsed successfully, length:', Array.isArray(timingsData) ? timingsData.length : 'object');
      } catch(e) {
        console.error('Ошибка парсинга timings:', e.message);
        timingsData = null; // Если ошибка, сохраняем null
      }
    }
    
    // Сохраняем в базу данных - без timings поля если есть проблемы
    let result;
    try {
      result = await pool.query(
        `INSERT INTO "AudioRecording" 
         ("sessionId", "teacherId", "fileName", "filePath", "fileSize", 
          "duration", "title", "description", "transcription", 
          "timedTranscription", "type", "createdAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
         RETURNING *`,
        [
          sessionIdNum, 
          teacherIdNum, 
          req.file.filename, 
          filePath, 
          fileSize, 
          durationNum, 
          title || 'Без названия', 
          description || '', 
          transcription || '',
          timedTranscription || '',
          'audio'
        ]
      );
    } catch(dbErr) {
      console.error('Ошибка БД:', dbErr);
      throw dbErr;
    }

    // Отправляем уведомление через WebSocket
    if (sessionIdNum && io) {
      const roomName = `session_${sessionIdNum}`;
      io.to(roomName).emit('audio_recording_added', {
        recording: result.rows[0],
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      recording: result.rows[0],
      message: 'Аудиозапись успешно сохранена'
    });
  } catch (err) {
    console.error('Ошибка загрузки аудио:', err);
    // Удаляем файл если была ошибка
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Файл удален:', req.file.path);
      } catch(e) {
        console.error('Ошибка удаления файла:', e);
      }
    }
    res.status(500).json({ 
      error: 'Ошибка сохранения аудиозаписи',
      details: err.message
    });
  }
});
/**
 Получение аудиозаписей лекции
  GET /api/audio/session/:sessionId
  Возвращает все аудиозаписи для указанной сессии
  
  Параметры URL: sessionId
  Ответ: массив объектов AudioRecording с полем teacherName
 */
app.get('/api/audio/session/:sessionId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, t.name as "teacherName" 
       FROM "AudioRecording" ar 
       LEFT JOIN "Teacher" t ON ar."teacherId" = t.id 
       WHERE ar."sessionId" = $1 
       ORDER BY ar."createdAt" DESC`,
      [req.params.sessionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения аудиозаписей:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /**
//  Получение конкретной аудио!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! тут не работает 
//   GET /api/audio/:recordingId
//   Возвращает данные конкретной аудиозаписи по ID
  
//   Параметры URL: recordingId
//   Ответ: объект AudioRecording с полем teacherName или 404
//  */
// app.get('/api/audio/:recordingId', async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT ar.*, t.name as "teacherName" 
//        FROM "AudioRecording" ar 
//        LEFT JOIN "Teacher" t ON ar."teacherId" = t.id 
//        WHERE ar.id = $1`,
//       [req.params.recordingId]
//     );
//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Аудиозапись не найдена' });
//     }
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error('Ошибка получения аудиозаписи:', err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

/**
 Удаление аудиозаписи
  DELETE /api/audio/:recordingId
  Удаляет запись из БД и соответствующий файл с диска
  
  Параметры URL: recordingId
  Ответ: { success: true, message: 'Аудиозапись удалена' } или 404
 */
app.delete('/api/audio/:recordingId', async (req, res) => {
  try {
    // Сначала получаем информацию о записи
    const result = await pool.query(
      'SELECT * FROM "AudioRecording" WHERE id = $1',
      [req.params.recordingId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Аудиозапись не найдена' });
    }

    const recording = result.rows[0];
    const filePath = path.join(audioDir, recording.fileName); // Полный путь к файлу
    
    // Удаляем файл с диска, если существует
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Удаляем запись из БД
    await pool.query('DELETE FROM "AudioRecording" WHERE id = $1', [req.params.recordingId]);

    res.json({ success: true, message: 'Аудиозапись удалена' });
  } catch (err) {
    console.error('Ошибка удаления аудиозаписи:', err);
    res.status(500).json({ error: 'Ошибка удаления аудиозаписи' });
  }
});


/**
  Получение аудиозаписи преподавтеля
  GET /api/audio/teacher/:teacherId
  Возвращает все аудиозаписи преподавателя с информацией о сессии и курсе
  
  Параметры URL: teacherId
  Ответ: массив объектов AudioRecording с полями sessionDate и courseTitle
 */
app.get('/api/audio/teacher/:teacherId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ar.*, 
        s."startTime" as "sessionDate",
        s."teacher_comment" as "sessionComment",  
        c.title as "courseTitle",
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', m.id,
            'originalName', m."originalName",
            'filePath', m."filePath",
            'fileSize', m."fileSize",
            'fileType', m."fileType",
            'description', m."description",
            'createdAt', m."createdAt"
          )), '[]'::json)
          FROM "LectureMaterial" m
          WHERE m."sessionId" = ar."sessionId"
        ) as materials
       FROM "AudioRecording" ar 
       LEFT JOIN "Session" s ON ar."sessionId" = s.id 
       LEFT JOIN "Course" c ON s."courseId" = c.id 
       WHERE ar."teacherId" = $1 
       ORDER BY ar."createdAt" DESC`,
      [req.params.teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения аудиозаписей преподавателя:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
/**
  Транскрибация аудио
  POST /api/audio/:recordingId/transcribe
  Отправляет аудиофайл на сервер Whisper для распознавания речи
  Сохраняет полученный текст в БД
  
  Параметры URL: recordingId
  Ответ: { success: true, text, wordCount, processingTime } или ошибка
 */
app.post('/api/audio/:recordingId/transcribe', async (req, res) => {
  const { recordingId } = req.params;
  try {
    console.log('Начинаем транскрибирование записи ID:', recordingId);
    
    // Получаем информацию о записи из БД
    const recResult = await pool.query(
      'SELECT "fileName" FROM "AudioRecording" WHERE id = $1',
      [recordingId]
    );
    if (recResult.rows.length === 0) {
      console.log('Запись ID', recordingId, 'не найдена в БД');
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const { fileName } = recResult.rows[0];
    const filePath = path.join(__dirname, 'uploads', 'audio', fileName); // Полный путь к файлу

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.log('Файл не найден на диске:', filePath);
      return res.status(404).json({ error: 'Аудиофайл не найден' });
    }

    console.log('Отправляем файл в Whisper:', fileName);
    
    // Формируем multipart/form-data запрос
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: fileName
    });

    const startTime = Date.now(); // Засекаем время начала

    // Отправляем запрос к локальному серверу Whisper (порт 5000)
    const response = await axios.post('http://localhost:5000/transcribe', formData, {
      headers: formData.getHeaders(),
      timeout: 300000 // Таймаут 5 минут (для длинных аудио)!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    });

    const processingTime = Date.now() - startTime; // Вычисляем время обработки

    // Если получили текст, сохраняем в БД
    if (response.data?.text) {
      const transcriptionText = response.data.text.trim();
      const wordCount = transcriptionText.split(/\s+/).length; // Подсчет слов
      
      await pool.query(
        `UPDATE "AudioRecording" 
         SET "transcription" = $1,
             "lastEditedAt" = NOW()
         WHERE id = $2`,
        [transcriptionText, recordingId]
      );
      
      console.log('Транскрипция сохранена в БД. Слов:', wordCount);
      
      res.json({
        success: true,
        text: transcriptionText,
        wordCount: wordCount,
        processingTime: processingTime
      });
    } else {
      throw new Error('Whisper вернул пустой результат');
    }
  } catch (err) {
    console.error('Ошибка транскрибирования:', err.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка транскрибирования',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * Транскрибация фрагмента аудио (для реального времени)
 * POST /api/audio/transcribe-chunk
 */
app.post('/api/audio/transcribe-chunk', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    console.log('Фрагмент:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const filePath = req.file.path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'Файл не найден' });
    }

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: req.file.filename,
      contentType: req.file.mimetype
    });

    const response = await axios.post('http://localhost:5000/transcribe-chunk', formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    // Удаляем файл
    fs.unlinkSync(filePath);

    if (response.data?.text) {
      res.json({
        success: true,
        text: response.data.text.trim(),
        processingTime: response.data.processing_time
      });
    } else {
      res.json({ success: true, text: '' });
    }
  } catch (err) {
    console.error(' Ошибка:', err.message);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Ошибка транскрибации',
      details: err.message
    });
  }
});
/**
 * Улучшение текста через AI 
 * POST /api/enhance-transcription
 */
app.post('/api/enhance-transcription', async (req, res) => {
    try {
        const { text, action, recordingId } = req.body;
        
        if (!text) return res.status(400).json({ error: 'Текст не предоставлен' });
        
        console.log('Улучшение текста:', { action, length: text.length, recordingId });
        
        // Определяем целевое поле на основе action
        let targetField = 'transcription';
        if (action === 'summary') targetField = 'aiSummary';
        else if (action === 'bullet_points') targetField = 'aiBulletPoints';
        else if (action === 'structure') targetField = 'aiStructure';
        else if (action === 'questions') targetField = 'aiQuestions';
        
        // Отправляем запрос на Flask сервер
        const response = await axios.post('http://localhost:5000/summarize', {
            text: text,
            action: action,
            customPrompt: req.body.customPrompt || ''
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });
        
        if (response.data && response.data.success) {
            const improvedText = response.data.summary || '';
            
            // Если указан recordingId, сохраняем в соответствующее поле
            if (recordingId && recordingId !== 'undefined' && !isNaN(parseInt(recordingId))) {
                const recordingIdNum = parseInt(recordingId);
                
                // Обновляем основную запись в AudioRecording
                // Проверяем существует ли колонка
                const columnCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'AudioRecording' AND column_name = $1
                    );
                `, [targetField]);
                
                if (columnCheck.rows[0].exists) {
                    await pool.query(
                        `UPDATE "AudioRecording" 
                         SET "${targetField}" = $1, "lastEditedAt" = NOW() 
                         WHERE id = $2`,
                        [improvedText, recordingIdNum]
                    );
                    console.log(`Обновлено поле ${targetField} для записи ${recordingIdNum}`);
                } else {
                    // Если колонки нет, обновляем transcription
                    await pool.query(
                        `UPDATE "AudioRecording" 
                         SET "transcription" = $1, "lastEditedAt" = NOW() 
                         WHERE id = $2`,
                        [improvedText, recordingIdNum]
                    );
                    console.log(`Обновлено поле transcription для записи ${recordingIdNum}`);
                }
                
                // Пытаемся сохранить версию, если таблица существует
                try {
                    const tableCheck = await pool.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'Transcription'
                        );
                    `);
                    
                    if (tableCheck.rows[0].exists) {
                        // Получаем максимальную версию
                        const maxVersionResult = await pool.query(
                            `SELECT COALESCE(MAX(version), 0) as maxVersion 
                             FROM "Transcription" 
                             WHERE "recordingId" = $1`,
                            [recordingIdNum]
                        );
                        
                        const newVersion = (maxVersionResult.rows[0].maxVersion || 0) + 1;
                        
                        // Безопасный подсчет слов и символов
                        let wordCount = 0;
                        let charCount = 0;
                        
                        if (improvedText && improvedText.trim()) {
                            const words = improvedText.trim().split(/\s+/).filter(word => word && word.length > 0);
                            wordCount = words.length;
                            charCount = improvedText.length;
                        }
                        
                        // Сохраняем новую версию (без fieldName для совместимости)
                        await pool.query(
                            `INSERT INTO "Transcription" 
                             ("recordingId", "finalText", "currentText", 
                              "version", "action", "wordCount", "charCount", "lastUpdate") 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                            [recordingIdNum, improvedText, improvedText, newVersion, action, wordCount, charCount]
                        );
                        
                        console.log(`Создана версия ${newVersion} для записи ${recordingIdNum}`);
                    }
                } catch (versionErr) {
                    console.error('Ошибка сохранения версии (не критично):', versionErr.message);
                    // Продолжаем выполнение, даже если версия не сохранилась
                }
                
                res.json({
                    success: true,
                    text: improvedText,
                    action: action,
                    recordingId: recordingIdNum,
                    fieldName: targetField,
                    processingTime: response.data.processing_time,
                    message: `Текст успешно улучшен`
                });
            } else {
                res.json({
                    success: true,
                    text: improvedText,
                    action: action,
                    processingTime: response.data.processing_time
                });
            }
        } else {
            res.status(500).json({ 
                success: false, 
                error: response.data.error || 'Ошибка улучшения текста' 
            });
        }
    } catch (err) {
        console.error('Ошибка улучшения текста:', err.message);
        res.status(500).json({
            success: false,
            error: 'Ошибка улучшения текста',
            details: err.message
        });
    }
});
// /**
//  * Обновление конкретного поля аудиозаписи
//  * PATCH /api/audio/:recordingId
//  */
// app.patch('/api/audio/:recordingId', async (req, res) => {
//     const { recordingId } = req.params;
//     const updates = req.body;
    
//     try {
//         const allowedFields = ['transcription', 'timedTranscription', 'aiSummary', 'aiBulletPoints', 'aiStructure', 'aiQuestions'];
//         const updateFields = [];
//         const values = [];
//         let paramIndex = 1;
        
//         // Собираем поля для обновления
//         for (const [key, value] of Object.entries(updates)) {
//             if (allowedFields.includes(key)) {
//                 updateFields.push(`"${key}" = $${paramIndex}`);
//                 values.push(value);
//                 paramIndex++;
//             }
//         }
        
//         if (updateFields.length === 0) {
//             return res.status(400).json({ error: 'Нет допустимых полей для обновления' });
//         }
        
//         values.push(recordingId);
//         updateFields.push(`"lastEditedAt" = NOW()`);
        
//         const query = `
//             UPDATE "AudioRecording" 
//             SET ${updateFields.join(', ')} 
//             WHERE id = $${paramIndex} 
//             RETURNING *
//         `;
        
//         const result = await pool.query(query, values);
        
//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Запись не найдена' });
//         }
        
//         // СОЗДАЕМ ВЕРСИИ ДЛЯ КАЖДОГО ИЗМЕНЕННОГО ПОЛЯ
//         const recording = result.rows[0];
        
//         // Проверяем существование таблицы Transcription
//         const tableCheck = await pool.query(`
//             SELECT EXISTS (
//                 SELECT FROM information_schema.tables 
//                 WHERE table_name = 'Transcription'
//             );
//         `);
        
//         if (tableCheck.rows[0].exists) {
//             for (const [fieldName, content] of Object.entries(updates)) {
//                 if (allowedFields.includes(fieldName)) {
//                     // Получаем текущую максимальную версию для этого поля
//                     const maxVersionResult = await pool.query(
//                         `SELECT COALESCE(MAX(version), 0) as maxVersion 
//                          FROM "Transcription" 
//                          WHERE "recordingId" = $1 AND "fieldName" = $2`,
//                         [recordingId, fieldName]
//                     );
                    
//                     const newVersion = maxVersionResult.rows[0].maxVersion + 1;
                    
//                     // Подсчет слов и символов
//                     const wordCount = content ? content.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
//                     const charCount = content ? content.length : 0;
                    
//                     // Сохраняем новую версию
//                     await pool.query(
//                         `INSERT INTO "Transcription" 
//                          ("recordingId", "fieldName", "currentText", "finalText", 
//                           "version", "action", "wordCount", "charCount", "lastUpdate") 
//                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
//                         [recordingId, fieldName, content, content, newVersion, 'manual_edit', wordCount, charCount]
//                     );
                    
//                     console.log(`Создана версия ${newVersion} для поля ${fieldName} записи ${recordingId}`);
//                 }
//             }
//         }
        
//         res.json({
//             success: true,
//             recording: recording,
//             message: 'Обновлено успешно'
//         });
//     } catch (err) {
//         console.error('Ошибка обновления:', err);
//         res.status(500).json({ error: 'Ошибка сервера' });
//     }
// });











































/**
 * ПОЛУЧЕНИЕ ВСЕХ ВЕРСИЙ ДЛЯ КОНКРЕТНОГО ПОЛЯ
 * GET /api/audio/:recordingId/versions/:fieldName
 * 
 * fieldName может быть: transcription, timedTranscription, aiSummary, aiBulletPoints, aiStructure, aiQuestions
 */
app.get('/api/audio/:recordingId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ar.*, t.name as "teacherName" 
             FROM "AudioRecording" ar 
             LEFT JOIN "Teacher" t ON ar."teacherId" = t.id 
             WHERE ar.id = $1`,
            [req.params.recordingId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Аудиозапись не найдена' });
        }
        
        const recording = result.rows[0];
        
        // Получаем информацию о последних версиях для каждого поля
        const versionsInfo = await pool.query(
            `SELECT DISTINCT ON ("fieldName") 
                "fieldName", version, "lastUpdate"
             FROM "Transcription" 
             WHERE "recordingId" = $1
             ORDER BY "fieldName", version DESC`,
            [req.params.recordingId]
        );
        
        recording.versionsInfo = {};
        versionsInfo.rows.forEach(row => {
            recording.versionsInfo[row.fieldName] = {
                latestVersion: row.version,
                lastUpdate: row.lastUpdate
            };
        });
        
        res.json(recording);
    } catch (err) {
        console.error('Ошибка получения аудиозаписи:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * ВОССТАНОВЛЕНИЕ ВЕРСИИ
 * POST /api/audio/:recordingId/restore-version
 * 
 * Тело: { fieldName, versionId }
 */
app.post('/api/audio/:recordingId/restore-version', async (req, res) => {
    const { recordingId } = req.params;
    const { fieldName, versionId } = req.body;
    
    // Проверяем допустимые имена полей
    const allowedFields = ['transcription', 'timedTranscription', 'aiSummary', 'aiBulletPoints', 'aiStructure', 'aiQuestions'];
    if (!allowedFields.includes(fieldName)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Недопустимое имя поля' 
        });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Находим версию для восстановления
        const versionResult = await client.query(
            `SELECT * FROM "Transcription" 
             WHERE id = $1 AND "recordingId" = $2 AND "fieldName" = $3`,
            [versionId, recordingId, fieldName]
        );
        
        if (versionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                error: 'Версия не найдена' 
            });
        }
        
        const version = versionResult.rows[0];
        const contentToRestore = version.currentText || version.finalText;
        
        // Обновляем основную запись в AudioRecording
        await client.query(
            `UPDATE "AudioRecording" 
             SET "${fieldName}" = $1, "lastEditedAt" = NOW() 
             WHERE id = $2`,
            [contentToRestore, recordingId]
        );
        
        // Создаем новую версию (как восстановление)
        const maxVersionResult = await client.query(
            `SELECT COALESCE(MAX(version), 0) as maxVersion 
             FROM "Transcription" 
             WHERE "recordingId" = $1 AND "fieldName" = $2`,
            [recordingId, fieldName]
        );
        
        const newVersion = maxVersionResult.rows[0].maxVersion + 1;
        
        // Подсчет слов и символов
        const wordCount = contentToRestore.trim().split(/\s+/).filter(word => word.length > 0).length;
        const charCount = contentToRestore.length;
        
        // Сохраняем новую версию
        await client.query(
            `INSERT INTO "Transcription" 
             ("recordingId", "fieldName", "currentText", "finalText", 
              "version", "action", "wordCount", "charCount", "lastUpdate", "restoredFromVersion") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
            [recordingId, fieldName, contentToRestore, contentToRestore, 
             newVersion, 'restore', wordCount, charCount, version.version]
        );
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `Восстановлена версия ${version.version}`,
            restoredContent: contentToRestore,
            newVersion: newVersion
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка восстановления версии:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка восстановления версии' 
        });
    } finally {
        client.release();
    }
});

/**
 * ОБНОВЛЕНИЕ ПОЛЯ С СОЗДАНИЕМ ВЕРСИИ
 * PATCH /api/audio/:recordingId
 * 
 * Обновленный эндпоинт, который автоматически создает версию при изменении
 */
app.patch('/api/audio/:recordingId', async (req, res) => {
    const recordingId = parseInt(req.params.recordingId, 10);
    const updates = req.body;

    if (isNaN(recordingId)) {
        return res.status(400).json({ error: 'Некорректный ID записи' });
    }
    
    try {
        const allowedFields = ['transcription', 'timedTranscription', 'aiSummary', 'aiBulletPoints', 'aiStructure', 'aiQuestions'];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`"${key}" = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Нет допустимых полей для обновления' });
        }
        
        values.push(recordingId);
        updateFields.push(`"lastEditedAt" = NOW()`);
        
        const query = `
            UPDATE "AudioRecording" 
            SET ${updateFields.join(', ')} 
            WHERE id = $${paramIndex} 
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }
        
        res.json({
            success: true,
            recording: result.rows[0],
            message: 'Обновлено успешно'
        });
    } catch (err) {
        console.error('Ошибка обновления:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ВЕРСИЯХ (статистика)
 * GET /api/audio/:recordingId/versions-info
 * 
 * Возвращает количество версий для каждого поля
 */
app.get('/api/audio/:recordingId/versions-info', async (req, res) => {
     const recordingId = parseInt(req.params.recordingId, 10);
    
    if (isNaN(recordingId)) {
        return res.status(400).json({ error: 'Некорректный ID записи' });
    }
    
    try {
        const result = await pool.query(
            `SELECT "fieldName", COUNT(*) as versionCount, MAX(version) as latestVersion
             FROM "Transcription" 
             WHERE "recordingId" = $1
             GROUP BY "fieldName"`,
            [recordingId]
        );
        
        const info = {};
        result.rows.forEach(row => {
            info[row.fieldName] = {
                count: parseInt(row.versionCount),
                latestVersion: parseInt(row.latestVersion)
            };
        });
        
        res.json({
            success: true,
            versionsInfo: info
        });
    } catch (err) {
        console.error('Ошибка получения информации о версиях:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});













/**
 * Получение всех версий транскрипции для записи
 * GET /api/audio/:recordingId/versions
 */
app.get('/api/audio/:recordingId/versions', async (req, res) => {
    const { recordingId } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM "Transcription" 
             WHERE "recordingId" = $1 
             ORDER BY version DESC`,
            [recordingId]
        );
        
        res.json({
            success: true,
            versions: result.rows
        });
    } catch (err) {
        console.error('Ошибка получения версий:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Сохранение новой версии конспекта
 * POST /api/audio/:recordingId/versions
 */
app.post('/api/audio/:recordingId/versions', async (req, res) => {
    const { recordingId } = req.params;
    const { content, action, sessionId, teacherId } = req.body;
    
    try {
        // Получаем максимальную версию
        const maxVersionResult = await pool.query(
            `SELECT COALESCE(MAX(version), 0) as maxVersion 
             FROM "Transcription" 
             WHERE "recordingId" = $1`,
            [recordingId]
        );
        
        const newVersion = maxVersionResult.rows[0].maxVersion + 1;
        
        // Подсчет слов и символов
        const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
        const charCount = content.length;
        
        // Сохраняем новую версию
        const result = await pool.query(
            `INSERT INTO "Transcription" 
             ("recordingId", "sessionId", "teacherId", "finalText", "currentText", 
              "status", "version", "action", "wordCount", "charCount", "lastUpdate") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
             RETURNING *`,
            [recordingId, sessionId, teacherId, content, content, 'final', newVersion, action, wordCount, charCount]
        );
        
        // Обновляем основную запись в AudioRecording
        await pool.query(
            `UPDATE "AudioRecording" 
             SET "transcription" = $1, "lastEditedAt" = NOW() 
             WHERE id = $2`,
            [content, recordingId]
        );
        
        res.json({
            success: true,
            version: result.rows[0],
            message: `Версия ${newVersion} сохранена`
        });
        
    } catch (err) {
        console.error('Ошибка сохранения версии:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// /**
//  * Получение конкретной версии
//  * GET /api/audio/:recordingId/versions/:version
//  */
// app.get('/api/audio/:recordingId/versions/:version', async (req, res) => {
//     const { recordingId, version } = req.params;
//     try {
//         const result = await pool.query(
//             `SELECT * FROM "Transcription" 
//              WHERE "recordingId" = $1 AND version = $2`,
//             [recordingId, version]
//         );
        
//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Версия не найдена' });
//         }
        
//         res.json({
//             success: true,
//             version: result.rows[0]
//         });
//     } catch (err) {
//         console.error('Ошибка получения версии:', err);
//         res.status(500).json({ error: 'Ошибка сервера' });
//     }
// });

/**
 * Регистрация преподавателя
 * POST /api/teacher/register
 * Проверяет, не существует ли уже преподаватель с таким email
 */
app.post('/api/teacher/register', async (req, res) => {
  const { name, email, universityId } = req.body;
  console.log('Регистрация преподавателя:', { name, email, universityId });
  
  try {
    // Проверяем, существует ли уже преподаватель с таким email в этом вузе
    const existingTeacher = await pool.query(
      'SELECT * FROM "Teacher" WHERE email = $1',
      [email]
    );
    
    if (existingTeacher.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Преподаватель с таким email уже зарегистрирован' 
      });
    }
    
    // Если не существует, создаем нового
    const result = await pool.query(
      'INSERT INTO "Teacher" (name, email, "universityId") VALUES ($1, $2, $3) RETURNING *',
      [name, email, universityId || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка регистрации преподавателя:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Регистрация студента
 * POST /api/student/register
 */
app.post('/api/student/register', async (req, res) => {
  const { name, groupId, groupName, password, universityId } = req.body;
  console.log('Регистрация студента:', { name, groupId, groupName, password: '***', universityId });
  
  try {
    // Проверяем существование студента в этой группе
    const existingStudent = await pool.query(
      'SELECT * FROM "Student" WHERE "full_name" = $1 AND "groupId" = $2',
      [name, groupId]
    );
    
    if (existingStudent.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Студент с таким именем уже зарегистрирован в этой группе' 
      });
    }
    
    // Создаем студента
    const result = await pool.query(
      'INSERT INTO "Student" ("full_name", "group", "groupId", "password", "universityId") VALUES ($1, $2, $3, $4, $5) RETURNING id, "full_name", "group", "groupId", "universityId"',
      [name, groupName, groupId, password, universityId || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка регистрации студента:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Получение всех групп
 * GET /api/groups
 */
app.get('/api/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM "Group" ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения групп:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получение транскрипции для редактирования
 * GET /api/audio/:recordingId/transcription/edit
 */
app.get('/api/audio/:recordingId/transcription/edit', async (req, res) => {
  try {
    const { recordingId } = req.params;
    console.log('Запрос транскрипции для редактирования ID:', recordingId);
    
    // Получаем данные из AudioRecording
    const result = await pool.query(
      `SELECT ar.id, ar."transcription", ar.title, ar.description, ar."createdAt", 
              ar.duration, ar."fileSize", ar."filePath", ar."sessionId", ar."teacherId",
              t.name as "teacherName" 
       FROM "AudioRecording" ar 
       LEFT JOIN "Teacher" t ON ar."teacherId" = t.id 
       WHERE ar.id = $1`,
      [recordingId]
    );
    
    if (result.rows.length === 0) {
      console.log('Запись ID', recordingId, 'не найдена');
      return res.status(404).json({ 
        success: false,
        error: 'Запись не найдена' 
      });
    }

    const recording = result.rows[0];
    console.log('Транскрипция найдена, длина:', (recording.transcription || '').length, 'символов');

    res.json({
      id: recording.id,
      transcription: recording.transcription || '',
      title: recording.title || 'Без названия',
      description: recording.description || '',
      createdAt: recording.createdAt,
      duration: recording.duration,
      fileSize: recording.fileSize,
      filePath: recording.filePath,
      teacherName: recording.teacherName,
      sessionId: recording.sessionId,
      teacherId: recording.teacherId
    });
  } catch (err) {
    console.error('Ошибка получения транскрипции:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении транскрипции',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * Получение всех версий транскрипции для записи
 * GET /api/audio/:recordingId/versions
 */
app.get('/api/audio/:recordingId/versions', async (req, res) => {
  const { recordingId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM "Transcription" 
       WHERE "recordingId" = $1 
       ORDER BY version DESC`,
      [recordingId]
    );
    
    res.json({
      success: true,
      versions: result.rows
    });
  } catch (err) {
    console.error('Ошибка получения версий:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Получение конкретной версии
 * GET /api/audio/:recordingId/versions/:version
 */
app.get('/api/audio/:recordingId/versions/:version', async (req, res) => {
  const { recordingId, version } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM "Transcription" 
       WHERE "recordingId" = $1 AND version = $2`,
      [recordingId, version]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Версия не найдена' });
    }
    
    res.json({
      success: true,
      version: result.rows[0]
    });
  } catch (err) {
    console.error('Ошибка получения версии:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


/**
 * Загрузка видеозаписи
 * POST /api/video/upload
 * Загружает видеофайл с вебинара и сохраняет метаданные в БД
 * Использует multer middleware для обработки файла
 */
app.post('/api/video/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const { 
      sessionId, teacherId, title, description, duration, 
      type, transcription, timed_transcription, timings 
    } = req.body;

    // Конвертация строк в числа
    const durationNum = parseInt(duration, 10) || 0;
    const fileSizeNum = req.file.size || 0;

    // Парсинг JSON-строки timings
    let timingsParsed = null;
    if (timings && typeof timings === 'string') {
      try { timingsParsed = JSON.parse(timings); } catch (e) {}
    }

    const filePath = `/uploads/audio/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO "AudioRecording" 
       ("sessionId", "teacherId", "fileName", "filePath", "fileSize", "duration", "title", "description", "transcription", "timedTranscription", "timings", "type") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [
        sessionId, teacherId, req.file.filename, filePath,
        fileSizeNum, durationNum, title, description,
        transcription || '', timed_transcription || null,
        timingsParsed, type || 'video'
      ]
    );

    if (sessionId) {
      io.to(`session_${sessionId}`).emit('video_recording_added', {
        recording: result.rows[0],
        timestamp: new Date()
      });
    }

    res.json({ success: true, recording: result.rows[0] });

  } catch (err) {
    console.error('Ошибка загрузки видео:', err);
    res.status(500).json({ 
      error: 'Ошибка сохранения',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});



app.get('/api/teacher/:teacherId/sessions/completed', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const result = await db.query(
      `SELECT 
        s.id,
        s.course_id,
        s.description,
        s.start_time,
        s.end_time,
        s.status,
        c.title as course_title,
        s.subject_name,
        g.name as group_name
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN groups g ON s.group_id = g.id
       WHERE s.teacher_id = $1 
        AND s.status = 'finished'
       ORDER BY s.start_time DESC`,
      [teacherId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения завершённых сессий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.get('/api/session/:sessionId/missed-students', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await db.query(
      `SELECT s.group_id, g.name as group_name, c.title as course_title 
       FROM sessions s
       LEFT JOIN groups g ON s.group_id = g.id
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1`,
      [sessionId]
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    const groupId = session.rows[0].group_id;
    const groupName = session.rows[0].group_name;
    
    const allStudents = await db.query(
      `SELECT id, full_name, group_name as group 
       FROM students 
       WHERE group_name = $1`,
      [groupName]
    );
    
    const attendedStudents = await db.query(
      `SELECT DISTINCT student_name 
       FROM attendance 
       WHERE session_id = $1`,
      [sessionId]
    );
    
    const attendedNames = new Set(attendedStudents.rows.map(a => a.student_name));
    
    const missedStudents = allStudents.rows.filter(
      student => !attendedNames.has(student.full_name)
    );
    
    const result = missedStudents.map(student => ({
      ...student,
      totalStudents: allStudents.rows.length,
      sessionDate: session.rows[0].start_time,
      courseTitle: session.rows[0].course_title
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка получения пропустивших студентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Сохранение транскрипции
 * PUT /api/audio/:recordingId/transcription/edit
 */
app.put('/api/audio/:recordingId/transcription/edit', async (req, res) => {
  const { recordingId } = req.params;
  const { transcription, sessionId, teacherId } = req.body;
  
  console.log('Сохранение транскрипции для записи ID:', recordingId);
  
  if (transcription === undefined || transcription === null) {
    return res.status(400).json({
      success: false,
      error: 'Текст транскрипции обязателен'
    });
  }
  
  try {
    // Получаем максимальную версию
    const maxVersionResult = await pool.query(
      `SELECT COALESCE(MAX(version), 0) as maxVersion 
       FROM "Transcription" 
       WHERE "recordingId" = $1`,
      [recordingId]
    );
    
    const newVersion = maxVersionResult.rows[0].maxVersion + 1;
    
    // Подсчет слов и символов с проверкой
    let wordCount = 0;
    let charCount = 0;
    
    if (transcription && transcription.trim()) {
      const words = transcription.trim().split(/\s+/).filter(word => word && word.length > 0);
      wordCount = words.length;
      charCount = transcription.length;
    }
    
    // Убеждаемся, что значения - числа
    wordCount = isNaN(wordCount) ? 0 : wordCount;
    charCount = isNaN(charCount) ? 0 : charCount;
    
    // Сохраняем новую версию в таблицу Transcription
    await pool.query(
      `INSERT INTO "Transcription" 
       ("recordingId", "sessionId", "teacherId", "finalText", "currentText", 
        "status", "version", "action", "wordCount", "charCount", "lastUpdate") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [recordingId, sessionId || null, teacherId || null, transcription, transcription, 'final', newVersion, 'manual_edit', wordCount, charCount]
    );
    
    // Обновляем основную запись в AudioRecording
    const updateResult = await pool.query(
      `UPDATE "AudioRecording" 
       SET "transcription" = $1, "lastEditedAt" = NOW() 
       WHERE id = $2 
       RETURNING id, "transcription", "lastEditedAt"`,
      [transcription, recordingId]
    );
    
    console.log(`Конспект сохранен как версия ${newVersion} для записи ID:`, recordingId);
    
    res.json({
      success: true,
      recording: updateResult.rows[0],
      version: newVersion,
      message: `Конспект успешно сохранен (версия ${newVersion})`
    });
    
  } catch (err) {
    console.error('Ошибка сохранения:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при сохранении конспекта',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});





app.get('/api/teacher/:teacherId/sessions/completed/count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM "Session" s
       JOIN "Course" c ON s."courseId" = c.id
       WHERE c."teacherId" = $1 
         AND s."isActive" = false 
         AND s."endTime" IS NOT NULL`,
      [req.params.teacherId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Ошибка получения статистики:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 GET /api/debug/audio/:id
 Возвращает данные из таблицы AudioRecording для отладки
 */
app.get('/api/debug/audio/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "AudioRecording" WHERE id = $1', [req.params.id]);
    res.json({
      exists: result.rows.length > 0,
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
  GET /api/test/transcription
  Тестовый эндпоинт для проверки работы с транскрипциями
  Возвращает первые 5 записей
 */
app.get('/api/test/transcription', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title FROM "AudioRecording" LIMIT 5');
    res.json({
      success: true,
      recordings: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Состояния WebSocket
/**
 activeConnections: Map всех активных WebSocket соединений
  Ключ: socket.id, Значение: объект с информацией о подключении
 */
const activeConnections = new Map();

/**
 sessionRooms: Map комнат сессий
  Ключ: имя комнаты (session_{sessionId}), Значение: Set из socket.id
 */
const sessionRooms = new Map();

/**
  sessionParticipants: Map участников сессий с детальной информацией
  Ключ: имя комнаты (session_{sessionId}), Значение: Map с информацией об участниках
 */
const sessionParticipants = new Map();

// Обработчики WebSockets
/**
  Обработчик нового WebSocket подключения
  Регистрирует соединение и настраивает все обработчики событий
 */
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);
  
  // Регистрируем новое соединение в activeConnections
  activeConnections.set(socket.id, {
    socketId: socket.id,
    connectedAt: new Date(),
    room: null,
    sessionId: null,
    userType: null,
    userId: null,
    userName: null
  });

  // ═══════════════════════════════════════════════════════════════
  // MEDIASOUP SFU — обработчики
  // ═══════════════════════════════════════════════════════════════

  // Получить RTP capabilities роутера для сессии
  socket.on('ms-get-rtp-capabilities', async ({ sessionId }, callback) => {
    try {
      const room = await mediasoupManager.getOrCreateRoom(sessionId);
      callback({ rtpCapabilities: room.router.rtpCapabilities });
    } catch (err) {
      console.error('ms-get-rtp-capabilities error:', err.message);
      callback({ error: err.message });
    }
  });

  // Клиент сообщает свои RTP capabilities
  socket.on('ms-set-rtp-capabilities', ({ sessionId, rtpCapabilities }) => {
    mediasoupManager.setRtpCapabilities(sessionId, socket.id, rtpCapabilities);
  });

  // Создать WebRTC транспорт (send или recv)
  socket.on('ms-create-transport', async ({ sessionId, direction }, callback) => {
    try {
      console.log(`[ms-create-transport] socket=${socket.id} direction=${direction} session=${sessionId}`);
      const data = await mediasoupManager.createWebRtcTransport(sessionId, socket.id, direction);
      console.log(`[ms-create-transport] SUCCESS id=${data.id}`);
      callback(data);
    } catch (err) {
      console.error('ms-create-transport error:', err.message);
      callback({ error: err.message });
    }
  });

  // Подключить транспорт (DTLS handshake)
  socket.on('ms-connect-transport', async ({ sessionId, transportId, dtlsParameters }, callback) => {
    try {
      console.log(`[ms-connect-transport] socket=${socket.id} transport=${transportId}`);
      await mediasoupManager.connectTransport(sessionId, socket.id, transportId, dtlsParameters);
      console.log(`[ms-connect-transport] SUCCESS`);
      callback({});
    } catch (err) {
      console.error('ms-connect-transport error:', err.message);
      callback({ error: err.message });
    }
  });

  // Начать отправку медиа (produce)
  socket.on('ms-produce', async ({ sessionId, transportId, kind, rtpParameters, appData }, callback) => {
    try {
      console.log(`[ms-produce] socket=${socket.id} kind=${kind} label=${appData?.label} transport=${transportId}`);
      const { id } = await mediasoupManager.produce(sessionId, socket.id, transportId, kind, rtpParameters, appData);
      console.log(`[ms-produce] SUCCESS producerId=${id}`);
      callback({ id });

      // Уведомляем всех в комнате о новом producer
      const roomName = `session_${sessionId}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      console.log(`[ms-produce] Broadcasting ms-new-producer to room ${roomName}, members: ${room ? room.size : 0}`);
      socket.to(roomName).emit('ms-new-producer', {
        producerId: id,
        socketId: socket.id,
        kind,
        appData,
      });
    } catch (err) {
      console.error('ms-produce error:', err.message);
      callback({ error: err.message });
    }
  });

  // Подписаться на чужой producer (consume)
  socket.on('ms-consume', async ({ sessionId, transportId, producerId }, callback) => {
    try {
      const data = await mediasoupManager.consume(sessionId, socket.id, transportId, producerId);
      callback(data);
    } catch (err) {
      console.error('ms-consume error:', err.message);
      callback({ error: err.message });
    }
  });

  // Resume consumer (после создания consumer на паузе)
  socket.on('ms-resume-consumer', async ({ sessionId, consumerId }, callback) => {
    try {
      await mediasoupManager.resumeConsumer(sessionId, socket.id, consumerId);
      callback({});
    } catch (err) {
      console.error('ms-resume-consumer error:', err.message);
      callback({ error: err.message });
    }
  });

  // Поставить producer на паузу
  socket.on('ms-pause-producer', async ({ sessionId, producerId }) => {
    await mediasoupManager.pauseProducer(sessionId, socket.id, producerId);
    const roomName = `session_${sessionId}`;
    socket.to(roomName).emit('ms-producer-paused', { producerId, socketId: socket.id });
  });

  // Снять producer с паузы
  socket.on('ms-resume-producer', async ({ sessionId, producerId }) => {
    await mediasoupManager.resumeProducer(sessionId, socket.id, producerId);
    const roomName = `session_${sessionId}`;
    socket.to(roomName).emit('ms-producer-resumed', { producerId, socketId: socket.id });
  });

  // Закрыть producer
  socket.on('ms-close-producer', async ({ sessionId, producerId }) => {
    await mediasoupManager.closeProducer(sessionId, socket.id, producerId);
    const roomName = `session_${sessionId}`;
    socket.to(roomName).emit('ms-producer-closed', { producerId, socketId: socket.id });
  });

  // Получить список всех producers в комнате (для нового участника)
  socket.on('ms-get-producers', async ({ sessionId }, callback) => {
    try {
      const producers = mediasoupManager.getProducers(sessionId, socket.id);
      callback(producers);
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // КОНЕЦ MEDIASOUP
  // ═══════════════════════════════════════════════════════════════

  // Демонстрация экрана
  /**
   Событие: teacher_start_screen_share
   Преподаватель начинает демонстрацию экрана для всех студентов
    
    Данные: { sessionId, streamType }
   */
  socket.on('teacher_start_screen_share', ({ sessionId, streamType = 'teacher_to_all' }) => {
    const teacherInfo = activeConnections.get(socket.id);
    
  
    
    // Проверяем соответствие сессии
    if (teacherInfo.sessionId != sessionId) {
      socket.emit('error', { message: 'Несоответствие сессии' });
      return;
    }
    
    // Оповещаем всех в комнате о начале трансляции
    const roomName = `session_${sessionId}`;
    io.to(roomName).emit('teacher_screen_share_started', {
      teacherSocketId: socket.id,
      teacherName: teacherInfo.userName,
      timestamp: new Date(),
      streamType
    });
  });

  /**
   Событие: teacher_send_offer_to_students
   Преподаватель отправляет WebRTC offer выбранным студентам
    Используется для установки P2P соединения для демонстрации экрана
    
    Данные: { sessionId, studentSocketIds, sdp }
   */
  socket.on('teacher_send_offer_to_students', ({ sessionId, studentSocketIds, sdp }) => {
    // ОТКЛЮЧЕНО — mediasoup SFU обрабатывает трансляцию преподавателя
    console.log('[P2P DISABLED] teacher_send_offer_to_students — используется mediasoup');
  });

  /**
   Событие: teacher_request_student_screen
   Преподаватель запрашивает демонстрацию экрана конкретного студента
   
   Данные: { sessionId, studentSocketId }
   */
  socket.on('teacher_request_student_screen', ({ sessionId, studentSocketId }) => {
    const teacherInfo = activeConnections.get(socket.id);
    
    
    if (!teacherInfo || teacherInfo.userType !== 'teacher') {
      socket.emit('error', { message: 'Тип не определился' });
      return;
    }
    
    // Проверяем соответствие сессии
    if (teacherInfo.sessionId != sessionId) {
      socket.emit('error', { message: 'Несоответствие сессии' });
      return;
    }

    const roomName = `session_${sessionId}`;
    const participantsMap = sessionParticipants.get(roomName);
    const studentInfo = participantsMap?.get(studentSocketId);

    // Проверяем существование студента в сессии
    if (!studentInfo || studentInfo.userType !== 'student') {
      socket.emit('error', { message: 'Студент не найден или не подключен к сессии' });
      return;
    }

    const studentConnection = activeConnections.get(studentSocketId);
    if (!studentConnection || studentConnection.sessionId != sessionId) {
      socket.emit('error', { message: 'Студент не в текущей сессии' });
      return;
    }

    // Отправляем запрос студенту
    const studentSocket = io.sockets.sockets.get(studentSocketId);
    if (studentSocket) {
      studentSocket.emit('teacher_requested_student_screen', {
        teacherSocketId: socket.id,
        teacherName: teacherInfo.userName,
        sessionId,
        requestId: uuidv4().slice(0, 8) // Уникальный ID запроса
      });
      
      // Подтверждаем преподавателю, что запрос отправлен
      socket.emit('screen_request_sent', {
        studentSocketId,
        studentName: studentInfo.userName,
        timestamp: new Date()
      });
    } else {
      socket.emit('error', { message: 'Студент не в сети' });
    }
  });

  /**
   Обработки WebRTC
   Эти события используются для обмена SDP (Session Description Protocol)
   и ICE кандидатами для установки P2P соединения
   */

  /**
   Событие: webrtc_offer
   Отправка WebRTC offer другому участнику
   */
  socket.on('webrtc_offer', ({ to, sdp, streamType, sessionId }) => {
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('webrtc_offer', { from: socket.id, sdp, streamType, sessionId });
    }
  });

  /**
   Событие: student_webrtc_offer
   Студент отправляет offer преподавателю (для демонстрации своего экрана)
   */
  socket.on('student_webrtc_offer', ({ to, sdp, streamType, sessionId }) => {
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('student_webrtc_offer', { from: socket.id, sdp, streamType, sessionId });
    }
  });

  /**
   Событие: webrtc_answer
   Ответ на полученный offer
   */
  socket.on('webrtc_answer', ({ to, sdp }) => {
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('webrtc_answer', { from: socket.id, sdp });
    }
  });

  /**
   Событие: webrtc_ice_candidate
   Обмен ICE кандидатами для установки соединения через NAT
   */
  socket.on('webrtc_ice_candidate', ({ to, candidate }) => {
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('webrtc_ice_candidate', { from: socket.id, candidate });
    }
  });

  /**
   Событие: stop_screen_share
   Остановка демонстрации экрана (преподавателем или студентом)
   
   Данные: { sessionId, streamType, targetSocketId, requestId }
   */
  socket.on('stop_screen_share', ({ sessionId, streamType, targetSocketId, requestId }) => {
    const roomName = `session_${sessionId}`;
    
    if (streamType === 'teacher_to_all') {
      // Преподаватель останавливает трансляцию для всех
      io.to(roomName).emit('teacher_screen_share_stopped', {
        teacherSocketId: socket.id,
        timestamp: new Date()
      });
    } else if (streamType === 'student_to_teacher' && targetSocketId) {
      // Студент останавливает трансляцию для преподавателя
      const teacherSocket = io.sockets.sockets.get(targetSocketId);
      if (teacherSocket) {
        teacherSocket.emit('student_screen_share_stopped', {
          studentSocketId: socket.id,
          requestId,
          timestamp: new Date()
        });
      }
    } else if (streamType === 'student_screen_share' && targetSocketId) {
      // Преподаватель прекращает просмотр экрана студента
      const studentSocket = io.sockets.sockets.get(targetSocketId);
      if (studentSocket) {
        studentSocket.emit('teacher_stopped_watching', {
          teacherSocketId: socket.id,
          timestamp: new Date()
        });
      }
    }
  });

  /**
   участие в вебинаре
   */

  /**
    Событие: join_webinar
    Подключение пользователя (преподавателя или студента) к вебинару
    Обрабатывает:
   Добавление в комнату
   Обновление списка участников
   Оповещение других участников
   Обработку переподключений
    
    Данные: { sessionId, userType, userId, userName }
   */
  socket.on('join_webinar', async (data) => {
    const { sessionId, userType, userId, userName } = data;
    const roomName = `session_${sessionId}`;

    console.log('=== JOIN WEBINAR ===');
    console.log('Socket ID:', socket.id);
    console.log('Data:', { sessionId, userType, userId, userName });
    console.log('Активные комнаты до:', Array.from(sessionParticipants.keys()));

    // Создаем Map для участников, если его еще нет
    if (!sessionParticipants.has(roomName)) {
      sessionParticipants.set(roomName, new Map());
    }

    const participantsMap = sessionParticipants.get(roomName);
    
    // Проверяем, не было ли у пользователя другого подключения (переподключение)
    let existingSocketId = null;
    for (const [sockId, participant] of participantsMap.entries()) {
      if (participant.userId === userId && participant.userType === userType) {
        existingSocketId = sockId;
        break;
      }
    }

    // Если есть существующее подключение, удаляем его
    if (existingSocketId && existingSocketId !== socket.id) {
      console.log(`Пользователь ${userName} (${userType}) переподключается: ${existingSocketId} -> ${socket.id}`);
      
      participantsMap.delete(existingSocketId);
      
      // Оповещаем других об уходе старого подключения
      io.to(roomName).emit('user_left', {
        userType,
        userName,
        socketId: existingSocketId,
        timestamp: new Date(),
        reason: 'reconnected'
      });
      
      // Обновляем список участников
      const updatedParticipants = Array.from(participantsMap.values());
      io.to(roomName).emit('participants_list', updatedParticipants);
    }

    // Добавляем новое подключение
    participantsMap.set(socket.id, {
      userType,
      userId,
      userName,
      socketId: socket.id,
      joinedAt: new Date(),
      isReconnect: !!existingSocketId
    });

    // Обновляем информацию в activeConnections
    activeConnections.set(socket.id, {
      ...activeConnections.get(socket.id),
      sessionId: sessionId,
      userType,
      userId,
      userName,
      room: roomName,
      joinedAt: new Date(),
      isReconnect: !!existingSocketId
    });

    // Добавляем сокет в комнату
    socket.join(roomName);

    // Добавляем в sessionRooms
    if (!sessionRooms.has(roomName)) {
      sessionRooms.set(roomName, new Set());
    }
    sessionRooms.get(roomName).add(socket.id);

    // Отправляем всем обновленный список участников
    const roomParticipants = Array.from(participantsMap.values());
    io.to(roomName).emit('participants_list', roomParticipants);

    // Если это не переподключение, оповещаем других о новом участнике
    if (!existingSocketId) {
      socket.to(roomName).emit('user_joined', {
        userType,
        userName,
        userId,
        socketId: socket.id,
        timestamp: new Date()
      });
    }

    // Специфичная логика для преподавателей и студентов
    if (userType === 'teacher') {
      // Отправляем преподавателю список студентов для мониторинга
      const students = roomParticipants.filter(p => p.userType === 'student');
      socket.emit('students_for_monitoring', students);
    }

    if (userType === 'student') {
      // Сообщаем студенту, если преподаватель уже в комнате
      const teacher = roomParticipants.find(p => p.userType === 'teacher');
      if (teacher) {
        socket.emit('teacher_present', {
          teacherName: teacher.userName,
          teacherSocketId: teacher.socketId
        });
      }
    }

    console.log(`Пользователь ${userName} (${userType}) подключился к сессии ${sessionId}. Всего участников: ${roomParticipants.length}`);
    console.log('Участники в комнате:', roomParticipants.map(p => ({
      name: p.userName,
      type: p.userType,
      socketId: p.socketId
    })));
  });

  /**
    Событие: leave_webinar
    Пользователь покидает вебинар
   Удаляет из всех структур данных и оповещает других
    
    Данные: { sessionId }
   */
  socket.on('leave_webinar', ({ sessionId }) => {
    const connectionInfo = activeConnections.get(socket.id);
    if (!connectionInfo) return;
    
    const { userType, userName, room } = connectionInfo;
    
    console.log(`Пользователь ${userName} (${userType}) покидает вебинар`);
    
    // Удаляем из комнаты, если есть
    if (room && sessionRooms.has(room)) {
      sessionRooms.get(room).delete(socket.id);
      
      if (sessionParticipants.has(room)) {
        const participantsMap = sessionParticipants.get(room);
        participantsMap.delete(socket.id);
        
        const roomParticipants = Array.from(participantsMap.values());
        
        // Оповещаем всех об изменении
        io.to(room).emit('participants_list', roomParticipants);
        io.to(room).emit('user_left', {
          userType,
          userName,
          socketId: socket.id,
          timestamp: new Date()
        });
        
        // Если комната опустела - удаляем её
        if (roomParticipants.length === 0) {
          sessionParticipants.delete(room);
          sessionRooms.delete(room);
        }
      }
    }
    
    activeConnections.delete(socket.id);
    socket.leave(room);
  });

  /**
   Событие: get_participants_list
    Запрос актуального списка участников сессии
    
    Данные: { sessionId }
   */
  socket.on('get_participants_list', ({ sessionId }) => {
    console.log('=== GET PARTICIPANTS LIST ===');
    console.log('Socket ID:', socket.id);
    console.log('Session ID:', sessionId);
    
    const roomName = `session_${sessionId}`;
    console.log('Room name:', roomName);
    console.log('Есть ли комната?', sessionParticipants.has(roomName));
    
    if (sessionParticipants.has(roomName)) {
      const participantsMap = sessionParticipants.get(roomName);
      const roomParticipants = Array.from(participantsMap.values());
      console.log('Участники:', roomParticipants.map(p => ({
        name: p.userName,
        type: p.userType,
        socketId: p.socketId
      })));
      socket.emit('participants_list', roomParticipants);
    } else {
      console.log('Комната не найдена, отправляем пустой список');
      socket.emit('participants_list', []);
    }
  });

  /**
   Событие: send_message
   Отправка сообщения в чат сессии
   Сохраняет сообщение в БД и рассылает всем участникам
    
    Данные: { sessionId, message, senderType, senderId, senderName }
   */
  socket.on('send_message', async (data) => {
    const { sessionId, message, senderType, senderId, senderName } = data;
    const timestamp = new Date();
    
    try {
      // Сохраняем в БД
      await pool.query(
        'INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES ($1, $2, $3, $4, $5)',
        [sessionId, senderType, senderId, message, timestamp]
      );

      // Рассылаем всем в комнате
      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('new_message', {
        text: message,
        senderType,
        senderName,
        senderId,
        timestamp
      });
    } catch (err) {
      console.error('Ошибка сохранения сообщения:', err);
      socket.emit('message_error', { error: 'Не удалось отправить сообщение' });
    }
  });
/**
   * Событие: send_lecture_comment
   * Преподаватель отправляет комментарий к лекции
   * Сохраняет в БД и рассылает всем студентам в реальном времени
   * 
   * Данные: { sessionId, comment, teacherId, teacherName }
   */
  socket.on('send_lecture_comment', async ({ sessionId, comment, teacherId, teacherName }) => {
    try {
      // Проверяем наличие колонок
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'Session' AND column_name = 'teacher_comment'
        );
      `);
      
      if (!columnCheck.rows[0].exists) {
        await pool.query(`
          ALTER TABLE "Session" 
          ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT,
          ADD COLUMN IF NOT EXISTS "comment_updated_at" TIMESTAMP,
          ADD COLUMN IF NOT EXISTS "comment_teacher_id" INTEGER
        `);
      }
      
      // Сохраняем в БД
      const result = await pool.query(
        `UPDATE "Session" 
         SET "teacher_comment" = $1, 
             "comment_updated_at" = NOW(),
             "comment_teacher_id" = $2
         WHERE id = $3 
         RETURNING "teacher_comment", "comment_updated_at"`,
        [comment, teacherId, sessionId]
      );
      
      // Рассылаем всем в комнате сессии
      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('lecture_comment_updated', {
        sessionId,
        comment: result.rows[0].teacher_comment,
        updatedAt: result.rows[0].comment_updated_at,
        teacherId,
        teacherName
      });
      
      // Подтверждение отправителю
      socket.emit('comment_saved', { 
        success: true, 
        message: 'Комментарий сохранен и отправлен студентам' 
      });
      
      console.log(`Комментарий сохранен для сессии ${sessionId} преподавателем ${teacherName}`);
    } catch (err) {
      console.error('Ошибка сохранения комментария:', err);
      socket.emit('comment_error', { 
        error: 'Не удалось сохранить комментарий',
        details: err.message 
      });
    }
  });
  /**
   Событие: start_recording
   Уведомление о начале записи аудио
   Рассылается всем участникам сессии
    
    Данные: { sessionId, teacherId, teacherName }
   */
  socket.on('start_recording', ({ sessionId, teacherId, teacherName }) => {
    const roomName = `session_${sessionId}`;
    io.to(roomName).emit('recording_started', {
      teacherId,
      teacherName,
      timestamp: new Date()
    });
  });

  /**
   Событие: stop_recording
   Уведомление об остановке записи аудио
   Рассылается всем участникам сессии
    
   Данные: { sessionId, teacherId, teacherName }
   */
  socket.on('stop_recording', ({ sessionId, teacherId, teacherName }) => {
    const roomName = `session_${sessionId}`;
    io.to(roomName).emit('recording_stopped', {
      teacherId,
      teacherName,
      timestamp: new Date()
    });
  });

  /**
   Событие: student_activity не получилось внедрить !!!!!!!!!!!!!!!!!
   Отслеживание активности студента (например, отвлекся ли он)
    
   Данные: { sessionId, activity }
   */
  // socket.on('student_activity', ({ sessionId, activity }) => {
  //   const studentInfo = activeConnections.get(socket.id);
  //   if (studentInfo && studentInfo.userType === 'student') {
  //     const roomName = `session_${sessionId}`;
  //     socket.to(roomName).emit('student_activity_update', {
  //       studentId: studentInfo.userId,
  //       studentName: studentInfo.userName,
  //       activity,
  //       timestamp: new Date()
  //     });
  //   }
  // });

  /**
   * Событие: disconnect
   * Обработка отключения клиента
   * Очищает все структуры данных и оповещает других
   * 
   * Данные: reason - причина отключения
   */
  socket.on('disconnect', (reason) => {
    const connectionInfo = activeConnections.get(socket.id);
    if (connectionInfo) {
      const { sessionId, userType, userName, room } = connectionInfo;
      
      console.log(`Пользователь отключился: ${userName} (${userType}), причина: ${reason}`);

      // Очистка mediasoup peer
      if (sessionId) {
        mediasoupManager.removePeer(sessionId, socket.id);
      }
      
      // Удаляем из всех структур данных
      if (room) {
        if (sessionRooms.has(room)) {
          sessionRooms.get(room).delete(socket.id);
        }
        
        if (sessionParticipants.has(room)) {
          const participantsMap = sessionParticipants.get(room);
          participantsMap.delete(socket.id);
          
          const roomParticipants = Array.from(participantsMap.values());
          io.to(room).emit('participants_list', roomParticipants);
          
          io.to(room).emit('user_left', {
            userType,
            userName,
            socketId: socket.id,
            timestamp: new Date(),
            reason: reason
          });
          
          // Если комната опустела - удаляем
          if (roomParticipants.length === 0) {
            sessionParticipants.delete(room);
            sessionRooms.delete(room);
          }
        }
      }
      
      activeConnections.delete(socket.id);
    }
  });




// Преподаватель начал трансляцию видео
socket.on('teacher_start_video_broadcast', ({ sessionId, teacherId, teacherName }) => {
  const roomName = `session_${sessionId}`;
  io.to(roomName).emit('teacher_video_started', {
    teacherSocketId: socket.id,
    teacherName,
    timestamp: new Date()
  });
});

// Преподаватель остановил трансляцию видео
socket.on('teacher_stop_video_broadcast', ({ sessionId }) => {
  const roomName = `session_${sessionId}`;
  io.to(roomName).emit('teacher_video_stopped', {
    teacherSocketId: socket.id,
    timestamp: new Date()
  });
});

// Студент включает видео
socket.on('student_start_video', ({ sessionId, to, studentId, studentName }) => {
  const teacherSocket = io.sockets.sockets.get(to);
  if (teacherSocket) {
    teacherSocket.emit('student_video_started', {
      studentSocketId: socket.id,
      studentName,
      studentId
    });
  }
});

// Студент выключает видео
socket.on('student_stop_video', ({ sessionId, to }) => {
  const teacherSocket = io.sockets.sockets.get(to);
  if (teacherSocket) {
    teacherSocket.emit('student_video_stopped', {
      studentSocketId: socket.id
    });
  }
});

/**
 * Событие: kick_student
 * Преподаватель выгоняет студента из вебинара
 * 
 * Данные: { sessionId, studentSocketId, studentName }
 */
socket.on('kick_student', ({ sessionId, studentSocketId, studentName }) => {
  const teacherInfo = activeConnections.get(socket.id);
  
  // Проверяем, что запрос от преподавателя
  if (!teacherInfo || teacherInfo.userType !== 'teacher') {
    socket.emit('error', { message: 'Только преподаватель может выгонять студентов' });
    return;
  }
  
  // Проверяем соответствие сессии
  if (teacherInfo.sessionId != sessionId) {
    socket.emit('error', { message: 'Несоответствие сессии' });
    return;
  }
  
  const roomName = `session_${sessionId}`;
  
  // Находим студента
  const studentSocket = io.sockets.sockets.get(studentSocketId);
  if (studentSocket) {
    // Отправляем студенту событие о принудительном выходе
    studentSocket.emit('kicked_from_webinar', {
      reason: 'Преподаватель удалил вас из вебинара',
      teacherName: teacherInfo.userName,
      timestamp: new Date()
    });
    
    // Отключаем студента от комнаты
    studentSocket.leave(roomName);
    
    // Оповещаем всех в комнате
    io.to(roomName).emit('user_kicked', {
      studentName: studentName,
      teacherName: teacherInfo.userName,
      timestamp: new Date()
    });
    
    // Очищаем данные студента из структур
    if (sessionParticipants.has(roomName)) {
      const participantsMap = sessionParticipants.get(roomName);
      participantsMap.delete(studentSocketId);
      
      const roomParticipants = Array.from(participantsMap.values());
      io.to(roomName).emit('participants_list', roomParticipants);
    }
    
    activeConnections.delete(studentSocketId);
    
    console.log(`Студент ${studentName} (${studentSocketId}) выгнан преподавателем ${teacherInfo.userName} из сессии ${sessionId}`);
  } else {
    socket.emit('error', { message: 'Студент не найден' });
  }
});


// Оффер видео от преподавателя к студенту
socket.on('teacher_video_offer', ({ sessionId, studentSocketId, sdp }) => {
  const studentSocket = io.sockets.sockets.get(studentSocketId);
  if (studentSocket) {
    studentSocket.emit('teacher_video_offer', {
      from: socket.id,
      sdp,
      sessionId
    });
  }
});

// Оффер видео от студента к преподавателю
socket.on('student_video_offer', ({ to, sdp, sessionId }) => {
  const teacherSocket = io.sockets.sockets.get(to);
  if (teacherSocket) {
    teacherSocket.emit('student_video_offer', {
      from: socket.id,
      sdp,
      sessionId
    });
  }
});
  // ========== НОВЫЕ ОБРАБОТЧИКИ ДЛЯ ТРАНСЛЯЦИИ ЗАПИСЕЙ ==========
  
  // Запрос студента на получение материалов записи
  socket.on('student_request_recording_materials', async ({ recordingSessionId, studentSocketId }) => {
    try {
      console.log(`[Socket] Student requested materials for recording session: ${recordingSessionId}`);
      
      const materialsResult = await pool.query(
        `SELECT * FROM "LectureMaterial" WHERE "sessionId" = $1`,
        [recordingSessionId]
      );
      
      const commentResult = await pool.query(
        `SELECT "teacher_comment" as comment FROM "Session" WHERE id = $1`,
        [recordingSessionId]
      );
      
      const targetSocket = studentSocketId || socket.id;
      io.to(targetSocket).emit('recording_materials_response', {
        recordingSessionId,
        materials: materialsResult.rows || [],
        comment: commentResult.rows[0]?.comment || ''
      });
      
      console.log(`[Socket] Sent materials for session ${recordingSessionId}`);
    } catch (err) {
      console.error('Error fetching recording materials:', err);
      const targetSocket = studentSocketId || socket.id;
      io.to(targetSocket).emit('recording_materials_response', {
        recordingSessionId,
        materials: [],
        comment: '',
        error: err.message
      });
    }
  });

  // Преподаватель начал трансляцию записи
  socket.on('teacher_start_playback_broadcast', ({ sessionId, recordingSessionId, recordingTitle, recordingId, recordingType }) => {
    console.log(`[Socket] Teacher started playback broadcast: ${recordingTitle}`);
    const roomName = `session_${sessionId}`;
    socket.to(roomName).emit('teacher_start_playback_broadcast', {
      recordingSessionId,
      recordingTitle,
      recordingId,
      recordingType
    });
  });

  // Преподаватель остановил трансляцию записи
  socket.on('teacher_stop_playback_broadcast', ({ sessionId }) => {
    console.log(`[Socket] Teacher stopped playback broadcast for session ${sessionId}`);
    const roomName = `session_${sessionId}`;
    socket.to(roomName).emit('teacher_stop_playback_broadcast', {});
  });

  // ========== КОНЕЦ НОВЫХ ОБРАБОТЧИКОВ ==========


  /**
   * Событие: error
   * Обработка ошибок WebSocket
   */
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// дополнительные http для websocket

/**
 * GET /api/sessions/:sessionId/info
 * Получение информации о сессии: активна ли, сколько участников, есть ли преподаватель
 * Используется для быстрой проверки статуса без подключения к WebSocket
 * 
 * Параметры URL: sessionId
 * Ответ: { sessionId, isActive, participants, teacherOnline }
 */
app.get('/api/sessions/:sessionId/info', (req, res) => {
  const sessionId = req.params.sessionId;
  const roomName = `session_${sessionId}`;
  const info = {
    sessionId,
    isActive: false,
    participants: 0,
    teacherOnline: false
  };
  
  if (sessionParticipants.has(roomName)) {
    const participantsMap = sessionParticipants.get(roomName);
    const roomParticipants = Array.from(participantsMap.values());
    info.isActive = true;
    info.participants = roomParticipants.length;
    info.teacherOnline = roomParticipants.some(p => p.userType === 'teacher');
  }
  
  res.json(info);
});


app.post('/api/sessions/:sessionId/link', async (req, res) => {
  const { sessionId } = req.params;
  const { url, teacherId } = req.body;
  
  try {
    // Проверяем, существует ли сессия
    const sessionCheck = await pool.query(
      'SELECT id FROM "Session" WHERE id = $1',
      [sessionId]
    );
    
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    // Обновляем сессию, добавляя permanent_link (если колонки нет - создадим)
    // Сначала проверим наличие колонки permanent_link
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Session' AND column_name = 'permanent_link'
      );
    `);
    
    if (!columnCheck.rows[0].exists) {
      // Добавляем колонку если её нет
      await pool.query(`
        ALTER TABLE "Session" 
        ADD COLUMN IF NOT EXISTS "permanent_link" TEXT,
        ADD COLUMN IF NOT EXISTS "link_created_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "link_teacher_id" INTEGER
      `);
    }
    
    const result = await pool.query(
      `UPDATE "Session" 
       SET "permanent_link" = $1, 
           "link_created_at" = NOW(),
           "link_teacher_id" = $2
       WHERE id = $3 
       RETURNING *`,
      [url, teacherId, sessionId]
    );
    
    res.json({ 
      success: true, 
      message: 'Ссылка сохранена',
      permanentLink: result.rows[0].permanent_link
    });
  } catch (err) {
    console.error('Ошибка сохранения ссылки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


app.post('/api/sessions/:sessionId/comment', async (req, res) => {
  const { sessionId } = req.params;
  const { comment, teacherId } = req.body;
  
  if (!comment || comment.trim() === '') {
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });
  }
  
  try {
    // Проверяем наличие колонки teacher_comment
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Session' AND column_name = 'teacher_comment'
      );
    `);
    
    if (!columnCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE "Session" 
        ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT,
        ADD COLUMN IF NOT EXISTS "comment_updated_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "comment_teacher_id" INTEGER
      `);
    }
    
    const result = await pool.query(
      `UPDATE "Session" 
       SET "teacher_comment" = $1, 
           "comment_updated_at" = NOW(),
           "comment_teacher_id" = $2
       WHERE id = $3 
       RETURNING *`,
      [comment.trim(), teacherId, sessionId]
    );
    
    // Отправляем уведомление через WebSocket
    const roomName = `session_${sessionId}`;
    io.to(roomName).emit('lecture_comment_updated', {
      sessionId,
      comment: comment.trim(),
      updatedAt: new Date(),
      teacherId
    });
    
    res.json({ 
      success: true, 
      message: 'Комментарий сохранен',
      comment: result.rows[0].teacher_comment
    });
  } catch (err) {
    console.error('Ошибка сохранения комментария:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


// Получение только комментария (для студентов)
app.get('/api/sessions/:sessionId/comment', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT "teacher_comment", "comment_updated_at" FROM "Session" WHERE id = $1',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    res.json({
      comment: result.rows[0].teacher_comment || '',
      updatedAt: result.rows[0].comment_updated_at
    });
  } catch (err) {
    console.error('Ошибка получения комментария:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/sessions/:sessionId/materials', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    // Получаем комментарий из сессии
    const sessionResult = await pool.query(
      `SELECT "teacher_comment", "comment_updated_at" 
       FROM "Session" 
       WHERE id = $1`,
      [sessionId]
    );
    
    // Получаем файлы материалов для этой сессии
    const materialsResult = await pool.query(
      `SELECT id, "fileName", "originalName", "filePath", "fileSize", 
              "fileType", "description", "createdAt", "teacherId"
       FROM "LectureMaterial" 
       WHERE "sessionId" = $1 
       ORDER BY "createdAt" DESC`,
      [sessionId]
    );
    
    // Форматируем файлы для клиента
    const files = materialsResult.rows.map(m => ({
      id: m.id,
      name: m.originalName || m.fileName,
      title: m.originalName || m.fileName,
      fileName: m.fileName,
      filePath: m.filePath,
      url: m.filePath,
      size: m.fileSize,
      type: m.fileType,
      description: m.description || '',
      uploadedAt: m.createdAt,
      uploadedBy: m.teacherId
    }));
    
    res.json({
      files: files,
      comment: sessionResult.rows[0]?.teacher_comment || '',
      commentUpdatedAt: sessionResult.rows[0]?.comment_updated_at || null,
      sessionId: sessionId,
      count: files.length
    });
  } catch (err) {
    console.error('Ошибка получения материалов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});





/**
 * GET /api/server/stats
 * Статистика сервера:
 * - Количество активных соединений
 * - Количество активных сессий
 * - Использование памяти
 * - Количество аудиозаписей в БД
 * 
 *  объект со статистикой
 */
app.get('/api/server/stats', (req, res) => {
  const stats = {
    activeConnections: activeConnections.size,
    activeSessions: sessionParticipants.size,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    audioRecordings: 0
  };

  // Добавляем детальную информацию по сессиям
  stats.sessionParticipants = {};
  for (const [roomName, participantsMap] of sessionParticipants) {
    const sessionId = roomName.replace('session_', '');
    const roomParticipants = Array.from(participantsMap.values());
    stats.sessionParticipants[sessionId] = {
      total: roomParticipants.length,
      teachers: roomParticipants.filter(p => p.userType === 'teacher').length,
      students: roomParticipants.filter(p => p.userType === 'student').length
    };
  }

  // Получаем количество аудиозаписей из БД 
  pool.query('SELECT COUNT(*) FROM "AudioRecording"')
    .then(result => {
      stats.audioRecordings = parseInt(result.rows[0].count);
      res.json(stats);
    })
    .catch(err => {
      console.error('Ошибка получения статистики:', err);
      res.json(stats);
    });
});

/**
 * GET /api/health
 * Проверка здоровья сервера
 * Возвращает статус всех компонентов
 * 
 * Ответ: { status, timestamp, uptime, database, audioStorage, audioFilesCount }
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    audioStorage: fs.existsSync(audioDir) ? 'available' : 'unavailable',
    audioFilesCount: fs.readdirSync(audioDir).length
  });
});

/**
 * Получение текущих промптов для конспектов
 * GET /api/prompts
 */
app.get('/api/prompts', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:5000/prompts', { timeout: 5000 });
        res.json(response.data);
    } catch (err) {
        console.error('Ошибка получения промптов:', err.message);
        res.status(500).json({ success: false, error: 'Не удалось получить промпты' });
    }
});

/**
 * Обновление промптов для конспектов
 * POST /api/prompts
 * Тело: { summary?, bullet_points?, structure?, questions? }
 */
app.post('/api/prompts', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:5000/prompts', req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        res.json(response.data);
    } catch (err) {
        console.error('Ошибка обновления промптов:', err.message);
        res.status(500).json({ success: false, error: 'Не удалось обновить промпты' });
    }
});

/**
 * Сброс промпта к значению по умолчанию
 * POST /api/prompts/reset
 * Тело: { key: 'summary' | 'bullet_points' | 'structure' | 'questions' }
 */
app.post('/api/prompts/reset', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:5000/prompts/reset', req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        res.json(response.data);
    } catch (err) {
        console.error('Ошибка сброса промпта:', err.message);
        res.status(500).json({ success: false, error: 'Не удалось сбросить промпт' });
    }
});





/**
 * Получение всех групп
 * GET /api/groups
 */
app.get('/api/groups', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "Group" ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения групп:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Создание новой группы
 * POST /api/groups
 */
app.post('/api/groups', async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO "Group" (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name]
        );
        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'Группа уже существует' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка создания группы:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Получение групп и предметов преподавателя
 * GET /api/teacher/:teacherId/groups-subjects
 */
app.get('/api/teacher/:teacherId/groups-subjects', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT tgs.*, g.name as "groupName" 
             FROM "TeacherGroupSubject" tgs
             JOIN "Group" g ON tgs."groupId" = g.id
             WHERE tgs."teacherId" = $1
             ORDER BY g.name, tgs."subjectName"`,
            [req.params.teacherId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения групп преподавателя:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Добавление группы и предмета для преподавателя
 * POST /api/teacher/groups-subjects
 */
app.post('/api/teacher/groups-subjects', async (req, res) => {
    const { teacherId, groupId, subjectName } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO "TeacherGroupSubject" ("teacherId", "groupId", "subjectName")
             VALUES ($1, $2, $3)
             ON CONFLICT ("teacherId", "groupId", "subjectName") DO NOTHING
             RETURNING *`,
            [teacherId, groupId, subjectName]
        );
        
        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'Такая связь уже существует' });
        }
        
        // Получаем название группы для ответа
        const groupResult = await pool.query(
            'SELECT name FROM "Group" WHERE id = $1',
            [groupId]
        );
        
        res.json({
            ...result.rows[0],
            groupName: groupResult.rows[0]?.name
        });
    } catch (err) {
        console.error('Ошибка добавления группы преподавателю:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Удаление группы и предмета преподавателя
 * DELETE /api/teacher/groups-subjects/:id
 */
app.delete('/api/teacher/groups-subjects/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM "TeacherGroupSubject" WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Связь не найдена' });
        }
        
        res.json({ success: true, message: 'Связь удалена' });
    } catch (err) {
        console.error('Ошибка удаления связи:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Получение студентов по группе
 * GET /api/groups/:groupId/students
 */
app.get('/api/groups/:groupId/students', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM "Student" WHERE "groupId" = $1 ORDER BY "full_name"',
            [req.params.groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения студентов группы:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * Создание сессии (вебинара) для нескольких групп
 * POST /api/teacher/sessions/create
 */
app.post('/api/teacher/sessions/create', async (req, res) => {
  const { courseId, description, groupIds, subjectName } = req.body;
  
  console.log('=== СОЗДАНИЕ СЕССИИ ===');
  console.log('Полученные данные:', { courseId, description, groupIds, subjectName });
  
  // Проверяем обязательные поля
  if (!courseId) {
    console.log('Ошибка: нет courseId');
    return res.status(400).json({ error: 'courseId обязателен' });
  }
  
  if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
    console.log('Ошибка: нет groupIds или не массив');
    return res.status(400).json({ error: 'Выберите хотя бы одну группу' });
  }
  
  if (!subjectName) {
    console.log('Ошибка: нет subjectName');
    return res.status(400).json({ error: 'subjectName обязателен' });
  }
  
  try {
    // Проверяем существует ли курс
    const courseCheck = await pool.query(
      'SELECT id FROM "Course" WHERE id = $1',
      [courseId]
    );
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Курс не найден' });
    }
    
    // Получаем groupId первой группы для обратной совместимости
    const firstGroupId = groupIds[0];
    
    // Создаем сессию
    const result = await pool.query(
      `INSERT INTO "Session" 
       ("courseId", "isActive", "startTime", "description", "groupId", "subjectName", "groupIds") 
       VALUES ($1, $2, NOW(), $3, $4, $5, $6) 
       RETURNING *`,
      [courseId, true, description || null, firstGroupId, subjectName, JSON.stringify(groupIds)]
    );
    
    console.log('Сессия создана успешно:', result.rows[0].id);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка создания сессии:', err);
    res.status(500).json({ error: 'Ошибка сервера', details: err.message });
  }
});

/**
 * Получение предметов из сессий преподавателя (запасной вариант)
 * GET /api/teacher/:teacherId/sessions-subjects
 */
app.get('/api/teacher/:teacherId/sessions-subjects', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT sess."subjectName" 
             FROM "Session" sess
             JOIN "Course" c ON sess."courseId" = c.id
             WHERE c."teacherId" = $1 AND sess."subjectName" IS NOT NULL
             ORDER BY sess."subjectName"`,
            [req.params.teacherId]
        );
        
        const subjects = result.rows.map(row => row.subjectName);
        res.json({ subjects });
    } catch (err) {
        console.error('Ошибка получения предметов из сессий:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});








/**
 * Получение всех предметов преподавателя из TeacherGroupSubject
 * GET /api/teacher/:teacherId/subjects
 */
app.get('/api/teacher/:teacherId/subjects', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT "subjectName" 
             FROM "TeacherGroupSubject" 
             WHERE "teacherId" = $1 
             ORDER BY "subjectName"`,
            [req.params.teacherId]
        );
        
        const subjects = result.rows.map(row => row.subjectName);
        res.json({ subjects });
    } catch (err) {
        console.error('Ошибка получения предметов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});







/**
 * Получение всех предметов преподавателя
 * GET /api/teacher/:teacherId/subjects
 */
app.get('/api/teacher/:teacherId/subjects', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT "subjectName" 
             FROM "Session" s
             JOIN "Course" c ON s."courseId" = c.id
             WHERE c."teacherId" = $1 AND "subjectName" IS NOT NULL
             ORDER BY "subjectName"`,
            [req.params.teacherId]
        );
        
        const subjects = result.rows.map(row => row.subjectName);
        res.json({ subjects });
    } catch (err) {
        console.error('Ошибка получения предметов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});





app.get('/api/teacher/:teacherId/attendance/report', async (req, res) => {
  try {
    const { courseId, sessionId, group, studentName, studentId, dateFrom, dateTo, subjectName } = req.query;
    const teacherId = parseInt(req.params.teacherId);

    // 1. Получаем все завершённые сессии преподавателя
    let sessionsQuery = `
      SELECT 
        s.id as "sessionId",
        s."startTime" as "sessionDate",
        s."subjectName" as "subject",
        s."groupId",
        c.id as "courseId",
        c.title as "courseTitle",
        g.name as "groupName"
      FROM "Session" s
      JOIN "Course" c ON s."courseId" = c.id
      JOIN "Group" g ON s."groupId" = g.id
      WHERE c."teacherId" = $1 
        AND s."isActive" = false 
        AND s."endTime" IS NOT NULL
      ORDER BY s."startTime" DESC
    `;

    let sessionsResult = await pool.query(sessionsQuery, [teacherId]);
    let allSessions = sessionsResult.rows;

    // Фильтруем сессии
    if (courseId) allSessions = allSessions.filter(s => s.courseId == courseId);
    if (sessionId) allSessions = allSessions.filter(s => s.sessionId == sessionId);
    if (subjectName) allSessions = allSessions.filter(s => s.subject && s.subject.toLowerCase().includes(subjectName.toLowerCase()));
    if (group) allSessions = allSessions.filter(s => s.groupName && s.groupName.toLowerCase().includes(group.toLowerCase()));
    if (dateFrom) allSessions = allSessions.filter(s => new Date(s.sessionDate) >= new Date(dateFrom));
    if (dateTo) allSessions = allSessions.filter(s => new Date(s.sessionDate) <= new Date(dateTo));

    if (allSessions.length === 0) {
      return res.json({ 
        attendance: [], 
        stats: { totalStudents: 0, totalSessions: 0, averageAttendance: 0, uniqueGroups: 0, uniqueSubjects: 0 } 
      });
    }

    // 2. Получаем всех студентов из групп этих сессий
    const groupIds = [...new Set(allSessions.map(s => s.groupId).filter(Boolean))];

    if (groupIds.length === 0) {
      return res.json({ 
        attendance: [], 
        stats: { totalStudents: 0, totalSessions: 0, averageAttendance: 0, uniqueGroups: 0, uniqueSubjects: 0 },
        warning: 'У сессий не заполнен groupId. Создайте новые сессии с указанием группы.'
      });
    }

    let studentsResult = await pool.query(
      `SELECT s.id as "studentId", s."full_name" as "studentName", s."group", s."groupId", g.name as "groupName"
       FROM "Student" s
       JOIN "Group" g ON s."groupId" = g.id
       WHERE s."groupId" = ANY($1::int[])
       ORDER BY s."full_name"`,
      [groupIds]
    );
    let allStudents = studentsResult.rows;

    if (studentName) allStudents = allStudents.filter(s => s.studentName && s.studentName.toLowerCase().includes(studentName.toLowerCase()));
    if (studentId) allStudents = allStudents.filter(s => s.studentId == studentId);

    // 3. Получаем все посещения
    const sessionIds = allSessions.map(s => s.sessionId);
    const attendanceResult = await pool.query(
      `SELECT "studentId", "sessionId", "joinedAt" as "joinTime" FROM "Attendance" WHERE "sessionId" = ANY($1::int[])`,
      [sessionIds]
    );
    const attendances = attendanceResult.rows;

    // 4. Получаем отметки об ознакомлении
    let reviews = [];
    try {
      const reviewsResult = await pool.query(
        `SELECT "studentId", "sessionId", "hasReviewed", "reviewedAt" FROM "MissedSessionReview" WHERE "sessionId" = ANY($1::int[])`,
        [sessionIds]
      );
      reviews = reviewsResult.rows;
    } catch (err) {
      // таблица может не существовать
    }

    // 5. Формируем отчёт - каждый студент × каждая сессия его группы
    const reportData = [];
    for (const session of allSessions) {
      const studentsInGroup = allStudents.filter(s => s.groupId === session.groupId);
      for (const student of studentsInGroup) {
        const attendance = attendances.find(a => a.studentId === student.studentId && a.sessionId === session.sessionId);
        const review = reviews.find(r => r.studentId === student.studentId && r.sessionId === session.sessionId);
        reportData.push({
          studentId: student.studentId,
          studentName: student.studentName,
          group: student.group,
          groupName: session.groupName,
          sessionId: session.sessionId,
          sessionDate: session.sessionDate,
          courseTitle: session.courseTitle,
          subject: session.subject,
          status: attendance ? 'Присутствовал' : 'Пропустил',
          joinTime: attendance ? attendance.joinTime : null,
          hasReviewed: review ? review.hasReviewed : false,
        });
      }
    }

    // 6. Статистика
    const uniqueStudents = new Set(reportData.map(r => r.studentId));
    const uniqueSessions = new Set(reportData.map(r => r.sessionId));
    const uniqueGroups = new Set(reportData.map(r => r.groupName).filter(Boolean));
    const uniqueSubjects = new Set(reportData.map(r => r.subject).filter(Boolean));
    const presentCount = reportData.filter(r => r.status === 'Присутствовал').length;
    const avgAttendance = reportData.length > 0 ? Math.round((presentCount / reportData.length) * 100) : 0;

    res.json({
      attendance: reportData,
      stats: {
        totalStudents: uniqueStudents.size,
        totalSessions: uniqueSessions.size,
        averageAttendance: avgAttendance,
        uniqueGroups: uniqueGroups.size,
        uniqueSubjects: uniqueSubjects.size,
      }
    });

  } catch (err) {
    console.error('Ошибка получения отчёта:', err);
    res.status(500).json({ error: 'Ошибка сервера', details: err.message });
  }
});

/**
 * Получение статистики посещаемости по группе и предмету
 * GET /api/teacher/:teacherId/attendance/group-stats
 */
app.get('/api/teacher/:teacherId/attendance/group-stats', async (req, res) => {
    try {
        const { groupId, subjectName } = req.query;
        
        let query = `
            SELECT 
                g.name as "groupName",
                sess."subjectName",
                COUNT(DISTINCT s.id) as "totalStudents",
                COUNT(DISTINCT a."studentId") as "attendedStudents",
                COUNT(DISTINCT a."sessionId") as "sessionsCount"
            FROM "TeacherGroupSubject" tgs
            JOIN "Group" g ON tgs."groupId" = g.id
            LEFT JOIN "Student" s ON s."groupId" = g.id
            LEFT JOIN "Session" sess ON sess."groupId" = g.id AND sess."subjectName" = tgs."subjectName"
            LEFT JOIN "Attendance" a ON a."sessionId" = sess.id AND a."studentId" = s.id
            WHERE tgs."teacherId" = $1
        `;
        
        const params = [req.params.teacherId];
        let paramIndex = 2;
        
        if (groupId) {
            query += ` AND tgs."groupId" = $${paramIndex}`;
            params.push(groupId);
            paramIndex++;
        }
        
        if (subjectName) {
            query += ` AND tgs."subjectName" = $${paramIndex}`;
            params.push(subjectName);
            paramIndex++;
        }
        
        query += ` GROUP BY g.id, g.name, sess."subjectName"
                   ORDER BY g.name, sess."subjectName"`;
        
        const result = await pool.query(query, params);
        
        // Добавляем процент посещаемости
        const statsWithPercentage = result.rows.map(row => ({
            ...row,
            attendancePercentage: row.totalStudents > 0 
                ? Math.round((row.attendedStudents / row.totalStudents) * 100) 
                : 0
        }));
        
        res.json(statsWithPercentage);
    } catch (err) {
        console.error('Ошибка получения статистики по группам:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});



/**
 * Получение прошлых занятий для студента
 * GET /api/student/:studentId/past-sessions
 * 
 * Возвращает все завершенные сессии по курсам студента с материалами
 */
app.get('/api/student/:studentId/past-sessions', async (req, res) => {
  const { studentId } = req.params;
  
  try {
    // Получаем информацию о студенте (группу)
    const studentResult = await pool.query(
      `SELECT id, "full_name", "group", "groupId" 
       FROM "Student" 
       WHERE id = $1`,
      [studentId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Студент не найден' });
    }
    
    const student = studentResult.rows[0];
    const groupId = student.groupId;
    
    if (!groupId) {
      return res.json({ 
        sessions: [], 
        count: 0,
        message: 'Студент не привязан к группе' 
      });
    }
    
    // Находим все завершенные сессии группы, где студент присутствовал ИЛИ пропустил
    const sessionsQuery = await pool.query(
      `SELECT 
        s.id,
        s."courseId",
        s."isActive",
        s."startTime",
        s."endTime",
        s."description",
        s."groupId",
        s."subjectName",
        s."teacher_comment",
        s."comment_updated_at",
        c.title as "courseTitle",
        t.name as "teacherName",
        g.name as "groupName",
        CASE 
          WHEN a."studentId" IS NOT NULL THEN 'attended'
          ELSE 'missed'
        END as "attendanceStatus",
        msr."hasReviewed" as "hasReviewed",
        msr."reviewedAt" as "reviewedAt"
      FROM "Session" s
      JOIN "Course" c ON s."courseId" = c.id
      JOIN "Teacher" t ON c."teacherId" = t.id
      JOIN "Group" g ON s."groupId" = g.id
      LEFT JOIN "Attendance" a ON a."sessionId" = s.id AND a."studentId" = $2
      LEFT JOIN "MissedSessionReview" msr ON msr."sessionId" = s.id AND msr."studentId" = $2
      WHERE s."groupId" = $1
        AND s."isActive" = false
        AND s."endTime" IS NOT NULL
      ORDER BY s."startTime" DESC
      LIMIT 50`,
      [groupId, studentId]
    );
    
    // Для каждой сессии получаем записи и материалы
    const sessionsWithMaterials = [];
    
    for (const session of sessionsQuery.rows) {
      // Получаем аудио/видео записи сессии
      const recordingsResult = await pool.query(
        `SELECT id, title, description, filePath, duration, type, 
                transcription, "aiSummary", "aiBulletPoints", "aiStructure",
                createdAt
         FROM "AudioRecording" 
         WHERE "sessionId" = $1
         ORDER BY "createdAt" DESC`,
        [session.id]
      );
      
      // Получаем материалы (файлы) сессии
      const materialsResult = await pool.query(
        `SELECT id, "originalName", "fileName", "filePath", "fileSize", 
                "fileType", description, "createdAt"
         FROM "LectureMaterial" 
         WHERE "sessionId" = $1
         ORDER BY "createdAt" DESC`,
        [session.id]
      );
      
      sessionsWithMaterials.push({
        ...session,
        recordings: recordingsResult.rows,
        materials: materialsResult.rows.map(m => ({
          id: m.id,
          name: m.originalName || m.fileName,
          fileName: m.fileName,
          filePath: m.filePath,
          url: m.filePath,
          size: m.fileSize,
          type: m.fileType,
          description: m.description,
          uploadedAt: m.createdAt
        })),
        comment: session.teacher_comment || '',
        commentUpdatedAt: session.comment_updated_at
      });
    }
    
    res.json({
      success: true,
      sessions: sessionsWithMaterials,
      count: sessionsWithMaterials.length,
      student: {
        id: student.id,
        name: student.full_name,
        group: student.group
      }
    });
  } catch (err) {
    console.error('Ошибка получения прошлых занятий студента:', err);
    res.status(500).json({ error: 'Ошибка сервера', details: err.message });
  }
});
/**
 * Получение материалов конкретной сессии для студента
 * GET /api/student/:studentId/session/:sessionId/materials
 */
app.get('/api/student/:studentId/session/:sessionId/materials', async (req, res) => {
  const { studentId, sessionId } = req.params;
  
  try {
    // Проверяем доступ студента к этой сессии (через группу)
    const accessCheck = await pool.query(
      `SELECT s.id, s."groupId", g.name as "groupName"
       FROM "Session" s
       JOIN "Group" g ON s."groupId" = g.id
       JOIN "Student" st ON st."groupId" = g.id
       WHERE s.id = $1 AND st.id = $2`,
      [sessionId, studentId]
    );
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'У вас нет доступа к этому занятию' 
      });
    }
    
    // Получаем информацию о сессии
    const sessionResult = await pool.query(
      `SELECT s.*, c.title as "courseTitle", t.name as "teacherName"
       FROM "Session" s
       JOIN "Course" c ON s."courseId" = c.id
       JOIN "Teacher" t ON c."teacherId" = t.id
       WHERE s.id = $1`,
      [sessionId]
    );
    
    // Получаем записи
    const recordingsResult = await pool.query(
      `SELECT id, title, description, filePath, duration, type, 
              transcription, "aiSummary", "aiBulletPoints", "aiStructure",
              createdAt
       FROM "AudioRecording" 
       WHERE "sessionId" = $1
       ORDER BY "createdAt" DESC`,
      [sessionId]
    );
    
    // Получаем материалы
    const materialsResult = await pool.query(
      `SELECT id, "originalName", "fileName", "filePath", "fileSize", 
              "fileType", description, "createdAt"
       FROM "LectureMaterial" 
       WHERE "sessionId" = $1
       ORDER BY "createdAt" DESC`,
      [sessionId]
    );
    
    // Проверяем посещал ли студент
    const attendanceResult = await pool.query(
      `SELECT * FROM "Attendance" 
       WHERE "sessionId" = $1 AND "studentId" = $2`,
      [sessionId, studentId]
    );
    
    res.json({
      success: true,
      session: sessionResult.rows[0],
      recordings: recordingsResult.rows,
      materials: materialsResult.rows,
      attended: attendanceResult.rows.length > 0,
      comment: sessionResult.rows[0].teacher_comment || '',
      commentUpdatedAt: sessionResult.rows[0].comment_updated_at
    });
  } catch (err) {
    console.error('Ошибка получения материалов сессии:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
/**
 * Получение аудиозаписей доступных студенту
 * GET /api/audio/student/:studentId
 * Возвращает все аудиозаписи из сессий, которые посетил студент
 * 
 * Параметры URL: studentId
 * Ответ: массив объектов AudioRecording
 */
app.get('/api/audio/student/:studentId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ar.*, 
        s."startTime" as "sessionDate", 
        s."teacher_comment" as "sessionComment",
        c.title as "courseTitle", 
        t.name as "teacherName",
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', m.id,
            'originalName', m."originalName",
            'filePath', m."filePath",
            'fileSize', m."fileSize",
            'fileType', m."fileType",
            'description', m."description",
            'createdAt', m."createdAt"
          )), '[]'::json)
          FROM "LectureMaterial" m
          WHERE m."sessionId" = ar."sessionId"
        ) as materials
       FROM "AudioRecording" ar
       JOIN "Session" s ON ar."sessionId" = s.id
       JOIN "Course" c ON s."courseId" = c.id
       JOIN "Teacher" t ON c."teacherId" = t.id
       JOIN "Attendance" a ON a."sessionId" = s.id
       WHERE a."studentId" = $1
       ORDER BY ar."createdAt" DESC`,
      [req.params.studentId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения записей студента:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// =============================================================
// ADMIN ROUTES
// Вставить в server.js ПЕРЕД строкой app.get('*', ...)
// Требует: npm install bcrypt
// =============================================================

const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// ── Middleware: проверка что запрос от администратора ─────────
const requireAdmin = async (req, res, next) => {
  const adminId = req.headers['x-admin-id'];
  if (!adminId) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const result = await pool.query('SELECT id, is_super, "universityId" FROM "Admin" WHERE id = $1', [adminId]);
    if (result.rows.length === 0) return res.status(403).json({ error: 'Нет прав администратора' });
    req.adminId = parseInt(adminId);
    req.isSuper = result.rows[0].is_super === true;
    req.adminUniversityId = result.rows[0].universityId;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ── Middleware: только главный администратор ──────────────────
const requireSuperAdmin = async (req, res, next) => {
  const adminId = req.headers['x-admin-id'];
  if (!adminId) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const result = await pool.query('SELECT id, is_super, "universityId" FROM "Admin" WHERE id = $1', [adminId]);
    if (result.rows.length === 0) return res.status(403).json({ error: 'Нет прав администратора' });
    if (!result.rows[0].is_super) return res.status(403).json({ error: 'Требуются права главного администратора' });
    req.adminId = parseInt(adminId);
    req.isSuper = true;
    req.adminUniversityId = result.rows[0].universityId;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

/**
 * Получение всех записей по курсу (для выбора записи преподавателем)
 * GET /api/audio/course/:courseId
 */
app.get('/api/audio/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(`[audio/course] Fetching recordings for course ${courseId}`);
    
    const result = await pool.query(
      `SELECT 
        r.id,
        r."sessionId",
        r."teacherId",
        r."fileName",
        r."filePath",
        r."duration",
        r."title",
        r."description",
        r."type",
        r."transcription",
        r."aiSummary",
        r."aiBulletPoints",
        r."aiStructure",
        r."createdAt",
        s."startTime" as "sessionDate",
        c.title as "courseTitle"
      FROM "AudioRecording" r
      LEFT JOIN "Session" s ON r."sessionId" = s.id
      LEFT JOIN "Course" c ON r."courseId" = c.id
      WHERE r."courseId" = $1 OR r."sessionId" IN (SELECT id FROM "Session" WHERE "courseId" = $1)
      ORDER BY r."createdAt" DESC`,
      [courseId]
    );
    
    console.log(`[audio/course] Found ${result.rows.length} recordings`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching course recordings:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/login ─────────────────────────────────────
// Тело: { login, password }
// Ответ: объект Admin без пароля
app.post('/api/admin/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }

  try {
    // Автоматически назначаем первого созданного админа главным
    await pool.query(`
      UPDATE "Admin" SET is_super = TRUE
      WHERE id = (SELECT id FROM "Admin" ORDER BY "createdAt" ASC LIMIT 1)
        AND (is_super IS NULL OR is_super = FALSE)
    `).catch(() => {}); // игнорируем если колонки нет

    const result = await pool.query(
      'SELECT * FROM "Admin" WHERE login = $1',
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const admin = result.rows[0];
    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const { password: _pwd, ...safeAdmin } = admin;
    res.json(safeAdmin);
  } catch (err) {
    console.error('Ошибка входа администратора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── GET /api/admin/list ───────────────────────────────────────
// Список всех администраторов
app.get('/api/admin/list', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, login, name, is_super, "createdAt" FROM "Admin" ORDER BY "createdAt" ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения администраторов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── POST /api/admin/create ────────────────────────────────────
// Создать нового администратора (только главный)
// Тело: { login, password, name, universityId }
app.post('/api/admin/create', requireSuperAdmin, async (req, res) => {
  const { login, password, name, universityId } = req.body;

  if (!login || !password || !name) {
    return res.status(400).json({ error: 'Заполните все поля: login, password, name' });
  }

  try {
    const exists = await pool.query('SELECT id FROM "Admin" WHERE login = $1', [login]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Администратор с таким логином уже существует' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO "Admin" (login, password, name, "createdBy", is_super, "universityId")
       VALUES ($1, $2, $3, $4, FALSE, $5)
       RETURNING id, login, name, is_super, "universityId", "createdAt"`,
      [login, hash, name, req.adminId, universityId || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка создания администратора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── DELETE /api/admin/:adminId ────────────────────────────────
// Удалить администратора (только главный, нельзя удалить себя)
app.delete('/api/admin/:adminId', requireSuperAdmin, async (req, res) => {
  const targetId = parseInt(req.params.adminId);

  if (targetId === req.adminId) {
    return res.status(400).json({ error: 'Нельзя удалить самого себя' });
  }

  try {
    // Нельзя удалить другого главного
    const target = await pool.query('SELECT is_super FROM "Admin" WHERE id = $1', [targetId]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'Администратор не найден' });
    if (target.rows[0].is_super) return res.status(400).json({ error: 'Нельзя удалить главного администратора' });

    await pool.query('DELETE FROM "Admin" WHERE id = $1', [targetId]);
    // Снимаем флаг is_admin у преподавателя если был назначен через promote
    const adminRow = await pool.query('SELECT login FROM "Admin" WHERE id = $1', [targetId]).catch(() => ({ rows: [] }));
    if (adminRow.rows[0]?.login) {
      await pool.query('UPDATE "Teacher" SET is_admin = FALSE WHERE email = $1', [adminRow.rows[0].login]).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления администратора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── GET /api/admin/teachers ───────────────────────────────────
// Список преподавателей: суперадмин видит всех, обычный — только своего вуза
app.get('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    let query, params;
    if (req.isSuper) {
      query = `SELECT t.id, t.name, t.email, t.is_admin, t."universityId", u.name as "universityName"
               FROM "Teacher" t
               LEFT JOIN "University" u ON t."universityId" = u.id
               ORDER BY t.name ASC`;
      params = [];
    } else {
      query = `SELECT t.id, t.name, t.email, t.is_admin, t."universityId", u.name as "universityName"
               FROM "Teacher" t
               LEFT JOIN "University" u ON t."universityId" = u.id
               WHERE t."universityId" = $1
               ORDER BY t.name ASC`;
      params = [req.adminUniversityId];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения преподавателей:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── POST /api/admin/promote ───────────────────────────────────
// Назначить преподавателя администратором (только главный)
app.post('/api/admin/promote', requireSuperAdmin, async (req, res) => {
  const { teacherId } = req.body;

  if (!teacherId) {
    return res.status(400).json({ error: 'Укажите teacherId' });
  }

  try {
    // Получаем данные преподавателя
    const teacherResult = await pool.query(
      'SELECT * FROM "Teacher" WHERE id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' });
    }

    const teacher = teacherResult.rows[0];

    // Помечаем преподавателя как admin
    await pool.query(
      'UPDATE "Teacher" SET is_admin = TRUE WHERE id = $1',
      [teacherId]
    );

    // Создаём запись в Admin если ещё нет (логин = email, временный пароль = email)
    const loginCandidate = teacher.email;
    const existingAdmin = await pool.query(
      'SELECT id FROM "Admin" WHERE login = $1',
      [loginCandidate]
    );

    let adminRecord;
    if (existingAdmin.rows.length === 0) {
      const tempPassword = teacher.email; // Преподаватель должен сменить пароль
      const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
      const created = await pool.query(
        `INSERT INTO "Admin" (login, password, name, "createdBy")
         VALUES ($1, $2, $3, $4)
         RETURNING id, login, name`,
        [loginCandidate, hash, teacher.name, req.adminId]
      );
      adminRecord = created.rows[0];
    } else {
      adminRecord = existingAdmin.rows[0];
    }

    res.json({
      success: true,
      message: `Преподаватель ${teacher.name} назначен администратором. Логин: ${loginCandidate}, временный пароль: email`,
      admin: adminRecord
    });
  } catch (err) {
    console.error('Ошибка назначения администратора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── POST /api/admin/demote ────────────────────────────────────
// Снять права администратора (только главный)
app.post('/api/admin/demote', requireSuperAdmin, async (req, res) => {
  const { adminId } = req.body;

  if (!adminId) {
    return res.status(400).json({ error: 'Укажите adminId' });
  }

  if (parseInt(adminId) === req.adminId) {
    return res.status(400).json({ error: 'Нельзя снять права с самого себя' });
  }

  try {
    // Получаем логин удаляемого администратора
    const adminResult = await pool.query(
      'SELECT login FROM "Admin" WHERE id = $1',
      [adminId]
    );
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Администратор не найден' });
    }

    const adminLogin = adminResult.rows[0].login;

    // Удаляем из Admin
    await pool.query('DELETE FROM "Admin" WHERE id = $1', [adminId]);

    // Если это был преподаватель — снимаем флаг is_admin
    await pool.query(
      'UPDATE "Teacher" SET is_admin = FALSE WHERE email = $1',
      [adminLogin]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка снятия прав:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── GET /api/admin/model-config ───────────────────────────────
// Получить текущую конфигурацию модели
app.get('/api/admin/model-config', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT url, model, temperature FROM "ModelConfig" ORDER BY id DESC LIMIT 1'
    );
    if (result.rows.length === 0) {
      return res.json({ url: 'http://192.168.0.20:1234', model: 'qwen2.5-7b-instruct-1m', temperature: 0.3 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка получения конфигурации:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── POST /api/admin/model-config ─────────────────────────────
// Сохранить конфигурацию модели
// Тело: { url, model, temperature }
app.post('/api/admin/model-config', requireAdmin, async (req, res) => {
  const { url, model, temperature } = req.body;

  if (!url || !model || temperature === undefined) {
    return res.status(400).json({ error: 'Укажите url, model и temperature' });
  }

  const temp = parseFloat(temperature);
  if (isNaN(temp) || temp < 0 || temp > 1) {
    return res.status(400).json({ error: 'temperature должен быть от 0 до 1' });
  }

  try {
    // Upsert: обновляем первую строку или вставляем новую
    const existing = await pool.query('SELECT id FROM "ModelConfig" LIMIT 1');

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE "ModelConfig"
         SET url = $1, model = $2, temperature = $3, "updatedAt" = NOW(), "updatedBy" = $4
         WHERE id = $5`,
        [url, model, temp, req.adminId, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO "ModelConfig" (url, model, temperature, "updatedBy")
         VALUES ($1, $2, $3, $4)`,
        [url, model, temp, req.adminId]
      );
    }

    res.json({ success: true, url, model, temperature: temp });
  } catch (err) {
    console.error('Ошибка сохранения конфигурации:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление преподавателя
app.put('/api/admin/teachers/:teacherId', requireSuperAdmin, async (req, res) => {
  const { teacherId } = req.params;
  const { name, email, password } = req.body;

  try {
    let query = 'UPDATE "Teacher" SET name = $1, email = $2 WHERE id = $3 RETURNING *';
    let params = [name, email, teacherId];

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      query = 'UPDATE "Teacher" SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *';
      params = [name, email, hashedPassword, teacherId];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка обновления преподавателя:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление администратора
app.put('/api/admin/admins/:adminId', requireSuperAdmin, async (req, res) => {
  const { adminId } = req.params;
  const { name, login, password } = req.body;

  try {
    let query = 'UPDATE "Admin" SET name = $1, login = $2 WHERE id = $3 RETURNING id, login, name, is_super, "universityId"';
    let params = [name, login, adminId];

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      query = 'UPDATE "Admin" SET name = $1, login = $2, password = $3 WHERE id = $4 RETURNING id, login, name, is_super, "universityId"';
      params = [name, login, hashedPassword, adminId];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Администратор не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка обновления администратора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление преподавателя
app.delete('/api/admin/teachers/:teacherId', requireSuperAdmin, async (req, res) => {
  const { teacherId } = req.params;

  try {
    const result = await pool.query('DELETE FROM "Teacher" WHERE id = $1 RETURNING id', [teacherId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Преподаватель не найден' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления преподавателя:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление администратора (переопределяем существующий)
app.delete('/api/admin/admins/:adminId', requireSuperAdmin, async (req, res) => {
  const targetId = parseInt(req.params.adminId);

  if (targetId === req.adminId) {
    return res.status(400).json({ error: 'Нельзя удалить самого себя' });
  }

  try {
    const target = await pool.query('SELECT is_super FROM "Admin" WHERE id = $1', [targetId]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'Администратор не найден' });
    if (target.rows[0].is_super) return res.status(400).json({ error: 'Нельзя удалить главного администратора' });

    await pool.query('DELETE FROM "Admin" WHERE id = $1', [targetId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления администратора:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
app.get('/api/admin/content', requireAdmin, async (req, res) => {
  try {
    // УБИРАЕМ ФИЛЬТРАЦИЮ - теперь все админы видят всё
    // const uniFilter = req.isSuper ? '' : 'AND t."universityId" = $1';
    // const uniParam = req.isSuper ? [] : [req.adminUniversityId];
    
    const recordings = await pool.query(
      `SELECT ar.id, ar.title, ar.type, ar."filePath", ar."fileSize", ar."createdAt",
              ar."sessionId", ar."teacherId",
              t.name as "teacherName", c.title as "courseTitle"
       FROM "AudioRecording" ar
       LEFT JOIN "Teacher" t ON ar."teacherId" = t.id
       LEFT JOIN "Session" s ON ar."sessionId" = s.id
       LEFT JOIN "Course" c ON s."courseId" = c.id
       ORDER BY ar."createdAt" DESC`
      // Убрали WHERE 1=1 ${uniFilter} и uniParam
    );
    
    const materials = await pool.query(
      `SELECT m.id, m."originalName", m."filePath", m."fileSize", m."fileType",
              m."createdAt", m."sessionId", m."teacherId", m.description,
              t.name as "teacherName", c.title as "courseTitle"
       FROM "LectureMaterial" m
       LEFT JOIN "Teacher" t ON m."teacherId" = t.id
       LEFT JOIN "Session" s ON m."sessionId" = s.id
       LEFT JOIN "Course" c ON s."courseId" = c.id
       ORDER BY m."createdAt" DESC`
      // Убрали WHERE 1=1 ${uniFilter} и uniParam
    );
    
    res.json({ recordings: recordings.rows, materials: materials.rows });
  } catch (err) {
    console.error('Ошибка получения контента:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── DELETE /api/admin/recordings/:id ─────────────────────────
// Удалить запись лекции (любой админ)
app.delete('/api/admin/recordings/:id', requireAdmin, async (req, res) => {
  try {
    const rec = await pool.query('SELECT * FROM "AudioRecording" WHERE id = $1', [req.params.id]);
    if (rec.rows.length === 0) return res.status(404).json({ error: 'Запись не найдена' });

    const filePath = path.join(__dirname, 'public', rec.rows[0].filePath.replace(/^\//, ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM "AudioRecording" WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления записи:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── DELETE /api/admin/materials/:id ──────────────────────────
// Удалить материал лекции (любой админ)
app.delete('/api/admin/materials/:id', requireAdmin, async (req, res) => {
  try {
    const mat = await pool.query('SELECT * FROM "LectureMaterial" WHERE id = $1', [req.params.id]);
    if (mat.rows.length === 0) return res.status(404).json({ error: 'Материал не найден' });

    const filePath = path.join(__dirname, 'uploads', 'materials', mat.rows[0].fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM "LectureMaterial" WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления материала:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
// ── GET /api/universities ─────────────────────────────────────
// Публичный список вузов (для экрана выбора вуза)
app.get('/api/universities', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, short_name FROM "University" ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения вузов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── POST /api/admin/universities ──────────────────────────────
// Создать вуз (только суперадмин)
app.post('/api/admin/universities', requireSuperAdmin, async (req, res) => {
  const { name, short_name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Укажите название вуза' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO "University" (name, short_name) VALUES ($1, $2) RETURNING *`,
      [name.trim(), (short_name || '').trim() || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Вуз с таким названием уже существует' });
    }
    console.error('Ошибка создания вуза:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── DELETE /api/admin/universities/:id ────────────────────────
// Удалить вуз (только суперадмин)
app.delete('/api/admin/universities/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM "University" WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления вуза:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── GET /api/admin/universities ───────────────────────────────
// Список вузов для суперадмина (с количеством преподавателей)
app.get('/api/admin/universities', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.short_name, u."createdAt",
        COUNT(DISTINCT t.id) as teacher_count,
        COUNT(DISTINCT s.id) as student_count
      FROM "University" u
      LEFT JOIN "Teacher" t ON t."universityId" = u.id
      LEFT JOIN "Student" s ON s."universityId" = u.id
      GROUP BY u.id
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения вузов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================================
// СТРИМИНГОВАЯ ЗАПИСЬ - ЭНДПОИНТЫ
// ============================================

// ---------- AUDIO STREAMING ----------

app.post('/api/audio/stream/start', async (req, res) => {
  const { sessionId, teacherId, teacherName } = req.body;
  
  if (!sessionId || !teacherId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const streamingId = uuidv4();
  const session = new StreamingSession(streamingId, 'audio', sessionId, teacherId, teacherName);
  activeStreamingSessions.set(streamingId, session);
  
  res.json({ success: true, streamingId });
});

app.post('/api/audio/stream/chunk', chunkUpload.single('chunk'), (req, res) => {
  const { streamingId, chunkIndex } = req.body;
  
  if (!streamingId || !req.file) {
    return res.status(400).json({ error: 'Missing streamingId or chunk data' });
  }
  
  const session = activeStreamingSessions.get(streamingId);
  if (!session) {
    return res.status(404).json({ error: 'Streaming session not found' });
  }
  
  session.addChunk(req.file.buffer, parseInt(chunkIndex, 10));
  res.json({ success: true, chunkIndex: parseInt(chunkIndex, 10) });
});

app.post('/api/audio/stream/finalize', async (req, res) => {
  const { streamingId, sessionId, teacherId, title, description, transcription, timedTranscription, timings } = req.body;
  
  if (!streamingId) {
    return res.status(400).json({ error: 'Missing streamingId' });
  }
  
  const session = activeStreamingSessions.get(streamingId);
  if (!session) {
    return res.status(404).json({ error: 'Streaming session not found' });
  }
  
  try {
    const result = await session.finalize({
      title: title || `Audio recording ${new Date().toLocaleString()}`,
      description: description || '',
      transcription: transcription || '',
      timedTranscription: timedTranscription || '',
      timings: timings || []
    });
    
    const dbResult = await pool.query(
      `INSERT INTO "AudioRecording" 
       ("sessionId", "teacherId", "fileName", "filePath", "duration", "title", "description", "transcription", "timedTranscription", "type", "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
       RETURNING *`,
      [sessionId || session.sessionId, teacherId || session.teacherId, `${result.id}.webm`, 
       result.filePath, result.duration, result.title, result.description || '',
       transcription || '', timedTranscription || '', 'audio']
    );
    
    if (sessionId && io) {
      io.to(`session_${sessionId}`).emit('audio_recording_added', {
        recording: dbResult.rows[0],
        timestamp: new Date()
      });
    }
    
    activeStreamingSessions.delete(streamingId);
    res.json({ success: true, recording: dbResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audio/stream/cancel', (req, res) => {
  const { streamingId } = req.body;
  const session = activeStreamingSessions.get(streamingId);
  if (session) {
    session.cancel();
    activeStreamingSessions.delete(streamingId);
  }
  res.json({ success: true });
});

// ---------- VIDEO STREAMING ----------

app.post('/api/video/stream/start', async (req, res) => {
  const { sessionId, teacherId, teacherName } = req.body;
  
  if (!sessionId || !teacherId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const streamingId = uuidv4();
  const session = new StreamingSession(streamingId, 'video', sessionId, teacherId, teacherName);
  activeStreamingSessions.set(streamingId, session);
  
  res.json({ success: true, streamingId });
});

app.post('/api/video/stream/chunk', chunkUpload.single('chunk'), (req, res) => {
  const { streamingId, chunkIndex } = req.body;
  
  if (!streamingId || !req.file) {
    return res.status(400).json({ error: 'Missing streamingId or chunk data' });
  }
  
  const session = activeStreamingSessions.get(streamingId);
  if (!session) {
    return res.status(404).json({ error: 'Streaming session not found' });
  }
  
  session.addChunk(req.file.buffer, parseInt(chunkIndex, 10));
  res.json({ success: true });
});

app.post('/api/video/stream/finalize', async (req, res) => {
  const { streamingId, sessionId, teacherId, title, description } = req.body;
  
  if (!streamingId) {
    return res.status(400).json({ error: 'Missing streamingId' });
  }
  
  const session = activeStreamingSessions.get(streamingId);
  if (!session) {
    return res.status(404).json({ error: 'Streaming session not found' });
  }
  
  try {
    const result = await session.finalize({
      title: title || `Video recording ${new Date().toLocaleString()}`,
      description: description || ''
    });
    
    const dbResult = await pool.query(
      `INSERT INTO "AudioRecording" 
       ("sessionId", "teacherId", "fileName", "filePath", "duration", "title", "description", "type", "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING *`,
      [sessionId || session.sessionId, teacherId || session.teacherId, `${result.id}.webm`,
       result.filePath, result.duration, result.title, result.description || '', 'video']
    );
    
    if (sessionId && io) {
      io.to(`session_${sessionId}`).emit('video_recording_added', {
        recording: dbResult.rows[0],
        timestamp: new Date()
      });
    }
    
    activeStreamingSessions.delete(streamingId);
    res.json({ success: true, recording: dbResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/video/stream/cancel', (req, res) => {
  const { streamingId } = req.body;
  const session = activeStreamingSessions.get(streamingId);
  if (session) {
    session.cancel();
    activeStreamingSessions.delete(streamingId);
  }
  res.json({ success: true });
});
// =============================================================
// КОНЕЦ ADMIN ROUTES
// =============================================================



app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Инициализация mediasoup и запуск сервера
(async () => {
  // Определяем IP для mediasoup (берём из .env или ищем в сети)
  const os = require('os');
  let announcedIp = process.env.MEDIASOUP_IP || null;
  if (!announcedIp) {
    // Ищем IP в подсети 192.168.0.x или 192.168.14.x (не виртуальные адаптеры)
    const interfaces = Object.values(os.networkInterfaces()).flat();
    const preferred = interfaces.find(i => 
      i.family === 'IPv4' && !i.internal && 
      (i.address.startsWith('192.168.0.') || i.address.startsWith('192.168.14.') || i.address.startsWith('10.'))
    );
    announcedIp = preferred ? preferred.address : interfaces.find(i => i.family === 'IPv4' && !i.internal)?.address || '127.0.0.1';
  }

  try {
    await mediasoupManager.init(announcedIp);
    console.log(`mediasoup инициализирован, announcedIp: ${announcedIp}`);
  } catch (err) {
    console.error('Ошибка инициализации mediasoup:', err.message);
    console.log('Сервер продолжит работу без mediasoup (P2P fallback)');
  }

  // Запуск HTTP сервера
  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`HTTP сервер запущен на порту: ${HTTP_PORT} (тоннель/интернет)`);
  });

  // Запуск HTTPS сервера
  if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`HTTPS сервер запущен на порту: ${HTTPS_PORT} (локальная сеть)`);
      Object.values(os.networkInterfaces()).flat().forEach(i => {
        if (i.family === 'IPv4' && !i.internal) {
          console.log(`  → https://${i.address}:${HTTPS_PORT}`);
        }
      });
    });
  }
})();

// Обработка завершение процесса

/**
 Обработка SIGTERM (сигнал завершения)
 Используется при graceful shutdown в production (например, в Docker)
 */
process.on('SIGTERM', () => {
  console.log('Получен SIGTERM. Завершение работы...');
  server.close(() => {
    console.log('HTTPS сервер закрыт');
    pool.end(() => {
      console.log('PostgreSQL подключение закрыто');
      process.exit(0);
    });
  });
});

/**
 Обработка SIGINT (Ctrl+C)
 Используется при ручном завершении в development
 */
process.on('SIGINT', () => {
  console.log('Получен SIGINT. Завершение работы...');
  server.close(() => {
    console.log('HTTPS сервер закрыт');
    pool.end(() => {
      console.log('PostgreSQL подключение закрыто');
      process.exit(0);
    });
  });
});

/**
  Обработка необработанных исключений
  Логируем ошибку, но не завершаем процесс
 */
process.on('uncaughtException', (error) => {
  console.error('Необработанное исключение:', error);
});

/**
  Обработка необработанных отклонений промисов
  Логируем ошибку, но не завершаем процесс
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанный rejection:', reason);
});