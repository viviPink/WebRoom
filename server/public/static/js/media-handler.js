// Общие медиа-функции для WebRTC
class MediaHandler {
  constructor() {
    this.localStream = null;
    this.screenStream = null;
    this.peerConnections = new Map();
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingTimer = null;
  }

  // Получение медиапотока (камера + микрофон)
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Ошибка получения медиапотока:', error);
      throw error;
    }
  }

  // Получение экранного потока
  async getScreenMedia() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Обработка остановки демонстрации экрана
      this.screenStream.getVideoTracks()[0].onended = () => {
        console.log('Демонстрация экрана остановлена');
        this.stopScreenSharing();
      };
      
      return this.screenStream;
    } catch (error) {
      console.error('Ошибка получения экранного потока:', error);
      throw error;
    }
  }

  // Начало записи аудио
  startAudioRecording() {
    if (!this.localStream) {
      throw new Error('Медиапоток не доступен');
    }

    // Создаем аудиопоток (только аудио)
    const audioStream = new MediaStream(this.localStream.getAudioTracks());
    
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    };

    try {
      this.mediaRecorder = new MediaRecorder(audioStream, options);
      this.recordedChunks = [];
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const duration = Date.now() - this.recordingStartTime;
        this.saveRecording(duration);
      };

      this.mediaRecorder.start(1000); // Записываем каждую секунду
      
      // Таймер для отображения времени записи
      this.recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.updateRecordingTimer(elapsed);
      }, 1000);

      console.log('Запись аудио начата');
      return true;
    } catch (error) {
      console.error('Ошибка начала записи:', error);
      return false;
    }
  }

  // Остановка записи аудио
  stopAudioRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      
      console.log('Запись аудио остановлена');
      return true;
    }
    return false;
  }

  // Сохранение записи на сервер
  async saveRecording(duration) {
    if (this.recordedChunks.length === 0) {
      console.log('Нет данных для сохранения');
      return;
    }

    const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording_${Date.now()}.webm`);
    
    // Здесь можно добавить дополнительные данные
    formData.append('duration', duration);
    
    try {
      const response = await fetch('/api/upload-recording', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      console.log('Запись сохранена:', result);
      return result;
    } catch (error) {
      console.error('Ошибка сохранения записи:', error);
      throw error;
    }
  }

  // Обновление таймера записи
  updateRecordingTimer(seconds) {
    const timerElement = document.getElementById('recordingTimer');
    if (timerElement) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  // Создание WebRTC соединения
  createPeerConnection(config = {}) {
    const defaultConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection({ ...defaultConfig, ...config });
    
    // Добавляем локальный поток, если он есть
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Обработка ICE кандидатов
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Кандидат будет отправлен через WebSocket
        if (window.socket) {
          window.socket.emit('ice_candidate', {
            targetSocketId: pc.remoteSocketId,
            candidate: event.candidate
          });
        }
      }
    };

    // Обработка входящих потоков
    pc.ontrack = (event) => {
      console.log('Получен удаленный поток:', event.streams[0]);
      
      // Отображаем видео в соответствующем элементе
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo && !remoteVideo.srcObject) {
        remoteVideo.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Состояние соединения:', pc.connectionState);
    };

    return pc;
  }

  // Остановка демонстрации экрана
  stopScreenSharing() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }

  // Остановка всех медиапотоков
  stopAllMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.stopScreenSharing();
    
    if (this.isRecording) {
      this.stopAudioRecording();
    }
    
    // Закрываем все WebRTC соединения
    this.peerConnections.forEach((pc, key) => {
      pc.close();
    });
    this.peerConnections.clear();
  }
}

// Экспортируем глобальный экземпляр
window.mediaHandler = new MediaHandler();