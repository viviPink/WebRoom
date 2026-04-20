const express = require('express');
const router = express.Router();
const controllers = require('../controllers/index');
const { upload } = require('../config/multer');
const transcriptionService = require('../services/transcription');

router.post('/teacher/login', controllers.teacherLogin);
router.post('/student/login', controllers.studentLogin);

router.get('/teacher/:teacherId/courses', controllers.getTeacherCourses);
router.post('/teacher/courses/create', controllers.createCourse);

router.get('/sessions/active', controllers.getActiveSessions);
router.get('/teacher/:teacherId/sessions/active', controllers.getTeacherActiveSessions);
router.post('/teacher/sessions/create', controllers.createSession);
router.post('/sessions/:sessionId/finish', controllers.finishSession);
router.post('/attendance/join', controllers.joinSession);
router.get('/student/:studentId/history', controllers.getStudentHistory);

router.get('/messages/:sessionId', controllers.getSessionMessages);

router.post('/audio/upload', upload.single('audio'), controllers.uploadAudio);
router.get('/audio/session/:sessionId', controllers.getSessionRecordings);
router.get('/audio/teacher/:teacherId', controllers.getTeacherRecordings);
router.get('/audio/:recordingId', controllers.getRecording);
router.delete('/audio/:recordingId', controllers.deleteRecording);

router.post('/audio/:recordingId/transcribe', async (req, res) => {
  try {
    const result = await transcriptionService.transcribeAudio(req.params.recordingId);
    res.json(result);
  } catch (err) {
    console.error('Ошибка транскрипции:', err);
    res.status(500).json({ 
      success: false,
      error: err.message
    });
  }
});

router.get('/audio/:recordingId/transcription/edit', controllers.getTranscriptionForEdit);
router.put('/audio/:recordingId/transcription/edit', controllers.saveTranscription);

router.get('/test/transcription', async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const result = await pool.query('SELECT id, title FROM "AudioRecording" LIMIT 5');
    res.json({
      success: true,
      recordings: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/debug/audio/:id', async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const result = await pool.query('SELECT * FROM "AudioRecording" WHERE id = $1', [req.params.id]);
    res.json({
      exists: result.rows.length > 0,
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/server/stats', controllers.getServerStats);

module.exports = router;