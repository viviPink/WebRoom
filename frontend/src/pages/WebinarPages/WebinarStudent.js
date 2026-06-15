import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import WebinarStudentView from './WebinarStudentView';
import useMediasoup from '../../hooks/useMediasoup';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const SOCKET_URL = API_BASE_URL;

const WebinarStudent = ({ sessionId, student, onExit }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [teacherPresent, setTeacherPresent] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherSocketId, setTeacherSocketId] = useState(null);
  const [teacherScreenActive, setTeacherScreenActive] = useState(false);
  const [teacherScreenStream, setTeacherScreenStream] = useState(null);
  
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [micStream, setMicStream] = useState(null);
  
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [incomingScreenRequest, setIncomingScreenRequest] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackRecordingInfo, setPlaybackRecordingInfo] = useState(null);
  
  const [mentionModalData, setMentionModalData] = useState(null);
  const [sessionComment, setSessionComment] = useState('');
  const [sessionMaterials, setSessionMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const screenProducerIdRef = useRef(null);
  const micProducerIdRef = useRef(null);

  const teacherScreenVideoRef = useRef(null);
  const teacherCameraVideoRef = useRef(null);
  const studentScreenPreviewRef = useRef(null);

  const teacherScreenCombinedStreamRef = useRef(new MediaStream());
  const teacherScreenTrackIdsRef = useRef('');

  const mediasoup = useMediasoup(socketRef, sessionId, 'student');

  const loadSessionMaterialsById = async (targetSessionId) => {
    if (!targetSessionId) return;
    setMaterialsLoading(true);
    try {
      const [matRes, commentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/materials/session/${targetSessionId}`),
        fetch(`${API_BASE_URL}/api/sessions/${targetSessionId}/comment`)
      ]);
      if (matRes.ok) {
        const data = await matRes.json();
        setSessionMaterials(Array.isArray(data) ? data : []);
      } else {
        setSessionMaterials([]);
      }
      if (commentRes.ok) {
        const data = await commentRes.json();
        setSessionComment(data.comment || '');
      } else {
        setSessionComment('');
      }
    } catch (err) {
      console.error('Ошибка загрузки материалов:', err);
      setSessionMaterials([]);
      setSessionComment('');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const loadSessionMaterials = async () => {
    await loadSessionMaterialsById(sessionId);
  };

  const toggleMicrophone = async () => {
    console.log('[Student] toggleMicrophone called, current state:', isMicEnabled);
    
    if (isMicEnabled) {
      console.log('[Student] Disabling microphone...');
      try {
        if (micProducerIdRef.current && mediasoup.clientRef.current) {
          await mediasoup.clientRef.current.closeProducer('mic');
          micProducerIdRef.current = null;
          console.log('[Student] Mic producer closed');
        }
        if (micStream) {
          micStream.getTracks().forEach(track => {
            track.stop();
            console.log('[Student] Mic track stopped');
          });
          setMicStream(null);
        }
        setIsMicEnabled(false);
        
        if (socketRef.current && teacherSocketId) {
          socketRef.current.emit('student_audio_toggle', {
            sessionId,
            to: teacherSocketId,
            enabled: false
          });
        }
        console.log('[Student] Microphone disabled');
      } catch (err) {
        console.error('[Student] Error disabling microphone:', err);
      }
    } else {
      console.log('[Student] Enabling microphone...');
      try {
        if (!mediasoup.isReady) {
          console.log('[Student] mediasoup not ready, initializing...');
          await mediasoup.initMediasoup();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!mediasoup.clientRef.current) {
          throw new Error('mediasoup client not initialized');
        }
        
        console.log('[Student] Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        console.log('[Student] Got mic stream, tracks:', stream.getAudioTracks().length);
        setMicStream(stream);
        
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          console.log('[Student] Creating mic producer...');
          const producer = await mediasoup.clientRef.current.produce(audioTrack, 'mic', {
            role: 'student',
            type: 'mic',
            kind: 'audio',
            studentId: student.id,
            studentName: student.full_name,
            socketId: socketRef.current?.id
          });
          micProducerIdRef.current = producer.id;
          console.log('[Student] Mic audio producer created:', producer.id);
        } else {
          throw new Error('No audio track available');
        }
        
        setIsMicEnabled(true);
        
        if (socketRef.current && teacherSocketId) {
          socketRef.current.emit('student_audio_toggle', {
            sessionId,
            to: teacherSocketId,
            enabled: true
          });
        }
        console.log('[Student] Microphone enabled successfully');
      } catch (err) {
        console.error('[Student] Error enabling microphone:', err);
        alert('Не удалось получить доступ к микрофону: ' + err.message);
        setIsMicEnabled(false);
        if (micStream) {
          micStream.getTracks().forEach(t => t.stop());
          setMicStream(null);
        }
      }
    }
  };

  const startScreenShare = async (teacherSocketId) => {
    try {
      if (!mediasoup.isReady) {
        await mediasoup.initMediasoup();
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      setScreenStream(stream);
      setIsSharingScreen(true);
      
      if (studentScreenPreviewRef.current) {
        studentScreenPreviewRef.current.srcObject = stream;
        studentScreenPreviewRef.current.play().catch(console.error);
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const producer = await mediasoup.clientRef.current.produce(videoTrack, 'screen', {
          role: 'student',
          type: 'screen',
          kind: 'video',
          target: teacherSocketId,
          studentId: student.id,
          studentName: student.full_name
        });
        screenProducerIdRef.current = producer.id;
        console.log('[Student] Screen video producer created:', producer.id);
        
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
      
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const producer = await mediasoup.clientRef.current.produce(audioTrack, 'screen-audio', {
          role: 'student',
          type: 'screen-audio',
          kind: 'audio',
          target: teacherSocketId,
          studentId: student.id,
          studentName: student.full_name
        });
        console.log('[Student] Screen audio producer created:', producer.id);
      }
      
      if (socketRef.current) {
        socketRef.current.emit('student_screen_share_started', {
          sessionId,
          studentSocketId: socketRef.current.id,
          studentName: student.full_name
        });
      }
      
      setIncomingScreenRequest(null);
    } catch (err) {
      console.error('Failed to start screen share:', err);
      alert('Не удалось получить доступ к экрану: ' + err.message);
      setIsSharingScreen(false);
      setIncomingScreenRequest(null);
    }
  };

  const stopScreenShare = async () => {
    if (screenProducerIdRef.current) {
      await mediasoup.clientRef.current.closeProducer('screen');
      await mediasoup.clientRef.current.closeProducer('screen-audio');
      screenProducerIdRef.current = null;
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    
    if (studentScreenPreviewRef.current) {
      studentScreenPreviewRef.current.srcObject = null;
    }
    
    setIsSharingScreen(false);
    
    if (socketRef.current) {
      socketRef.current.emit('student_screen_share_stopped', {
        sessionId,
        studentSocketId: socketRef.current.id
      });
    }
  };

  const handleTeacherRequestedStudentScreen = ({ teacherSocketId, teacherName, requestId }) => {
    setIncomingScreenRequest({
      teacherSocketId,
      teacherName,
      requestId
    });
  };

  const handleTeacherStoppedWatching = () => {
    stopScreenShare();
  };

  const handleTeacherStartedPlayback = ({ recordingSessionId, recordingTitle, recordingType }) => {
    console.log(`[Student] Teacher started playback: ${recordingTitle}`);
    setPlaybackActive(true);
    setPlaybackRecordingInfo({ recordingSessionId, recordingTitle, recordingType });
    if (recordingSessionId) {
      loadSessionMaterialsById(recordingSessionId);
    }
  };

  const handleTeacherStoppedPlayback = () => {
    console.log('[Student] Teacher stopped playback');
    setPlaybackActive(false);
    setPlaybackRecordingInfo(null);
    loadSessionMaterials();
  };

  const handleRecordingMaterialsResponse = ({ recordingSessionId, materials, comment }) => {
    if (playbackRecordingInfo?.recordingSessionId === recordingSessionId) {
      setSessionMaterials(Array.isArray(materials) ? materials : []);
      setSessionComment(comment || '');
    }
  };

  useEffect(() => {
    if (!mediasoup.isReady) return;

    console.log('[Student] remoteStreams updated, size:', mediasoup.remoteStreams.size);
    
    for (const [producerId, entry] of mediasoup.remoteStreams) {
      console.log(`[Student] Remote track: producerId=${producerId}, kind=${entry.kind}, type=${entry.appData?.type}, role=${entry.appData?.role}`);
    }

    let screenVideoStream = null;
    let screenAudioStream = null;
    let micAudioStream = null;
    let playbackVideoStream = null;
    let playbackAudioStream = null;
    let cameraVideoStream = null;

    for (const [, entry] of mediasoup.remoteStreams) {
      const ad = entry.appData || {};
      const kind = entry.kind;

      if (ad.type === 'screen' && kind === 'video') {
        screenVideoStream = entry.stream;
        console.log('[Student] Got teacher screen video stream');
      }

      if ((ad.type === 'screen-audio' || (ad.type === 'screen' && kind === 'audio')) && kind === 'audio') {
        screenAudioStream = entry.stream;
        console.log('[Student] Got teacher screen audio stream');
      }

      if (ad.type === 'mic' && kind === 'audio' && ad.role === 'teacher') {
        micAudioStream = entry.stream;
        console.log('[Student] Got teacher mic audio stream');
      }

      if (ad.type === 'playback' && kind === 'video') {
        playbackVideoStream = entry.stream;
        console.log('[Student] Got playback video stream');
      }

      if (ad.type === 'playback' && kind === 'audio') {
        playbackAudioStream = entry.stream;
        console.log('[Student] Got playback audio stream');
      }

      if (ad.type === 'camera' && kind === 'video' && ad.role === 'teacher') {
        cameraVideoStream = entry.stream;
        console.log('[Student] Got teacher camera video stream');
        
        if (teacherCameraVideoRef.current) {
          teacherCameraVideoRef.current.srcObject = entry.stream;
          teacherCameraVideoRef.current.play().catch(console.error);
        }
      }
    }

    const mainVideoStream = playbackVideoStream || screenVideoStream || cameraVideoStream;
    const mainAudioStream = playbackAudioStream || screenAudioStream;

    if (mainVideoStream) {
      const allAudioTracks = [];
      
      if (mainAudioStream) {
        allAudioTracks.push(...mainAudioStream.getAudioTracks());
      }
      if (micAudioStream) {
        allAudioTracks.push(...micAudioStream.getAudioTracks());
        console.log('[Student] Adding teacher mic audio to stream');
      }

      const desiredTracks = [
        ...mainVideoStream.getVideoTracks(),
        ...allAudioTracks
      ];

      const desiredTrackIds = desiredTracks.map(t => `${t.kind}:${t.id}`).sort().join('|');

      if (desiredTrackIds !== teacherScreenTrackIdsRef.current) {
        teacherScreenTrackIdsRef.current = desiredTrackIds;

        const stableStream = teacherScreenCombinedStreamRef.current;

        for (const oldTrack of stableStream.getTracks()) {
          if (!desiredTracks.some(t => t.id === oldTrack.id)) {
            stableStream.removeTrack(oldTrack);
          }
        }

        for (const newTrack of desiredTracks) {
          if (!stableStream.getTracks().some(t => t.id === newTrack.id)) {
            stableStream.addTrack(newTrack);
            console.log(`[Student] Added ${newTrack.kind} track to stream`);
          }
        }

        setTeacherScreenStream(stableStream);
        setTeacherScreenActive(true);
      }
    } else {
      setTeacherScreenActive(false);
    }
  }, [mediasoup.remoteStreams, mediasoup.isReady]);

  const handleParticipantsList = (list) => {
    setParticipants(list);
    const teacher = list.find(p => p.userType === 'teacher');
    if (teacher) {
      setTeacherPresent(true);
      setTeacherName(teacher.userName);
      setTeacherSocketId(teacher.socketId);
    } else {
      setTeacherPresent(false);
      setTeacherName('');
      setTeacherSocketId(null);
    }
  };

  const handleUserJoined = (user) => {
    setParticipants(prev => {
      const exists = prev.some(p => p.socketId === user.socketId);
      if (exists) {
        return prev.map(p => p.socketId === user.socketId ? user : p);
      }
      return [...prev, user];
    });

    if (user.userType === 'teacher') {
      setTeacherPresent(true);
      setTeacherName(user.userName);
      setTeacherSocketId(user.socketId);
    }
  };

  const handleUserLeft = (user) => {
    setParticipants(prev => prev.filter(p => p.socketId !== user.socketId));
    if (user.userType === 'teacher') {
      setTeacherPresent(false);
      setTeacherName('');
      setTeacherSocketId(null);
    }
  };

  const handleUserMentioned = useCallback((data) => {
    setMentionModalData({
      senderName: data.senderName,
      text: data.text,
      timestamp: data.timestamp
    });
  }, []);

  const handleTeacherScreenShareStarted = () => {
    console.log('Teacher started screen share');
    setTeacherScreenActive(true);
  };

  const handleTeacherScreenShareStopped = () => {
    console.log('Teacher stopped screen share');
    setTeacherScreenActive(false);
    setTeacherScreenStream(null);
  };

  const handleKickedFromWebinar = (data) => {
    alert(data.reason + '\nПреподаватель: ' + data.teacherName);
    stopScreenShare();
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
    }
    onExit();
  };

  const closeMentionModal = () => {
    setMentionModalData(null);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit('send_message', {
      sessionId,
      message: newMessage,
      senderType: 'student',
      senderId: student.id,
      senderName: student.full_name
    });
    setNewMessage('');
  };

  const trackActivity = (activity) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('student_activity', { sessionId, activity });
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
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      
      newSocket.emit('join_webinar', {
        sessionId,
        userType: 'student',
        userId: student.id,
        userName: student.full_name
      });

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

    newSocket.on('connect_error', (error) => {
      if (!isMountedRef.current) return;
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    });

    newSocket.on('user_mentioned', handleUserMentioned);
    newSocket.on('teacher_screen_share_started', handleTeacherScreenShareStarted);
    newSocket.on('teacher_screen_share_stopped', handleTeacherScreenShareStopped);
    newSocket.on('teacher_requested_student_screen', handleTeacherRequestedStudentScreen);
    newSocket.on('teacher_stopped_watching', handleTeacherStoppedWatching);
    newSocket.on('kicked_from_webinar', handleKickedFromWebinar);
    newSocket.on('teacher_start_playback_broadcast', handleTeacherStartedPlayback);
    newSocket.on('teacher_stop_playback_broadcast', handleTeacherStoppedPlayback);
    newSocket.on('recording_materials_response', handleRecordingMaterialsResponse);

    fetch(`${API_BASE_URL}/api/messages/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (isMountedRef.current) {
          setMessages(Array.isArray(data) ? data : []);
        }
      })
      .catch(err => console.error('Error loading messages:', err));

    loadSessionMaterials();

    return () => {
      isMountedRef.current = false;
      mediasoup.cleanup();
      if (socketRef.current?.connected) {
        socketRef.current.emit('leave_webinar', { sessionId });
        socketRef.current.disconnect();
      }
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
      socketRef.current = null;
    };
  }, [sessionId, student]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (message) => setMessages(prev => [...prev, message]);

    socketRef.current.on('new_message', handleNewMessage);
    socketRef.current.on('participants_list', handleParticipantsList);
    socketRef.current.on('user_joined', handleUserJoined);
    socketRef.current.on('user_left', handleUserLeft);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message', handleNewMessage);
        socketRef.current.off('participants_list', handleParticipantsList);
        socketRef.current.off('user_joined', handleUserJoined);
        socketRef.current.off('user_left', handleUserLeft);
      }
    };
  }, []);

  useEffect(() => {
    const el = teacherScreenVideoRef.current;
    if (!el) return;

    if (!teacherScreenActive || !teacherScreenStream) {
      if (el.srcObject) {
        el.pause();
        el.srcObject = null;
      }
      return;
    }

    el.muted = false;
    el.playsInline = true;
    el.autoplay = true;

    if (el.srcObject !== teacherScreenStream) {
      el.srcObject = teacherScreenStream;
    }

    el.play().catch(err => {
      if (err.name === 'NotAllowedError') {
        const banner = document.getElementById('unmute-banner');
        if (banner) banner.style.display = 'flex';
      }
    });
  }, [teacherScreenActive, teacherScreenStream]);

  return (
    <WebinarStudentView
      sessionId={sessionId}
      student={student}
      onExit={onExit}
      messages={messages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      participants={participants}
      connectionStatus={connectionStatus}
      teacherPresent={teacherPresent}
      teacherName={teacherName}
      teacherScreenActive={teacherScreenActive}
      teacherScreenStream={teacherScreenStream}
      isSharingScreen={isSharingScreen}
      isMicEnabled={isMicEnabled}
      incomingScreenRequest={incomingScreenRequest}
      setIncomingScreenRequest={setIncomingScreenRequest}
      messagesEndRef={messagesEndRef}
      teacherScreenVideoRef={teacherScreenVideoRef}
      teacherCameraVideoRef={teacherCameraVideoRef}
      studentScreenPreviewRef={studentScreenPreviewRef}
      sendMessage={sendMessage}
      trackActivity={trackActivity}
      startScreenShare={startScreenShare}
      stopScreenShare={stopScreenShare}
      toggleMicrophone={toggleMicrophone}
      socketRef={socketRef}
      mentionModalData={mentionModalData}
      closeMentionModal={closeMentionModal}
      sessionComment={sessionComment}
      sessionMaterials={sessionMaterials}
      materialsLoading={materialsLoading}
      loadSessionMaterials={loadSessionMaterials}
      playbackActive={playbackActive}
      playbackRecordingInfo={playbackRecordingInfo}
    />
  );
};

export default WebinarStudent;