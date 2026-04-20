const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { audioDir } = require('../config/multer');

const controllers = {
  async teacherLogin(req, res) {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Имя и email обязательны' });
      }
      
      let result = await pool.query('SELECT * FROM "Teacher" WHERE email = $1', [email]);
      let teacher = result.rows[0];

      if (!teacher) {
        const insert = await pool.query(
          'INSERT INTO "Teacher" (name, email) VALUES ($1, $2) RETURNING *',
          [name, email]
        );
        teacher = insert.rows[0];
      }
      
      res.json(teacher);
    } catch (err) {
      console.error('Ошибка входа преподавателя:', err);
      res.status(500).json({ error: 'Ошибка сервера при входе преподавателя' });
    }
  },

  async studentLogin(req, res) {
    try {
      const { name, group } = req.body;
      
      if (!name || !group) {
        return res.status(400).json({ error: 'Имя и группа обязательны' });
      }
      
      let result = await pool.query(
        'SELECT * FROM "Student" WHERE "full_name" = $1 AND "group" = $2',
        [name, group]
      );
      let student = result.rows[0];

      if (!student) {
        const insert = await pool.query(
          'INSERT INTO "Student" ("full_name", "group") VALUES ($1, $2) RETURNING *',
          [name, group]
        );
        student = insert.rows[0];
      }
      
      res.json(student);
    } catch (err) {
      console.error('Ошибка входа студента:', err);
      res.status(500).json({ error: 'Ошибка сервера при входе студента' });
    }
  },

  async getTeacherCourses(req, res) {
    try {
      const { teacherId } = req.params;
      
      if (!teacherId) {
        return res.status(400).json({ error: 'ID преподавателя обязателен' });
      }
      
      const result = await pool.query(
        'SELECT * FROM "Course" WHERE "teacherId" = $1 ORDER BY "createdAt" DESC',
        [teacherId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Ошибка получения курсов:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении курсов' });
    }
  },

  async createCourse(req, res) {
    try {
      const { teacherId, title } = req.body;
      
      if (!teacherId || !title) {
        return res.status(400).json({ error: 'ID преподавателя и название курса обязательны' });
      }
      
      const result = await pool.query(
        'INSERT INTO "Course" ("teacherId", title) VALUES ($1, $2) RETURNING *',
        [teacherId, title]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Ошибка создания курса:', err);
      res.status(500).json({ error: 'Ошибка сервера при создании курса' });
    }
  },

  async getActiveSessions(req, res) {
    try {
      const result = await pool.query(`
        SELECT s.*, c.title as "courseTitle", t.name as "teacherName"
        FROM "Session" s 
        JOIN "Course" c ON s."courseId" = c.id 
        JOIN "Teacher" t ON c."teacherId" = t.id
        WHERE s."isActive" = true
        ORDER BY s."startTime" DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Ошибка получения активных сессий:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении активных сессий' });
    }
  },

  async getTeacherActiveSessions(req, res) {
    try {
      const { teacherId } = req.params;
      
      if (!teacherId) {
        return res.status(400).json({ error: 'ID преподавателя обязателен' });
      }
      
      const result = await pool.query(`
        SELECT s.*, c.title as "courseTitle" 
        FROM "Session" s 
        JOIN "Course" c ON s."courseId" = c.id 
        WHERE c."teacherId" = $1 AND s."isActive" = true
        ORDER BY s."startTime" DESC
      `, [teacherId]);
      res.json(result.rows);
    } catch (err) {
      console.error('Ошибка получения сессий преподавателя:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении сессий преподавателя' });
    }
  },

  async createSession(req, res) {
    try {
      const { courseId } = req.body;
      
      if (!courseId) {
        return res.status(400).json({ error: 'ID курса обязателен' });
      }
      
      const result = await pool.query(
        'INSERT INTO "Session" ("courseId", "isActive", "startTime") VALUES ($1, true, NOW()) RETURNING *',
        [courseId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Ошибка создания сессии:', err);
      res.status(500).json({ error: 'Ошибка сервера при создании сессии' });
    }
  },

  async finishSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'ID сессии обязателен' });
      }
      
      const result = await pool.query(
        'UPDATE "Session" SET "isActive" = false, "endTime" = NOW() WHERE id = $1 RETURNING *',
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Сессия не найдена' });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Ошибка завершения сессии:', err);
      res.status(500).json({ error: 'Ошибка сервера при завершении сессии' });
    }
  },

  async joinSession(req, res) {
    try {
      const { studentName, groupName, sessionId } = req.body;
      
      if (!studentName || !groupName || !sessionId) {
        return res.status(400).json({ error: 'Имя студента, группа и ID сессии обязательны' });
      }
      
      const sessionCheck = await pool.query('SELECT * FROM "Session" WHERE id = $1 AND "isActive" = true', [sessionId]);
      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Активная сессия не найдена' });
      }
      
      let studentResult = await pool.query(
        'SELECT id FROM "Student" WHERE "full_name" = $1 AND "group" = $2',
        [studentName, groupName]
      );
      
      let studentId;
      if (studentResult.rows.length === 0) {
        const newStudent = await pool.query(
          'INSERT INTO "Student" ("full_name", "group") VALUES ($1, $2) RETURNING id',
          [studentName, groupName]
        );
        studentId = newStudent.rows[0].id;
      } else {
        studentId = studentResult.rows[0].id;
      }

      const existingAttendance = await pool.query(
        'SELECT * FROM "Attendance" WHERE "studentId" = $1 AND "sessionId" = $2',
        [studentId, sessionId]
      );
      
      if (existingAttendance.rows.length > 0) {
        return res.json({ 
          success: true, 
          attendance: existingAttendance.rows[0],
          message: 'Студент уже присоединился к этой сессии' 
        });
      }

      const attendance = await pool.query(
        'INSERT INTO "Attendance" ("studentId", "sessionId") VALUES ($1, $2) RETURNING *',
        [studentId, sessionId]
      );

      res.json({ 
        success: true, 
        attendance: attendance.rows[0],
        message: 'Студент успешно присоединился к сессии'
      });
    } catch (err) {
      console.error('Ошибка присоединения к сессии:', err);
      res.status(500).json({ error: 'Ошибка сервера при присоединении к сессии' });
    }
  },

  async getStudentHistory(req, res) {
    try {
      const { studentId } = req.params;
      
      if (!studentId) {
        return res.status(400).json({ error: 'ID студента обязателен' });
      }
      
      const result = await pool.query(`
        SELECT s.*, c.title as "courseTitle", t.name as "teacherName"
        FROM "Attendance" a
        JOIN "Session" s ON a."sessionId" = s.id
        JOIN "Course" c ON s."courseId" = c.id
        JOIN "Teacher" t ON c."teacherId" = t.id
        WHERE a."studentId" = $1
        ORDER BY a."joinTime" DESC
      `, [studentId]);
      res.json(result.rows);
    } catch (err) {
      console.error('Ошибка получения истории студента:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении истории студента' });
    }
  },

  async getSessionMessages(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'ID сессии обязателен' });
      }
      
      const result = await pool.query(`
        SELECT m.*, 
          CASE 
            WHEN m."senderType" = 'teacher' THEN t.name
            WHEN m."senderType" = 'student' THEN s."full_name"
          END as "senderName"
        FROM "Message" m
        LEFT JOIN "Teacher" t ON m."senderId" = t.id AND m."senderType" = 'teacher'
        LEFT JOIN "Student" s ON m."senderId" = s.id AND m."senderType" = 'student'
        WHERE m."sessionId" = $1
        ORDER BY m."timestamp" ASC
      `, [sessionId]);
      
      res.json(result.rows);
    } catch (err) {
      console.error('Ошибка получения сообщений:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении сообщений' });
    }
  },

  async uploadAudio(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }

      const { sessionId, teacherId, title, description, duration } = req.body;
      
      if (!sessionId || !teacherId) {
        return res.status(400).json({ error: 'ID сессии и преподавателя обязательны' });
      }
      
      const filePath = `/uploads/audio/${req.file.filename}`;
      const fileSize = req.file.size;
      
      const result = await pool.query(
        `INSERT INTO "AudioRecording" 
         ("sessionId", "teacherId", "fileName", "filePath", "fileSize", "duration", "title", "description", "transcription") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [sessionId, teacherId, req.file.filename, filePath, fileSize, duration || 0, title || '', description || '', '']
      );

      if (sessionId && req.app.locals.io) {
        const roomName = `session_${sessionId}`;
        req.app.locals.io.to(roomName).emit('audio_recording_added', {
          recording: result.rows[0],
          timestamp: new Date()
        });
        console.log('Уведомление о новой аудиозаписи отправлено в комнату', roomName);
      }

      res.json({
        success: true,
        recording: result.rows[0],
        message: 'Аудиозапись успешно сохранена',
        fileUrl: filePath
      });
    } catch (err) {
      console.error('Ошибка загрузки аудио:', err);
      res.status(500).json({ 
        error: 'Ошибка сохранения аудиозаписи'
      });
    }
  },

  async getSessionRecordings(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'ID сессии обязателен' });
      }
      
      const result = await pool.query(`
        SELECT ar.*, t.name as "teacherName"
        FROM "AudioRecording" ar
        LEFT JOIN "Teacher" t ON ar."teacherId" = t.id
        WHERE ar."sessionId" = $1
        ORDER BY ar."createdAt" DESC
      `, [sessionId]);
      
      res.json(result.rows);
    } catch (err) {
      console.error('Ошибка получения аудиозаписей:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении аудиозаписей' });
    }
  },

  async getTeacherRecordings(req, res) {
    try {
      const { teacherId } = req.params;
      
      if (!teacherId) {
        return res.status(400).json({ error: 'ID преподавателя обязателен' });
      }
      
      const result = await pool.query(`
        SELECT ar.*, s."startTime" as "sessionDate", c.title as "courseTitle"
        FROM "AudioRecording" ar
        LEFT JOIN "Session" s ON ar."sessionId" = s.id
        LEFT JOIN "Course" c ON s."courseId" = c.id
        WHERE ar."teacherId" = $1
        ORDER BY ar."createdAt" DESC
      `, [teacherId]);
      
      res.json(result.rows);
    } catch (err) {
      console.error('Ошибка получения аудиозаписей преподавателя:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении аудиозаписей преподавателя' });
    }
  },

  async getRecording(req, res) {
    try {
      const { recordingId } = req.params;
      
      if (!recordingId) {
        return res.status(400).json({ error: 'ID записи обязателен' });
      }
      
      const result = await pool.query(`
        SELECT ar.*, t.name as "teacherName"
        FROM "AudioRecording" ar
        LEFT JOIN "Teacher" t ON ar."teacherId" = t.id
        WHERE ar.id = $1
      `, [recordingId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Аудиозапись не найдена' });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Ошибка получения аудиозаписи:', err);
      res.status(500).json({ error: 'Ошибка сервера при получении аудиозаписи' });
    }
  },

  async deleteRecording(req, res) {
    try {
      const { recordingId } = req.params;
      
      if (!recordingId) {
        return res.status(400).json({ error: 'ID записи обязателен' });
      }
      
      const result = await pool.query(
        'SELECT * FROM "AudioRecording" WHERE id = $1',
        [recordingId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Аудиозапись не найдена' });
      }
      
      const recording = result.rows[0];
      const filePath = path.join(audioDir, recording.fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Файл удален с диска:', filePath);
      }
      
      await pool.query('DELETE FROM "AudioRecording" WHERE id = $1', [recordingId]);
      
      res.json({ 
        success: true, 
        message: 'Аудиозапись удалена',
        recordingId: recordingId
      });
    } catch (err) {
      console.error('Ошибка удаления аудиозаписи:', err);
      res.status(500).json({ error: 'Ошибка сервера при удалении аудиозаписи' });
    }
  },

  async getTranscriptionForEdit(req, res) {
    try {
      const { recordingId } = req.params;
      
      if (!recordingId) {
        return res.status(400).json({ error: 'ID записи обязателен' });
      }
      
      console.log('Запрос транскрипции для редактирования ID:', recordingId);
      
      const result = await pool.query(`
        SELECT ar.id, ar."transcription", ar.title, ar.description, 
                ar."createdAt", ar.duration, ar."fileSize", ar."filePath",
                t.name as "teacherName"
        FROM "AudioRecording" ar
        LEFT JOIN "Teacher" t ON ar."teacherId" = t.id
        WHERE ar.id = $1
      `, [recordingId]);
      
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
        teacherName: recording.teacherName
      });
    } catch (err) {
      console.error('Ошибка получения транскрипции:', err);
      res.status(500).json({ 
        success: false,
        error: 'Ошибка сервера при получении транскрипции'
      });
    }
  },

  async saveTranscription(req, res) {
    try {
      const { recordingId } = req.params;
      const { transcription } = req.body;
      
      if (!recordingId) {
        return res.status(400).json({ error: 'ID записи обязателен' });
      }
      
      if (transcription === undefined || transcription === null) {
        return res.status(400).json({ 
          success: false,
          error: 'Текст транскрипции обязателен' 
        });
      }
      
      console.log('Сохранение транскрипции для записи ID:', recordingId);
      console.log('Длина транскрипции:', (transcription || '').length, 'символов');
      
      const checkResult = await pool.query(
        'SELECT id FROM "AudioRecording" WHERE id = $1',
        [recordingId]
      );
      
      if (checkResult.rows.length === 0) {
        console.log('Запись ID', recordingId, 'не найдена при сохранении');
        return res.status(404).json({ 
          success: false,
          error: 'Запись не найдена' 
        });
      }
      
      const updateResult = await pool.query(
        `UPDATE "AudioRecording" 
         SET "transcription" = $1,
             "lastEditedAt" = NOW()
         WHERE id = $2 
         RETURNING id, "transcription", "lastEditedAt"`,
        [transcription, recordingId]
      );
      
      console.log('Транскрипция успешно сохранена для записи ID:', recordingId);
      
      res.json({
        success: true,
        recording: updateResult.rows[0],
        message: 'Транскрипция успешно сохранена'
      });
    } catch (err) {
      console.error('Ошибка сохранения транскрипции:', err);
      res.status(500).json({ 
        success: false,
        error: 'Ошибка сервера при сохранении транскрипции'
      });
    }
  },

  async getServerStats(req, res) {
    try {
      let socketStats = {
        activeConnections: 0,
        activeSessions: 0,
        sessionParticipants: {}
      };
      
      if (req.app.locals.socketHandlers && req.app.locals.socketHandlers.getStats) {
        socketStats = req.app.locals.socketHandlers.getStats();
      }
      
      const stats = {
        activeConnections: socketStats.activeConnections || 0,
        activeSessions: socketStats.activeSessions || 0,
        sessionParticipants: socketStats.sessionParticipants || {},
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        audioRecordings: 0,
        teachers: 0,
        students: 0,
        courses: 0,
        sessions: 0,
        messages: 0
      };
      
      try {
        const audioResult = await pool.query('SELECT COUNT(*) FROM "AudioRecording"');
        stats.audioRecordings = parseInt(audioResult.rows[0].count) || 0;
        
        const teachersResult = await pool.query('SELECT COUNT(*) FROM "Teacher"');
        stats.teachers = parseInt(teachersResult.rows[0].count) || 0;
        
        const studentsResult = await pool.query('SELECT COUNT(*) FROM "Student"');
        stats.students = parseInt(studentsResult.rows[0].count) || 0;
        
        const coursesResult = await pool.query('SELECT COUNT(*) FROM "Course"');
        stats.courses = parseInt(coursesResult.rows[0].count) || 0;
        
        const sessionsResult = await pool.query('SELECT COUNT(*) FROM "Session"');
        stats.sessions = parseInt(sessionsResult.rows[0].count) || 0;
        
        const messagesResult = await pool.query('SELECT COUNT(*) FROM "Message"');
        stats.messages = parseInt(messagesResult.rows[0].count) || 0;
      } catch (dbErr) {
        console.error('Ошибка получения статистики из БД:', dbErr);
      }
      
      res.json(stats);
    } catch (err) {
      console.error('Ошибка получения статистики сервера:', err);
      res.status(500).json({ 
        error: 'Ошибка сервера при получении статистики'
      });
    }
  }
};

module.exports = controllers;