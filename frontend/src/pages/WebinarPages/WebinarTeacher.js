import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import WebinarTeacherView from './WebinarTeacherView';
import AudioRecorder from '../../components/webinar/AudioRecorder';
import VideoRecorder from '../../components/webinar/VideoRecorder';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

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
  const [studentScreenStreams, setStudentScreenStreams] = useState(new Map());
  const [peerConnections, setPeerConnections] = useState(new Map());
  const [isTeacherBroadcasting, setIsTeacherBroadcasting] = useState(false);
  const [activeStudentScreen, setActiveStudentScreen] = useState(null);
  const [pendingScreenRequests, setPendingScreenRequests] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [videoRecordings, setVideoRecordings] = useState([]);
  const [transcriptions, setTranscriptions] = useState({});
  const [transcribing, setTranscribing] = useState({});
  const [editingTranscription, setEditingTranscription] = useState(null);
  const [liveTranscription, setLiveTranscription] = useState('');
  
  // Состояния для видео и аудио
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [studentVideoStreams, setStudentVideoStreams] = useState(new Map());
  const [activeStudentVideo, setActiveStudentVideo] = useState(null);

  // ─── Состояния для трансляции записи ───
  const [isPlaybackBroadcasting, setIsPlaybackBroadcasting] = useState(false);
  const [playbackRecording, setPlaybackRecording] = useState(null);
  const [playbackState, setPlaybackState] = useState('stopped'); // 'stopped' | 'playing' | 'paused'
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const playbackVideoRef = useRef(null);   // скрытый <video> для воспроизведения файла
  const playbackStreamRef = useRef(null);  // captureStream из скрытого video
  
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const teacherPeerConnectionsRef = useRef(new Map());
  const teacherVideoConnectionsRef = useRef(new Map());
  const studentVideoRef = useRef(null);
  const teacherVideoRef = useRef(null);

  const micStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const webcamRawStreamRef = useRef(null);
  const activeStreamRef = useRef(null);

  // ─── Включить вебкамеру ───
  const startTeacherVideo = async () => {
    try {
      const webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      webcamRawStreamRef.current = webcamStream;
      const webcamTrack = webcamStream.getVideoTracks()[0];

      if (activeStreamRef.current) {
        const oldVideoTrack = activeStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          activeStreamRef.current.removeTrack(oldVideoTrack);
        }
        activeStreamRef.current.addTrack(webcamTrack);

        teacherPeerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(webcamTrack).catch(err =>
              console.error('replaceTrack webcam error:', err)
            );
          }
        });

        setLocalStream(new MediaStream(activeStreamRef.current.getTracks()));
      } else {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
        micStreamRef.current = mic;
        const stream = new MediaStream([webcamTrack, ...mic.getAudioTracks()]);
        activeStreamRef.current = stream;
        setLocalStream(stream);
        setIsTeacherBroadcasting(true);
        _broadcastActiveStreamToStudents();
      }

      setIsWebcamActive(true);
      if (socketRef.current) {
        socketRef.current.emit('teacher_start_video_broadcast', {
          sessionId, teacherId: teacher.id, teacherName: teacher.name
        });
      }
    } catch (err) {
      console.error('Ошибка включения камеры:', err);
      alert('Не удалось получить доступ к камере: ' + err.message);
    }
  };

  // ─── Выключить вебкамеру ───
  const stopTeacherVideo = () => {
    if (!webcamRawStreamRef.current) return;

    const webcamTrack = webcamRawStreamRef.current.getVideoTracks()[0];
    if (webcamTrack) webcamTrack.stop();
    webcamRawStreamRef.current = null;

    if (activeStreamRef.current && screenStreamRef.current) {
      const oldTrack = activeStreamRef.current.getVideoTracks()[0];
      if (oldTrack) activeStreamRef.current.removeTrack(oldTrack);

      const screenTrack = screenStreamRef.current.getVideoTracks()[0];
      if (screenTrack && screenTrack.readyState !== 'ended') {
        activeStreamRef.current.addTrack(screenTrack);

        teacherPeerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack).catch(err =>
              console.error('replaceTrack screen error:', err)
            );
          }
        });
      }
      setLocalStream(new MediaStream(activeStreamRef.current.getTracks()));
    } else if (activeStreamRef.current && !screenStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(t => t.stop());
      activeStreamRef.current = null;
      setLocalStream(null);
      setIsTeacherBroadcasting(false);
      teacherPeerConnectionsRef.current.forEach(pc => pc.close());
      teacherPeerConnectionsRef.current.clear();
      if (socketRef.current) {
        socketRef.current.emit('stop_screen_share', { sessionId, streamType: 'teacher_to_all' });
      }
    }

    setIsWebcamActive(false);
    if (socketRef.current) {
      socketRef.current.emit('teacher_stop_video_broadcast', { sessionId });
    }
  };

  const toggleTeacherAudio = () => {
    if (activeStreamRef.current) {
      const audioTracks = activeStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => { track.enabled = !isAudioEnabled; });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // ─── Вспомогательная функция: рассылает activeStream студентам ───
  const _broadcastActiveStreamToStudents = async () => {
    const stream = activeStreamRef.current;
    if (!stream) return;

    const studentSocketIds = studentsForMonitoring.map(s => s.socketId);

    for (const studentSocketId of studentSocketIds) {
      if (teacherPeerConnectionsRef.current.has(studentSocketId)) continue;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer({ offerToReceiveVideo: false, offerToReceiveAudio: false });
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('teacher_send_offer_to_students', {
          sessionId, studentSocketIds: [studentSocketId], sdp: offer
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('webrtc_ice_candidate', { to: studentSocketId, candidate: event.candidate });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') console.error('Соединение с ' + studentSocketId + ' не удалось');
      };

      teacherPeerConnectionsRef.current.set(studentSocketId, pc);
    }

    if (socketRef.current) {
      socketRef.current.emit('teacher_start_screen_share', { sessionId, streamType: 'teacher_to_all' });
    }
  };

  // ─── ТРАНСЛЯЦИЯ ЗАПИСИ ───────────────────────────────────────────────

  /**
   * Запускает трансляцию выбранной записи студентам.
   * Принцип: создаём скрытый <video>, грузим файл, захватываем captureStream(),
   * кидаем треки через WebRTC точно как при трансляции экрана.
   */
  const startPlaybackBroadcast = async (recording) => {
    try {
      // Останавливаем другие трансляции если есть
      if (isTeacherBroadcasting) stopTeacherScreenShare();

      const videoUrl = `${API_BASE_URL}${recording.filePath}`;

      // Создаём или переиспользуем скрытый video-элемент
      let hiddenVideo = playbackVideoRef.current;
      if (!hiddenVideo) {
        hiddenVideo = document.createElement('video');
        hiddenVideo.style.display = 'none';
        hiddenVideo.crossOrigin = 'anonymous';
        document.body.appendChild(hiddenVideo);
        playbackVideoRef.current = hiddenVideo;
      }

      hiddenVideo.src = videoUrl;
      hiddenVideo.muted = false;
      hiddenVideo.loop = false;

      // Ждём загрузки метаданных
      await new Promise((resolve, reject) => {
        hiddenVideo.onloadedmetadata = resolve;
        hiddenVideo.onerror = () => reject(new Error('Не удалось загрузить файл записи'));
        hiddenVideo.load();
      });

      setPlaybackDuration(hiddenVideo.duration);

      // Захватываем поток из video
      const capturedStream = hiddenVideo.captureStream
        ? hiddenVideo.captureStream()
        : hiddenVideo.mozCaptureStream
          ? hiddenVideo.mozCaptureStream()
          : null;

      if (!capturedStream) {
        throw new Error('captureStream не поддерживается в этом браузере');
      }

      playbackStreamRef.current = capturedStream;
      activeStreamRef.current = capturedStream;

      // Показываем в teacherVideoRef как превью
      setLocalStream(new MediaStream(capturedStream.getTracks()));
      setIsTeacherBroadcasting(true);
      setIsPlaybackBroadcasting(true);
      setPlaybackRecording(recording);
      setPlaybackState('playing');

      // Рассылаем студентам
      await _broadcastActiveStreamToStudents();

      // Запускаем воспроизведение
      await hiddenVideo.play();

      // Обновляем текущее время
      hiddenVideo.ontimeupdate = () => {
        setPlaybackCurrentTime(hiddenVideo.currentTime);
      };

      // Конец записи
      hiddenVideo.onended = () => {
        setPlaybackState('stopped');
        setPlaybackCurrentTime(0);
      };

    } catch (err) {
      console.error('Ошибка запуска трансляции записи:', err);
      alert('Не удалось начать трансляцию записи: ' + err.message);
      setIsPlaybackBroadcasting(false);
      setPlaybackState('stopped');
    }
  };

  const pausePlaybackBroadcast = () => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.pause();
      setPlaybackState('paused');
    }
  };

  const resumePlaybackBroadcast = () => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.play().catch(console.error);
      setPlaybackState('playing');
    }
  };

  const seekPlaybackBroadcast = (timeSeconds) => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.currentTime = timeSeconds;
      setPlaybackCurrentTime(timeSeconds);
    }
  };

  const stopPlaybackBroadcast = () => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.pause();
      playbackVideoRef.current.src = '';
      playbackVideoRef.current.ontimeupdate = null;
      playbackVideoRef.current.onended = null;
    }

    playbackStreamRef.current = null;

    // Останавливаем WebRTC трансляцию
    activeStreamRef.current?.getTracks().forEach(t => t.stop());
    activeStreamRef.current = null;

    teacherPeerConnectionsRef.current.forEach(pc => pc.close());
    teacherPeerConnectionsRef.current.clear();

    setLocalStream(null);
    setIsTeacherBroadcasting(false);
    setIsPlaybackBroadcasting(false);
    setPlaybackRecording(null);
    setPlaybackState('stopped');
    setPlaybackCurrentTime(0);

    if (socketRef.current) {
      socketRef.current.emit('stop_screen_share', { sessionId, streamType: 'teacher_to_all' });
    }
  };

  // ────────────────────────────────────────────────────────────────────

  const handleStudentVideoOffer = async ({ from, sdp }) => {
    console.log('Получен видео оффер от студента', from);
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.ontrack = (event) => {
      console.log('Получен видео/аудио трек от студента', from);
      if (event.streams && event.streams[0]) {
        setStudentVideoStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(from, event.streams[0]);
          return newMap;
        });
        
        const student = studentsForMonitoring.find(s => s.socketId === from);
        if (student) {
          setActiveStudentVideo({
            studentSocketId: from,
            studentName: student.userName
          });
        }
      }
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit('webrtc_ice_candidate', {
          to: from,
          candidate: event.candidate
        });
      }
    };
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc_answer', { to: from, sdp: answer });
      }
      
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.set(from, pc);
        return newMap;
      });
    } catch (err) {
      console.error('Ошибка обработки видео оффера студента:', err);
    }
  };

  const handleStudentVideoStopped = ({ studentSocketId }) => {
    console.log('Студент выключил видео', studentSocketId);
    setStudentVideoStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(studentSocketId);
      return newMap;
    });
    
    if (activeStudentVideo?.studentSocketId === studentSocketId) {
      setActiveStudentVideo(null);
    }
    
    const pc = peerConnections.get(studentSocketId);
    if (pc) {
      pc.close();
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(studentSocketId);
        return newMap;
      });
    }
  };

  const handleStudentAudioToggle = ({ studentSocketId, enabled }) => {
    console.log(`Студент ${studentSocketId} ${enabled ? 'включил' : 'выключил'} звук`);
  };

  // ─── Трансляция экрана ───
  const startTeacherScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      micStreamRef.current = micStream;
      screenStreamRef.current = screenStream;

      if (activeStreamRef.current) {
        const oldVideo = activeStreamRef.current.getVideoTracks()[0];
        if (oldVideo) activeStreamRef.current.removeTrack(oldVideo);
        activeStreamRef.current.addTrack(screenStream.getVideoTracks()[0]);

        const oldAudio = activeStreamRef.current.getAudioTracks()[0];
        if (oldAudio) activeStreamRef.current.removeTrack(oldAudio);
        activeStreamRef.current.addTrack(micStream.getAudioTracks()[0]);

        teacherPeerConnectionsRef.current.forEach((pc) => {
          const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
          const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
          if (videoSender) videoSender.replaceTrack(screenStream.getVideoTracks()[0]).catch(console.error);
          if (audioSender) audioSender.replaceTrack(micStream.getAudioTracks()[0]).catch(console.error);
        });

        setLocalStream(new MediaStream(activeStreamRef.current.getTracks()));
      } else {
        const combined = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...micStream.getAudioTracks()
        ]);
        activeStreamRef.current = combined;
        setLocalStream(combined);
        setIsTeacherBroadcasting(true);
        await _broadcastActiveStreamToStudents();
      }

      screenStream.getVideoTracks()[0].onended = () => stopTeacherScreenShare();

    } catch (err) {
      console.error('Не удалось начать трансляцию:', err);
      alert('Не удалось получить доступ к экрану');
      setIsTeacherBroadcasting(false);
    }
  };

  const stopTeacherScreenShare = () => {
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    if (isWebcamActive && webcamRawStreamRef.current) {
      const webcamTrack = webcamRawStreamRef.current.getVideoTracks()[0];
      if (webcamTrack && webcamTrack.readyState !== 'ended') {
        if (activeStreamRef.current) {
          const oldVideo = activeStreamRef.current.getVideoTracks()[0];
          if (oldVideo) activeStreamRef.current.removeTrack(oldVideo);
          activeStreamRef.current.addTrack(webcamTrack);

          teacherPeerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(webcamTrack).catch(console.error);
          });
          setLocalStream(new MediaStream(activeStreamRef.current.getTracks()));
        }
        return;
      }
    }

    activeStreamRef.current?.getTracks().forEach(t => t.stop());
    activeStreamRef.current = null;

    teacherPeerConnectionsRef.current.forEach((pc) => pc.close());
    teacherPeerConnectionsRef.current.clear();

    setLocalStream(null);
    setIsTeacherBroadcasting(false);

    if (socketRef.current) {
      socketRef.current.emit('stop_screen_share', { sessionId, streamType: 'teacher_to_all' });
    }
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
      studentSocketId
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
      socketRef.current.emit('stop_screen_share', {
        sessionId,
        streamType: 'student_screen_share',
        targetSocketId: activeStudentScreen.studentSocketId
      });

      const pc = peerConnections.get(activeStudentScreen.studentSocketId);
      if (pc) {
        pc.close();
        setPeerConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(activeStudentScreen.studentSocketId);
          return newMap;
        });
      }

      setStudentScreenStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(activeStudentScreen.studentSocketId);
        return newMap;
      });

      setActiveStudentScreen(null);
    }
  };

  const handleStudentScreenShareStopped = ({ studentSocketId }) => {
    setStudentScreenStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(studentSocketId);
      return newMap;
    });
    setActiveStudentScreen(null);

    const pc = peerConnections.get(studentSocketId);
    if (pc) {
      pc.close();
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(studentSocketId);
        return newMap;
      });
    }
  };

  const handleWebrtcAnswer = async ({ from, sdp }) => {
    const pc = teacherPeerConnectionsRef.current.get(from);
    if (pc && pc.signalingState !== 'closed') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Ошибка установки remote description:', err);
      }
    }
    
    const videoPc = teacherVideoConnectionsRef.current.get(from);
    if (videoPc && videoPc.signalingState !== 'closed') {
      try {
        await videoPc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Ошибка установки remote description для видео:', err);
      }
    }
  };

  const handleWebrtcIceCandidate = ({ from, candidate }) => {
    const pc = teacherPeerConnectionsRef.current.get(from);
    if (pc && candidate) {
      try {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Ошибка добавления ICE кандидата:', err);
      }
    }
    
    const videoPc = teacherVideoConnectionsRef.current.get(from);
    if (videoPc && candidate) {
      try {
        videoPc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Ошибка добавления ICE кандидата для видео:', err);
      }
    }
  };

  const handleStudentWebrtcOffer = async ({ from, sdp, streamType }) => {
    if (streamType === 'student_to_teacher') {
      console.log('Получен оффер от студента ' + from);

      const pc = new RTCPeerConnection();

      pc.ontrack = (event) => {
        console.log('Получен трек от студента ' + from, event.streams);
        if (event.streams && event.streams[0]) {
          console.log('Поток студента ' + from + ' готов');
          setStudentScreenStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(from, event.streams[0]);
            return newMap;
          });

          setPendingScreenRequests(prev => 
            prev.filter(req => req.studentSocketId !== from)
          );
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('webrtc_ice_candidate', { to: from, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          console.log('СОЕДИНЕНИЕ С ' + from + ' УСТАНОВЛЕНО!');
        } else if (pc.connectionState === 'failed') {
          console.error('СОЕДИНЕНИЕ С ' + from + ' НЕ УДАЛОСЬ!');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE состояние с ' + from + ':', pc.iceConnectionState);
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('Remote description установлен для ' + from);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Answer создан для ' + from);
         
        if (socketRef.current) {
          socketRef.current.emit('webrtc_answer', { to: from, sdp: answer });
        }

        setPeerConnections(prev => {
          const newMap = new Map(prev);
          newMap.set(from, pc);
          return newMap;
        });
        
        console.log('Соединение с ' + from + ' готово');
      } catch (err) {
        console.error('Ошибка обработки оффера студента ' + from + ':', err);
        pc.close();
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

  const handleTranscriptionUpdate = (text) => {
    setLiveTranscription(text);
  };

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

  const transcribeRecording = async (recordingId) => {
    if (transcribing[recordingId]) return;
    try {
      setTranscribing(prev => ({ ...prev, [recordingId]: true }));

      const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}/transcribe`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setTranscriptions(prev => ({
          ...prev,
          [recordingId]: result.text
        }));
        
        const updatedRecordings = [...recordings, ...videoRecordings].map(rec => 
          rec.id === recordingId 
            ? { ...rec, transcription: result.text }
            : rec
        );
        
        setRecordings(updatedRecordings.filter(r => r.type !== 'video'));
        setVideoRecordings(updatedRecordings.filter(r => r.type === 'video'));
        
        alert('Транскрипция готова! Слов: ' + (result.wordCount || 'неизвестно'));
      } else {
        alert('Ошибка: ' + (result.error || 'неизвестно'));
      }
    } catch (err) {
      console.error('Ошибка транскрибирования:', err);
      alert('Не удалось подключиться к сервису транскрибирования');
    } finally {
      setTranscribing(prev => ({ ...prev, [recordingId]: false }));
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
    setStudentsForMonitoring(list.filter(p => p.userType === 'student'));
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
        if (exists) {
          return prev.map(s => s.userId === user.userId ? user : s);
        } else {
          return [...prev, user];
        }
      });
      
      if (isTeacherBroadcasting && activeStreamRef.current) {
        const establishConnection = async () => {
          const stream = activeStreamRef.current;
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          });

          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          const offer = await pc.createOffer({ offerToReceiveVideo: false, offerToReceiveAudio: false });
          await pc.setLocalDescription(offer);

          if (socketRef.current) {
            socketRef.current.emit('teacher_send_offer_to_students', {
              sessionId, studentSocketIds: [user.socketId], sdp: offer
            });
          }

          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current?.connected) {
              socketRef.current.emit('webrtc_ice_candidate', { to: user.socketId, candidate: event.candidate });
            }
          };

          teacherPeerConnectionsRef.current.set(user.socketId, pc);
        };
        establishConnection().catch(console.error);
      }
    }
  };

  const handleUserLeft = (user) => {
    setParticipants(prev => prev.filter(p => p.socketId !== user.socketId));
    if (user.userType === 'student') {
      setStudentsForMonitoring(prev => prev.filter(s => s.socketId !== user.socketId));
      if (activeStudentScreen?.studentSocketId === user.socketId) {
        setActiveStudentScreen(null);
        setStudentScreenStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(user.socketId);
          return newMap;
        });
      }
      const videoPc = teacherVideoConnectionsRef.current.get(user.socketId);
      if (videoPc) {
        videoPc.close();
        teacherVideoConnectionsRef.current.delete(user.socketId);
      }
      setStudentVideoStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(user.socketId);
        return newMap;
      });
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
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

      setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('get_participants_list', { sessionId });
        }
      }, 500);
    });

    newSocket.on('disconnect', () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('error');
    });

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
      if (socketRef.current?.connected) {
        socketRef.current.emit('leave_webinar', { sessionId });
        socketRef.current.disconnect();
      }
      stopTeacherScreenShare();
      stopTeacherVideo();
      stopWatchingStudentScreen();
      // Очищаем скрытый video-элемент при размонтировании
      if (playbackVideoRef.current) {
        playbackVideoRef.current.pause();
        playbackVideoRef.current.src = '';
        if (playbackVideoRef.current.parentNode) {
          playbackVideoRef.current.parentNode.removeChild(playbackVideoRef.current);
        }
        playbackVideoRef.current = null;
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

    socketRef.current.on('student_screen_share_stopped', handleStudentScreenShareStopped);
    socketRef.current.on('webrtc_answer', handleWebrtcAnswer);
    socketRef.current.on('webrtc_ice_candidate', handleWebrtcIceCandidate);
    socketRef.current.on('student_webrtc_offer', handleStudentWebrtcOffer);
    socketRef.current.on('new_message', handleNewMessage);
    socketRef.current.on('participants_list', handleParticipantsList);
    socketRef.current.on('user_joined', handleUserJoined);
    socketRef.current.on('user_left', handleUserLeft);
    socketRef.current.on('audio_recording_added', handleAudioRecordingAdded);
    socketRef.current.on('video_recording_added', handleVideoRecordingAdded);
    socketRef.current.on('student_video_offer', handleStudentVideoOffer);
    socketRef.current.on('student_video_stopped', handleStudentVideoStopped);
    socketRef.current.on('student_audio_toggle', handleStudentAudioToggle);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('student_screen_share_stopped', handleStudentScreenShareStopped);
        socketRef.current.off('webrtc_answer', handleWebrtcAnswer);
        socketRef.current.off('webrtc_ice_candidate', handleWebrtcIceCandidate);
        socketRef.current.off('student_webrtc_offer', handleStudentWebrtcOffer);
        socketRef.current.off('new_message', handleNewMessage);
        socketRef.current.off('participants_list', handleParticipantsList);
        socketRef.current.off('user_joined', handleUserJoined);
        socketRef.current.off('user_left', handleUserLeft);
        socketRef.current.off('audio_recording_added', handleAudioRecordingAdded);
        socketRef.current.off('video_recording_added', handleVideoRecordingAdded);
        socketRef.current.off('student_video_offer', handleStudentVideoOffer);
        socketRef.current.off('student_video_stopped', handleStudentVideoStopped);
        socketRef.current.off('student_audio_toggle', handleStudentAudioToggle);
      }
    };
  }, [peerConnections, activeStudentScreen]);

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

  useEffect(() => {
    if (studentVideoRef.current && activeStudentScreen) {
      const stream = studentScreenStreams.get(activeStudentScreen.studentSocketId);
      
      if (stream) {
        console.log('Установка потока экрана студента в видео элемент:', activeStudentScreen.studentSocketId);
        studentVideoRef.current.srcObject = stream;
        
        const handleLoadedMetadata = () => {
          console.log('Видео студента готово к воспроизведению');
          studentVideoRef.current.play().catch(err => {
            console.error('Ошибка воспроизведения:', err);
          });
        };
        
        studentVideoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        return () => {
          if (studentVideoRef.current) {
            studentVideoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          }
        };
      } else {
        console.log('Поток НЕ найден для студента:', activeStudentScreen.studentSocketId);
        studentVideoRef.current.srcObject = null;
      }
    }
    
    if (studentVideoRef.current && activeStudentVideo) {
      const videoStream = studentVideoStreams.get(activeStudentVideo.studentSocketId);
      
      if (videoStream) {
        console.log('Установка видео потока студента:', activeStudentVideo.studentSocketId);
        studentVideoRef.current.srcObject = videoStream;
        
        const handleLoadedMetadata = () => {
          studentVideoRef.current.play().catch(err => {
            console.error('Ошибка воспроизведения видео студента:', err);
          });
        };
        
        studentVideoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        return () => {
          if (studentVideoRef.current) {
            studentVideoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          }
        };
      }
    }
  }, [activeStudentScreen, studentScreenStreams, activeStudentVideo, studentVideoStreams]);

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
      studentScreenStreams={studentScreenStreams}
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
      studentVideoStreams={studentVideoStreams}
      activeStudentVideo={activeStudentVideo}
      startTeacherVideo={startTeacherVideo}
      stopTeacherVideo={stopTeacherVideo}
      toggleTeacherAudio={toggleTeacherAudio}
      setActiveStudentVideo={setActiveStudentVideo}
      // ── трансляция записи ──
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
    />
  );
};

export default WebinarTeacher;