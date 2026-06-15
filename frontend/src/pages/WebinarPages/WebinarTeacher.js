import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import WebinarTeacherView from './WebinarTeacherView';
import AudioRecorder from '../../components/webinar/AudioRecorder';
import VideoRecorder from '../../components/webinar/VideoRecorder';
import useMediasoup from '../../hooks/useMediasoup';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const WHISPER_SERVER_URL = 'http://localhost:5000';
const SOCKET_URL = API_BASE_URL;

const WebinarTeacher = ({ sessionId, teacher, onExit }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [studentsForMonitoring, setStudentsForMonitoring] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [localStream, setLocalStream] = useState(null);
  const [isTeacherBroadcasting, setIsTeacherBroadcasting] = useState(false);
  const [activeStudentScreen, setActiveStudentScreen] = useState(null);
  const [pendingScreenRequests, setPendingScreenRequests] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [videoRecordings, setVideoRecordings] = useState([]);
  const [transcriptions, setTranscriptions] = useState({});
  const [transcribing, setTranscribing] = useState({});
  const [editingTranscription, setEditingTranscription] = useState(null);
  
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [activeStudentVideo, setActiveStudentVideo] = useState(null);

  const [isPlaybackBroadcasting, setIsPlaybackBroadcasting] = useState(false);
  const [playbackRecording, setPlaybackRecording] = useState(null);
  const [playbackState, setPlaybackState] = useState('stopped');
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSessionId, setPlaybackSessionId] = useState(null);
  const playbackVideoRef = useRef(null);
  
  const [pastMaterials, setPastMaterials] = useState(null);
  const [showPastMaterials, setShowPastMaterials] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const studentVideoRef = useRef(null);
  const teacherVideoRef = useRef(null);
  const studentScreenVideoRef = useRef(null);

  const micStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const webcamRawStreamRef = useRef(null);
  const activeStreamRef = useRef(null);
  const studentsForMonitoringRef = useRef([]);

  const [studentAudioStreams, setStudentAudioStreams] = useState(new Map());
  const [activeStudentAudio, setActiveStudentAudio] = useState(null);
  const studentAudioElementsRef = useRef(new Map());

  const mediasoup = useMediasoup(socketRef, sessionId, 'teacher');

  const loadSessionInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Ошибка загрузки сессии');
      const data = await response.json();
      setSessionInfo(data);
      return data;
    } catch (err) {
      console.error('Ошибка загрузки информации о сессии:', err);
      return null;
    }
  };

  const kickStudent = (studentSocketId, studentName) => {
    if (!socketRef.current?.connected) {
      alert('Нет подключения к вебинару');
      return;
    }
    
    if (!window.confirm(`Вы уверены, что хотите удалить студента "${studentName}" из вебинара?`)) {
      return;
    }
    
    socketRef.current.emit('kick_student', {
      sessionId,
      studentSocketId,
      studentName
    });
    
    alert(`Студент "${studentName}" удален из вебинара`);
  };

  const fetchPastMaterials = async () => {
    if (!sessionId) return;
    
    setLoadingMaterials(true);
    try {
      let info = sessionInfo;
      if (!info) {
        info = await loadSessionInfo();
      }
      
      let allRecordings = [];
      
      if (info && info.courseId) {
        const response = await fetch(`${API_BASE_URL}/api/audio/course/${info.courseId}`);
        if (response.ok) {
          const data = await response.json();
          allRecordings = Array.isArray(data) ? data : [];
        }
      }
      
      const sessionResponse = await fetch(`${API_BASE_URL}/api/audio/session/${sessionId}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const sessionRecs = Array.isArray(sessionData) ? sessionData : [];
        const existingIds = new Set(allRecordings.map(r => r.id));
        for (const rec of sessionRecs) {
          if (!existingIds.has(rec.id)) {
            allRecordings.push(rec);
            existingIds.add(rec.id);
          }
        }
      }
      
      const recordingsWithMaterials = await Promise.all(
        allRecordings.map(async (rec) => {
          try {
            const mRes = await fetch(`${API_BASE_URL}/api/materials/session/${rec.sessionId}`);
            const materials = mRes.ok ? await mRes.json() : [];
            const commentRes = await fetch(`${API_BASE_URL}/api/sessions/${rec.sessionId}/comment`);
            const comment = commentRes.ok ? (await commentRes.json()).comment : '';
            return { ...rec, materials, comment };
          } catch (e) {
            return { ...rec, materials: [], comment: '' };
          }
        })
      );
      
      setPastMaterials({
        recordings: recordingsWithMaterials,
        count: recordingsWithMaterials.length
      });
    } catch (err) {
      console.error('Ошибка загрузки материалов курса:', err);
      setPastMaterials({ recordings: [], count: 0, error: err.message });
    } finally {
      setLoadingMaterials(false);
    }
  };

  const startTeacherVideo = async () => {
    try {
      if (!mediasoup.isReady) {
        console.log('[Teacher] mediasoup не готов, инициализируем...');
        await mediasoup.initMediasoup();
      }
      if (!mediasoup.isReady) {
        throw new Error('mediasoup не удалось инициализировать');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        }
      });
      
      webcamRawStreamRef.current = stream;
      setLocalStream(stream);
      setIsTeacherBroadcasting(true);
      setIsWebcamActive(true);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        await mediasoup.clientRef.current.produce(videoTrack, 'camera', { 
          role: 'teacher', 
          type: 'camera',
          kind: 'video'
        });
        console.log('[Teacher] Video track produced');
      }
      
      if (audioTrack) {
        await mediasoup.clientRef.current.produce(audioTrack, 'mic', { 
          role: 'teacher', 
          type: 'mic',
          kind: 'audio'
        });
        console.log('[Teacher] Audio track produced');
      }

      if (socketRef.current) {
        socketRef.current.emit('teacher_start_video_broadcast', {
          sessionId, 
          teacherId: teacher.id, 
          teacherName: teacher.name
        });
      }
      console.log('[Teacher] Камера и микрофон запущены через mediasoup');
    } catch (err) {
      console.error('Ошибка включения камеры:', err);
      alert('Не удалось получить доступ к камере/микрофону: ' + err.message);
    }
  };

  const stopTeacherVideo = async () => {
    if (mediasoup.clientRef.current) {
      await mediasoup.clientRef.current.closeProducer('camera');
      await mediasoup.clientRef.current.closeProducer('mic');
    }
    if (webcamRawStreamRef.current) {
      webcamRawStreamRef.current.getTracks().forEach(t => t.stop());
      webcamRawStreamRef.current = null;
    }
    setIsWebcamActive(false);
    if (!screenStreamRef.current) {
      setLocalStream(null);
      setIsTeacherBroadcasting(false);
    }
    if (socketRef.current) {
      socketRef.current.emit('teacher_stop_video_broadcast', { sessionId });
    }
    console.log('[Teacher] Камера остановлена');
  };

  const toggleTeacherAudio = () => {
    if (activeStreamRef.current) {
      const audioTracks = activeStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => { track.enabled = !isAudioEnabled; });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const startPlaybackBroadcast = async (recording) => {
    try {
      if (isTeacherBroadcasting) await stopTeacherScreenShare();
      if (!mediasoup.isReady) await mediasoup.initMediasoup();

      const videoUrl = `${API_BASE_URL}${recording.filePath}`;

      let visibleVideo = playbackVideoRef.current;
      let attempts = 0;
      while (!visibleVideo && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        visibleVideo = playbackVideoRef.current;
        attempts++;
      }
      
      const hiddenVideo = document.createElement('video');
      hiddenVideo.style.display = 'none';
      document.body.appendChild(hiddenVideo);
      
      hiddenVideo.src = videoUrl;
      hiddenVideo.muted = false;
      hiddenVideo.loop = false;
      
      if (visibleVideo) {
        visibleVideo.src = videoUrl;
        visibleVideo.muted = false;
        visibleVideo.loop = false;
        visibleVideo.controls = true;
        visibleVideo.style.display = 'block';
      }

      await new Promise((resolve, reject) => {
        let loadedCount = 0;
        const onLoad = () => {
          loadedCount++;
          if (loadedCount === (visibleVideo ? 2 : 1)) resolve();
        };
        
        hiddenVideo.onloadedmetadata = onLoad;
        hiddenVideo.onerror = () => reject(new Error('Не удалось загрузить файл записи'));
        hiddenVideo.load();
        
        if (visibleVideo) {
          visibleVideo.onloadedmetadata = onLoad;
          visibleVideo.onerror = () => reject(new Error('Не удалось загрузить файл записи'));
          visibleVideo.load();
        }
      });

      setPlaybackDuration(hiddenVideo.duration);
      
      await hiddenVideo.play();
      if (visibleVideo) {
        await visibleVideo.play();
      }

      await mediasoup.startPlaybackBroadcast(hiddenVideo);

      setIsTeacherBroadcasting(true);
      setIsPlaybackBroadcasting(true);
      setPlaybackRecording(recording);
      setPlaybackState('playing');
      setPlaybackSessionId(recording.sessionId);

      if (socketRef.current) {
        socketRef.current.emit('teacher_start_playback_broadcast', {
          sessionId,
          recordingSessionId: recording.sessionId,
          recordingTitle: recording.title || recording.courseTitle || 'Запись занятия',
          recordingId: recording.id,
          recordingType: recording.type
        });
      }

      if (visibleVideo) {
        visibleVideo.ontimeupdate = () => {
          setPlaybackCurrentTime(visibleVideo.currentTime);
          if (Math.abs(hiddenVideo.currentTime - visibleVideo.currentTime) > 0.5) {
            hiddenVideo.currentTime = visibleVideo.currentTime;
          }
        };
        
        visibleVideo.onended = () => {
          setPlaybackState('stopped');
          setPlaybackCurrentTime(0);
          hiddenVideo.pause();
        };
      } else {
        hiddenVideo.ontimeupdate = () => {
          setPlaybackCurrentTime(hiddenVideo.currentTime);
        };
      }

      hiddenVideo.onended = () => {
        setPlaybackState('stopped');
        setPlaybackCurrentTime(0);
        if (visibleVideo) visibleVideo.pause();
      };

      window.__hiddenPlaybackVideo = hiddenVideo;

    } catch (err) {
      console.error('Ошибка запуска трансляции записи:', err);
      alert('Не удалось начать трансляцию записи: ' + err.message);
      setIsPlaybackBroadcasting(false);
      setPlaybackState('stopped');
      setPlaybackSessionId(null);
    }
  };

  const pausePlaybackBroadcast = () => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.pause();
      setPlaybackState('paused');
    }
    if (window.__hiddenPlaybackVideo) {
      window.__hiddenPlaybackVideo.pause();
    }
  };

  const resumePlaybackBroadcast = () => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.play().catch(console.error);
      setPlaybackState('playing');
    }
    if (window.__hiddenPlaybackVideo) {
      window.__hiddenPlaybackVideo.play().catch(console.error);
    }
  };

  const seekPlaybackBroadcast = (timeSeconds) => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.currentTime = timeSeconds;
      setPlaybackCurrentTime(timeSeconds);
    }
    if (window.__hiddenPlaybackVideo) {
      window.__hiddenPlaybackVideo.currentTime = timeSeconds;
    }
  };

  const stopPlaybackBroadcast = async () => {
    const visibleVideo = playbackVideoRef.current;
    if (visibleVideo) {
      visibleVideo.pause();
      visibleVideo.src = '';
      visibleVideo.ontimeupdate = null;
      visibleVideo.onended = null;
    }
    
    if (window.__hiddenPlaybackVideo) {
      window.__hiddenPlaybackVideo.pause();
      window.__hiddenPlaybackVideo.src = '';
      if (window.__hiddenPlaybackVideo.parentNode) {
        window.__hiddenPlaybackVideo.parentNode.removeChild(window.__hiddenPlaybackVideo);
      }
      window.__hiddenPlaybackVideo = null;
    }

    await mediasoup.stopPlaybackBroadcast();

    setLocalStream(null);
    setIsTeacherBroadcasting(false);
    setIsPlaybackBroadcasting(false);
    setPlaybackRecording(null);
    setPlaybackState('stopped');
    setPlaybackCurrentTime(0);
    setPlaybackSessionId(null);

    if (socketRef.current) {
      socketRef.current.emit('stop_screen_share', { sessionId, streamType: 'teacher_to_all' });
      socketRef.current.emit('teacher_stop_playback_broadcast', { sessionId });
    }
  };

  const startTeacherScreenShare = async () => {
    try {
      if (!mediasoup.isReady) {
        console.log('[Teacher] mediasoup не готов, инициализируем...');
        await mediasoup.initMediasoup();
      }
      if (!mediasoup.isReady) {
        throw new Error('mediasoup не удалось инициализировать');
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: true
      });
      
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true 
        } 
      });
      
      micStreamRef.current = micStream;
      screenStreamRef.current = stream;

      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(), 
        ...micStream.getAudioTracks()
      ]);
      setLocalStream(combinedStream);
      setIsTeacherBroadcasting(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        await mediasoup.clientRef.current.produce(videoTrack, 'screen', { 
          role: 'teacher', 
          type: 'screen', 
          target: 'all',
          kind: 'video'
        });
        videoTrack.onended = () => stopTeacherScreenShare();
        console.log('[Teacher] Screen video track produced');
      }
      
      const micTrack = micStream.getAudioTracks()[0];
      if (micTrack) {
        await mediasoup.clientRef.current.produce(micTrack, 'mic', { 
          role: 'teacher', 
          type: 'mic',
          kind: 'audio'
        });
        console.log('[Teacher] Mic audio track produced');
      }
      
      const screenAudioTrack = stream.getAudioTracks()[0];
      if (screenAudioTrack) {
        await mediasoup.clientRef.current.produce(screenAudioTrack, 'screen-audio', { 
          role: 'teacher', 
          type: 'screen-audio', 
          target: 'all',
          kind: 'audio'
        });
        console.log('[Teacher] Screen audio track produced');
      }

      if (socketRef.current) {
        socketRef.current.emit('teacher_start_screen_share', { 
          sessionId, 
          streamType: 'teacher_to_all' 
        });
      }
      console.log('[Teacher] Экран запущен через mediasoup');
    } catch (err) {
      console.error('Не удалось начать трансляцию:', err);
      alert('Не удалось получить доступ к экрану: ' + err.message);
      setIsTeacherBroadcasting(false);
    }
  };

  const stopTeacherScreenShare = async () => {
    if (mediasoup.clientRef.current) {
      await mediasoup.clientRef.current.closeProducer('screen');
      await mediasoup.clientRef.current.closeProducer('screen-audio');
      await mediasoup.clientRef.current.closeProducer('mic');
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    setLocalStream(null);
    setIsTeacherBroadcasting(false);
    if (socketRef.current) {
      socketRef.current.emit('stop_screen_share', { sessionId, streamType: 'teacher_to_all' });
    }
    console.log('[Teacher] Экран остановлен');
  };

  const requestStudentScreen = async (studentSocketId, studentName) => {
    if (!socketRef.current?.connected) {
      alert('Нет подключения к вебинару');
      return;
    }

    if (activeStudentScreen) {
      stopWatchingStudentScreen();
    }

    socketRef.current.emit('teacher_request_student_screen', {
      sessionId,
      studentSocketId,
      studentName
    });

    setActiveStudentScreen({
      studentSocketId,
      studentName,
      requestedAt: new Date()
    });

    setPendingScreenRequests(prev => [...prev, {
      studentSocketId,
      studentName,
      requestedAt: new Date()
    }]);
  };

  const stopWatchingStudentScreen = () => {
    if (activeStudentScreen) {
      if (mediasoup.clientRef.current) {
        mediasoup.clientRef.current.closeProducer(`student_screen_${activeStudentScreen.studentSocketId}`);
        mediasoup.clientRef.current.closeProducer(`student_screen_audio_${activeStudentScreen.studentSocketId}`);
      }
      
      if (socketRef.current) {
        socketRef.current.emit('stop_watching_student_screen', {
          sessionId,
          studentSocketId: activeStudentScreen.studentSocketId
        });
      }

      setActiveStudentScreen(null);
    }
  };

  const handleStudentScreenShareStarted = async ({ studentSocketId, studentName }) => {
    console.log(`[Teacher] Student ${studentName} started screen share`);
  };

  const handleStudentScreenShareStopped = ({ studentSocketId }) => {
    console.log(`[Teacher] Student ${studentSocketId} stopped screen share`);
    if (activeStudentScreen?.studentSocketId === studentSocketId) {
      setActiveStudentScreen(null);
    }
  };

  const handleStudentRequestRecordingMaterials = ({ recordingSessionId, studentSocketId }) => {
    if (socketRef.current && pastMaterials?.recordings) {
      const recording = pastMaterials.recordings.find(r => r.sessionId === recordingSessionId);
      if (recording) {
        socketRef.current.emit('recording_materials_response', {
          sessionId,
          studentSocketId,
          recordingSessionId,
          materials: recording.materials || [],
          comment: recording.comment || ''
        });
      }
    }
  };

  const fetchRecordings = () => {
    fetch(`${API_BASE_URL}/api/audio/session/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (isMountedRef.current) {
          const audioRecs = Array.isArray(data) ? data.filter(r => r.type !== 'video') : [];
          const videoRecs = Array.isArray(data) ? data.filter(r => r.type === 'video') : [];
          
          setRecordings(audioRecs);
          setVideoRecordings(videoRecs);
          
          const newTranscriptions = {};
          data.forEach(recording => {
            if (recording.transcription) {
              newTranscriptions[recording.id] = recording.transcription;
            }
          });
          setTranscriptions(newTranscriptions);
        }
      })
      .catch(() => {
        setRecordings([]);
        setVideoRecordings([]);
      });
  };

  const transcribeRecording = async (recordingId) => {
    if (transcribing[recordingId]) return;
    
    try {
      setTranscribing(prev => ({ ...prev, [recordingId]: true }));
      
      const recording = [...recordings, ...videoRecordings].find(r => r.id === recordingId);
      if (!recording) throw new Error('Запись не найдена');
      
      const audioResponse = await fetch(`${API_BASE_URL}${recording.filePath}`);
      const audioBlob = await audioResponse.blob();
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('format_output', 'true');
      
      const whisperResponse = await fetch(`${WHISPER_SERVER_URL}/transcribe`, {
        method: 'POST',
        body: formData
      });
      
      const result = await whisperResponse.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      const saveResponse = await fetch(`${API_BASE_URL}/api/audio/${recordingId}/transcription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: result.text,
          raw_text: result.raw_text,
          pauses_found: result.pauses_found,
          speech_analysis: result.speech_analysis,
          processing_time: result.processing_time
        })
      });
      
      if (!saveResponse.ok) throw new Error('Ошибка сохранения');
      
      setTranscriptions(prev => ({
        ...prev,
        [recordingId]: result.text
      }));
      
      fetchRecordings();
      
      const analysis = result.speech_analysis;
      const message = `Транскрипция готова\nАнализ:\nТип речи: ${analysis?.structure_type || 'не определен'}\nПауз найдено: ${result.pauses_found}\nТемп речи: ${Math.round(analysis?.speech_pace || 0)} слов/мин\nДлительность: ${Math.round(analysis?.total_duration || 0)}с\n\nТекст разбит на ${result.text.split('\n\n').length} абзацев`;
      
      alert(message);
      
    } catch (err) {
      console.error('Ошибка транскрибирования:', err);
      alert('Ошибка при транскрибации: ' + err.message);
    } finally {
      setTranscribing(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  const generateAISummary = async (recordingId, action = 'summary') => {
    const recording = [...recordings, ...videoRecordings].find(r => r.id === recordingId);
    if (!recording || !recording.transcription) {
      alert('Сначала выполните транскрипцию');
      return;
    }
    
    try {
      const response = await fetch(`${WHISPER_SERVER_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: recording.transcription,
          action: action
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetch(`${API_BASE_URL}/api/audio/${recordingId}/ai-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            [action === 'summary' ? 'aiSummary' : action === 'bullet_points' ? 'aiBulletPoints' : 'aiStructure']: result.summary 
          })
        });
        
        alert('AI конспект готов');
        fetchRecordings();
      } else {
        alert('Ошибка: ' + result.error);
      }
    } catch (err) {
      console.error('Ошибка генерации конспекта:', err);
      alert('Ошибка подключения к AI серверу');
    }
  };

  const handleOpenTranscriptionEditor = (recordingId) => {
    setEditingTranscription(recordingId);
  };

  const handleCloseTranscriptionEditor = () => {
    setEditingTranscription(null);
  };

  const handleSaveTranscription = (recordingId, newTranscription) => {
    setTranscriptions(prev => ({
      ...prev,
      [recordingId]: newTranscription
    }));
    fetchRecordings();
    handleCloseTranscriptionEditor();
  };

  const handleTranscriptionUpdate = (text) => {};

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playRecording = (filePath) => {
    const audioUrl = `${API_BASE_URL}${filePath}`;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.error('Ошибка воспроизведения:', err));
  };

  const playVideoRecording = (filePath) => {
    window.open(`${API_BASE_URL}${filePath}`, '_blank');
  };

  const deleteRecording = async (recordingId) => {
    if (!window.confirm('Удалить эту запись?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      setVideoRecordings(prev => prev.filter(r => r.id !== recordingId));
      
      setTranscriptions(prev => {
        const newTranscriptions = { ...prev };
        delete newTranscriptions[recordingId];
        return newTranscriptions;
      });
      
      alert('Запись удалена');
    } catch (err) {
      console.error('Ошибка удаления записи:', err);
      alert('Ошибка удаления записи');
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit('send_message', {
      sessionId,
      message: newMessage,
      senderType: 'teacher',
      senderId: teacher.id,
      senderName: teacher.name
    });

    setNewMessage('');
  };

  const finishWebinar = () => {
    if (window.confirm('Завершить вебинар?')) {
      fetch(`${API_BASE_URL}/api/sessions/${sessionId}/finish`, { method: 'POST' })
        .then(() => {
          onExit();
        })
        .catch(err => console.error('Ошибка завершения сессии:', err));
    }
  };

  const handleParticipantsList = (list) => {
    setParticipants(list);
    const students = list.filter(p => p.userType === 'student');
    setStudentsForMonitoring(students);
    studentsForMonitoringRef.current = students;
  };

  const handleUserJoined = (user) => {
    setParticipants(prev => {
      const exists = prev.some(p => 
        p.socketId === user.socketId || 
        (p.userId === user.userId && p.userType === user.userType)
      );
      
      if (exists) {
        return prev.map(p => 
          (p.userId === user.userId && p.userType === user.userType) ? user : p
        );
      } else {
        return [...prev, user];
      }
    });
    
    if (user.userType === 'student') {
      setStudentsForMonitoring(prev => {
        const exists = prev.some(s => s.userId === user.userId);
        let next;
        if (exists) {
          next = prev.map(s => s.userId === user.userId ? user : s);
        } else {
          next = [...prev, user];
        }
        studentsForMonitoringRef.current = next;
        return next;
      });
    }
  };

  const handleUserLeft = (user) => {
    setParticipants(prev => prev.filter(p => p.socketId !== user.socketId));
    if (user.userType === 'student') {
      setStudentsForMonitoring(prev => {
        const next = prev.filter(s => s.socketId !== user.socketId);
        studentsForMonitoringRef.current = next;
        return next;
      });
      if (activeStudentScreen?.studentSocketId === user.socketId) {
        setActiveStudentScreen(null);
      }
      setStudentAudioStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(user.socketId);
        return newMap;
      });
      const audioEl = studentAudioElementsRef.current.get(user.socketId);
      if (audioEl) {
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.remove();
        studentAudioElementsRef.current.delete(user.socketId);
      }
    }
  };

  useEffect(() => {
    if (!mediasoup.isReady) return;

    console.log('[Teacher] remoteStreams size:', mediasoup.remoteStreams.size);
    
    for (const [producerId, entry] of mediasoup.remoteStreams) {
      const ad = entry.appData || {};
      console.log(`[Teacher] Remote track: producerId=${producerId}, kind=${entry.kind}, type=${ad.type}, role=${ad.role}, studentId=${ad.studentId}`);
      
      if (ad.role === 'student' && ad.type === 'mic' && entry.kind === 'audio') {
        const studentId = ad.studentId || ad.socketId;
        console.log(`[Teacher] Got student mic audio from ${ad.studentName}, creating audio element`);
        
        let audioEl = studentAudioElementsRef.current.get(studentId);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
          studentAudioElementsRef.current.set(studentId, audioEl);
        }
        
        if (audioEl.srcObject !== entry.stream) {
          audioEl.srcObject = entry.stream;
          audioEl.play().catch(e => console.warn('Error playing student audio:', e));
        }
        
        setStudentAudioStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(studentId, {
            stream: entry.stream,
            studentName: ad.studentName,
            studentId: studentId
          });
          return newMap;
        });
      }
      
      if (ad.role === 'student' && ad.type === 'screen' && entry.kind === 'video') {
        console.log(`[Teacher] Got student screen video from ${ad.studentName}`);
        if (studentScreenVideoRef.current) {
          studentScreenVideoRef.current.srcObject = entry.stream;
          studentScreenVideoRef.current.play().catch(console.error);
        }
      }
      
      if (ad.role === 'student' && ad.type === 'screen-audio' && entry.kind === 'audio') {
        console.log(`[Teacher] Got student screen audio from ${ad.studentName}`);
        if (studentScreenVideoRef.current && studentScreenVideoRef.current.srcObject) {
          const existingStream = studentScreenVideoRef.current.srcObject;
          const audioTrack = entry.stream.getAudioTracks()[0];
          if (audioTrack && !existingStream.getAudioTracks().some(t => t.id === audioTrack.id)) {
            existingStream.addTrack(audioTrack);
            console.log('[Teacher] Added screen audio to student screen stream');
          }
        }
      }
    }
    
    return () => {
      for (const [id, audioEl] of studentAudioElementsRef.current) {
        if (audioEl) {
          audioEl.pause();
          audioEl.srcObject = null;
          audioEl.remove();
        }
      }
      studentAudioElementsRef.current.clear();
    };
  }, [mediasoup.remoteStreams, mediasoup.isReady]);

  useEffect(() => {
    isMountedRef.current = true;
    
    loadSessionInfo();
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);
    socketRef.current = newSocket;
    setConnectionStatus('connecting');

    newSocket.on('connect', () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('connected');
      newSocket.emit('join_webinar', {
        sessionId,
        userType: 'teacher',
        userId: teacher.id,
        userName: teacher.name
      });

      const sessionUrl = `${window.location.origin}/session/${sessionId}`;
      fetch(`${API_BASE_URL}/api/sessions/${sessionId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sessionUrl, teacherId: teacher.id })
      }).catch(err => console.warn('Не удалось сохранить ссылку на сессию:', err));

      setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('get_participants_list', { sessionId });
        }
      }, 500);

      setTimeout(() => {
        if (socketRef.current?.connected) {
          mediasoup.initMediasoup().catch(err => console.warn('mediasoup init failed:', err.message));
        }
      }, 1000);
    });

    newSocket.on('disconnect', () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('error');
    });

    newSocket.on('student_screen_share_started', handleStudentScreenShareStarted);
    newSocket.on('student_screen_share_stopped', handleStudentScreenShareStopped);
    newSocket.on('student_audio_toggle', ({ studentSocketId, enabled }) => {
      console.log(`Student ${studentSocketId} ${enabled ? 'enabled' : 'disabled'} audio`);
    });
    newSocket.on('student_request_recording_materials', handleStudentRequestRecordingMaterials);

    fetch(`${API_BASE_URL}/api/messages/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (isMountedRef.current) {
          setMessages(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => setMessages([]));

    fetchRecordings();

    return () => {
      isMountedRef.current = false;
      mediasoup.cleanup();
      if (socketRef.current?.connected) {
        socketRef.current.emit('leave_webinar', { sessionId });
        socketRef.current.disconnect();
      }
      stopTeacherScreenShare();
      stopTeacherVideo();
      stopWatchingStudentScreen();
      if (playbackVideoRef.current) {
        playbackVideoRef.current.pause();
        playbackVideoRef.current.src = '';
      }
      if (window.__hiddenPlaybackVideo) {
        window.__hiddenPlaybackVideo.pause();
        window.__hiddenPlaybackVideo.src = '';
        if (window.__hiddenPlaybackVideo.parentNode) {
          window.__hiddenPlaybackVideo.parentNode.removeChild(window.__hiddenPlaybackVideo);
        }
        window.__hiddenPlaybackVideo = null;
      }
    };
  }, [sessionId, teacher.id, teacher.name]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (message) => setMessages(prev => [...prev, message]);
    const handleAudioRecordingAdded = (data) => {
      if (data.recording.type === 'video') {
        setVideoRecordings(prev => [data.recording, ...prev]);
      } else {
        setRecordings(prev => [data.recording, ...prev]);
      }
      
      if (data.recording.transcription) {
        setTranscriptions(prev => ({
          ...prev,
          [data.recording.id]: data.recording.transcription
        }));
      }
    };
    const handleVideoRecordingAdded = (data) => {
      setVideoRecordings(prev => [data.recording, ...prev]);
      if (data.recording.transcription) {
        setTranscriptions(prev => ({
          ...prev,
          [data.recording.id]: data.recording.transcription
        }));
      }
    };

    socketRef.current.on('new_message', handleNewMessage);
    socketRef.current.on('participants_list', handleParticipantsList);
    socketRef.current.on('user_joined', handleUserJoined);
    socketRef.current.on('user_left', handleUserLeft);
    socketRef.current.on('audio_recording_added', handleAudioRecordingAdded);
    socketRef.current.on('video_recording_added', handleVideoRecordingAdded);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message', handleNewMessage);
        socketRef.current.off('participants_list', handleParticipantsList);
        socketRef.current.off('user_joined', handleUserJoined);
        socketRef.current.off('user_left', handleUserLeft);
        socketRef.current.off('audio_recording_added', handleAudioRecordingAdded);
        socketRef.current.off('video_recording_added', handleVideoRecordingAdded);
      }
    };
  }, []);

  useEffect(() => {
    if (teacherVideoRef.current && localStream) {
      teacherVideoRef.current.srcObject = localStream;
      teacherVideoRef.current.play().catch(err => {
        console.error('Ошибка воспроизведения превью преподавателя:', err);
      });
    } else if (teacherVideoRef.current && !localStream) {
      teacherVideoRef.current.srcObject = null;
    }
  }, [localStream]);

  return (
    <WebinarTeacherView
      sessionId={sessionId}
      teacher={teacher}
      onExit={onExit}
      messages={messages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      participants={participants}
      studentsForMonitoring={studentsForMonitoring}
      connectionStatus={connectionStatus}
      localStream={localStream}
      isTeacherBroadcasting={isTeacherBroadcasting}
      activeStudentScreen={activeStudentScreen}
      pendingScreenRequests={pendingScreenRequests}
      recordings={recordings}
      videoRecordings={videoRecordings}
      transcriptions={transcriptions}
      transcribing={transcribing}
      editingTranscription={editingTranscription}
      messagesEndRef={messagesEndRef}
      studentVideoRef={studentVideoRef}
      studentScreenVideoRef={studentScreenVideoRef}
      teacherVideoRef={teacherVideoRef}
      socketRef={socketRef}
      startTeacherScreenShare={startTeacherScreenShare}
      stopTeacherScreenShare={stopTeacherScreenShare}
      requestStudentScreen={requestStudentScreen}
      stopWatchingStudentScreen={stopWatchingStudentScreen}
      fetchRecordings={fetchRecordings}
      handleOpenTranscriptionEditor={handleOpenTranscriptionEditor}
      handleCloseTranscriptionEditor={handleCloseTranscriptionEditor}
      handleSaveTranscription={handleSaveTranscription}
      handleTranscriptionUpdate={handleTranscriptionUpdate}
      formatTime={formatTime}
      playRecording={playRecording}
      playVideoRecording={playVideoRecording}
      deleteRecording={deleteRecording}
      transcribeRecording={transcribeRecording}
      sendMessage={sendMessage}
      finishWebinar={finishWebinar}
      localVideoStream={localStream}
      isVideoEnabled={isWebcamActive}
      isAudioEnabled={isAudioEnabled}
      activeStudentVideo={activeStudentVideo}
      startTeacherVideo={startTeacherVideo}
      stopTeacherVideo={stopTeacherVideo}
      toggleTeacherAudio={toggleTeacherAudio}
      setActiveStudentVideo={setActiveStudentVideo}
      isPlaybackBroadcasting={isPlaybackBroadcasting}
      playbackRecording={playbackRecording}
      playbackState={playbackState}
      playbackCurrentTime={playbackCurrentTime}
      playbackDuration={playbackDuration}
      startPlaybackBroadcast={startPlaybackBroadcast}
      pausePlaybackBroadcast={pausePlaybackBroadcast}
      resumePlaybackBroadcast={resumePlaybackBroadcast}
      seekPlaybackBroadcast={seekPlaybackBroadcast}
      stopPlaybackBroadcast={stopPlaybackBroadcast}
      pastMaterials={pastMaterials}
      showPastMaterials={showPastMaterials}
      setShowPastMaterials={setShowPastMaterials}
      loadingMaterials={loadingMaterials}
      fetchPastMaterials={fetchPastMaterials}
      sessionInfo={sessionInfo}
      generateAISummary={generateAISummary}
      kickStudent={kickStudent}
      studentAudioStreams={studentAudioStreams}
      activeStudentAudio={activeStudentAudio}
      setActiveStudentAudio={setActiveStudentAudio}
      playbackVideoRef={playbackVideoRef}
    />
  );
};

export default WebinarTeacher;