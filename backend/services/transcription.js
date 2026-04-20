const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

class TranscriptionService {
  constructor() {
    this.whisperUrl = process.env.WHISPER_URL || 'http://localhost:5000/transcribe';
    this.timeout = 300000;
  }

  async transcribeAudio(recordingId) {
    try {
      console.log('Начинаем транскрибирование записи ID:', recordingId);
      
      const recResult = await pool.query(
        'SELECT "fileName" FROM "AudioRecording" WHERE id = $1',
        [recordingId]
      );
      
      if (recResult.rows.length === 0) {
        throw new Error('Запись ID ' + recordingId + ' не найдена в базе данных');
      }
      
      const { fileName } = recResult.rows[0];
      const filePath = path.join(__dirname, '..', '..', 'uploads', 'audio', fileName);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Аудиофайл не найден на диске: ' + filePath);
      }
      
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      console.log('Размер файла:', fileSizeMB.toFixed(2), 'MB');
      
      if (fileSizeMB > 50) {
        throw new Error('Файл слишком большой (' + fileSizeMB.toFixed(2) + ' MB). Максимальный размер: 50 MB');
      }
      
      console.log('Отправляем файл в Whisper:', fileName);
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(filePath), {
        filename: fileName
      });
      
      const startTime = Date.now();
      
      const response = await axios.post(this.whisperUrl, formData, {
        headers: formData.getHeaders(),
        timeout: this.timeout
      });
      
      const processingTime = Date.now() - startTime;
      console.log('Транскрипция завершена за', processingTime, 'ms');
      
      if (response.data?.text) {
        const transcriptionText = response.data.text.trim();
        const wordCount = transcriptionText.split(/\s+/).length;
        
        console.log('Транскрипция получена. Слов:', wordCount, 'символов:', transcriptionText.length);
        
        await pool.query(
          `UPDATE "AudioRecording" 
           SET "transcription" = $1,
               "lastEditedAt" = NOW()
           WHERE id = $2`,
          [transcriptionText, recordingId]
        );
        
        console.log('Транскрипция сохранена в базу данных для записи ID:', recordingId);
        
        return {
          success: true,
          text: transcriptionText,
          wordCount: wordCount,
          characterCount: transcriptionText.length,
          processingTime: processingTime,
          recordingId: recordingId,
          fileName: fileName
        };
      } else {
        console.error('Whisper вернул неожиданный ответ:', response.data);
        throw new Error('Сервис транскрипции вернул пустой или неожиданный результат');
      }
      
    } catch (err) {
      console.error('Ошибка транскрибирования:', err.message);
      
      let errorMessage = 'Ошибка транскрибирования';
      
      if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Сервис транскрипции недоступен. Убедитесь, что Whisper сервер запущен на localhost:5000';
      } else if (err.code === 'ETIMEDOUT') {
        errorMessage = 'Таймаут при транскрибировании. Файл может быть слишком длинным или сервис перегружен';
      } else if (err.response) {
        errorMessage = 'Ошибка сервера транскрипции: ' + err.response.status + ' ' + err.response.statusText;
      }
      
      throw new Error(errorMessage + ': ' + err.message);
    }
  }
}

module.exports = new TranscriptionService();