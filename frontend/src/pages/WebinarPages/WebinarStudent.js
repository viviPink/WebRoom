import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import WebinarStudentView from './WebinarStudentView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

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
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenSharingTo, setScreenSharingTo] = useState(null);
  const [incomingScreenRequest, setIncomingScreenRequest] = useState(null);
  
  const [localVideoStream, setLocalVideoStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [teacherVideoStream, setTeacherVideoStream] = useState(null);
  const [isTeacherVideoActive, setIsTeacherVideoActive] = useState(false);
  
  const [mentionModalData, setMentionModalData] = useState(null);
  
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const teacherPcRef = useRef(null);

  // ── РАЗДЕЛЯЕМ рефы: отдельный для экрана, отдельный для камеры преподавателя ──
  const teacherScreenVideoRef = useRef(null);   // <video> для трансляции экрана/записи
  const teacherCameraVideoRef = useRef(null);   // <video> для веб-камеры преподавателя

  const videoPeerConnectionRef = useRef(null);

  const startStudentVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      
      setLocalVideoStream(stream);
      setIsVideoEnabled(true);
      
      if (socketRef.current && teacherSocketId) {
        socketRef.current.emit('student_start_video', {
          sessionId,
          to: teacherSocketId,
          studentId: student.id,
          studentName: student.full_name
        });
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socketRef.current.emit('student_video_offer', {
          to: teacherSocketId,
          sdp: offer,
          sessionId
        });
        
        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current?.connected) {
            socketRef.current.emit('webrtc_ice_candidate', {
              to: teacherSocketId,
              candidate: event.candidate
            });
          }
        };
        
        pc.onconnectionstatechange = () => {
          console.log('Video connection state:', pc.connectionState);
        };
        
        videoPeerConnectionRef.current = pc;
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      alert('Failed to access camera: ' + err.message);
    }
  };

  const stopStudentVideo = () => {
    if (localVideoStream) {
      localVideoStream.getTracks().forEach(track => track.stop());
      setLocalVideoStream(null);
    }
    
    if (videoPeerConnectionRef.current) {
      videoPeerConnectionRef.current.close();
      videoPeerConnectionRef.current = null;
    }
    
    setIsVideoEnabled(false);
    
    if (socketRef.current && teacherSocketId) {
      socketRef.current.emit('student_stop_video', {
        sessionId,
        to: teacherSocketId
      });
    }
  };

  const toggleStudentAudio = () => {
    if (localVideoStream) {
      const audioTracks = localVideoStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
      
      if (socketRef.current && teacherSocketId) {
        socketRef.current.emit('student_audio_toggle', {
          sessionId,
          to: teacherSocketId,
          enabled: !isAudioEnabled
        });
      }
    }
  };

  // ── Обработка оффера от преподавателя (трансляция экрана ИЛИ записи) ──
  const handleTeacherWebrtcOffer = async ({ from, sdp, streamType }) => {
    if (streamType === 'teacher_to_all') {
      console.log('Received offer from teacher');
      
      if (teacherPcRef.current) {
        teacherPcRef.current.close();
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      pc.ontrack = (event) => {
        console.log('Received track from teacher', event.track.kind, event);
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          console.log('Teacher stream ready, tracks:', stream.getTracks().map(t => t.kind));
          setTeacherScreenStream(stream);
          setTeacherScreenActive(true);
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

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          console.log('Connection with teacher established');
        } else if (pc.connectionState === 'failed') {
          console.error('Connection with teacher failed');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE state (student):', pc.iceConnectionState);
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('Remote description set');
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Answer created');
        
        if (socketRef.current) {
          socketRef.current.emit('webrtc_answer', { to: from, sdp: answer });
          console.log('Answer sent to teacher');
        }

        teacherPcRef.current = pc;
      } catch (err) {
        console.error('Error processing teacher offer:', err);
        pc.close();
      }
    }
  };

  // ── Обработка оффера видео-камеры от преподавателя ──
  const handleTeacherVideoOffer = async ({ from, sdp }) => {
    console.log('Received video offer from teacher');
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.ontrack = (event) => {
      console.log('Received video/audio track from teacher', event.streams[0]);
      if (event.streams && event.streams[0]) {
        setTeacherVideoStream(event.streams[0]);
        setIsTeacherVideoActive(true);
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
    
    pc.onconnectionstatechange = () => {
      console.log('Video connection with teacher:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('Video connection established');
      } else if (pc.connectionState === 'failed') {
        console.error('Video connection failed');
      }
    };
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc_answer', { to: from, sdp: answer });
      }
      
      // Сохраняем в отдельный ref чтобы не конфликтовать с teacherPcRef
      teacherPcRef.current = pc;
    } catch (err) {
      console.error('Error processing teacher video offer:', err);
      pc.close();
    }
  };

  const startStudentScreenShare = async (teacherSocketId) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      setLocalStream(stream);
      setIsSharingScreen(true);
      setScreenSharingTo(teacherSocketId);

      const pc = new RTCPeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('student_webrtc_offer', {
          to: teacherSocketId,
          sdp: offer,
          streamType: 'student_to_teacher',
          sessionId
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('webrtc_ice_candidate', { 
            to: teacherSocketId, 
            candidate: event.candidate 
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE state (student -> teacher):', pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          console.log('Connection with teacher established');
        } else if (pc.connectionState === 'failed') {
          console.error('Connection with teacher failed');
        }
      };

      setPeerConnection(pc);
      setIncomingScreenRequest(null);
    } catch (err) {
      console.error('Failed to start screen share:', err);
      alert('Failed to access screen');
      setIncomingScreenRequest(null);
    }
  };

  const stopStudentScreenShare = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    setIsSharingScreen(false);
    setScreenSharingTo(null);

    if (socketRef.current && screenSharingTo) {
      socketRef.current.emit('stop_screen_share', {
        sessionId,
        streamType: 'student_to_teacher',
        targetSocketId: screenSharingTo
      });
    }
  };

  const handleTeacherScreenShareStarted = ({ teacherSocketId, teacherName }) => {
    console.log('Teacher started screen share');
    setTeacherScreenActive(true);
    setTeacherScreenStream(null);
  };

  const handleTeacherScreenShareStopped = () => {
    console.log('Teacher stopped screen share');
    setTeacherScreenActive(false);
    setTeacherScreenStream(null);
    if (teacherPcRef.current) {
      teacherPcRef.current.close();
      teacherPcRef.current = null;
    }
  };

  const handleWebrtcAnswer = async ({ from, sdp }) => {
    if (peerConnection && from === screenSharingTo) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Error setting remote description:', err);
      }
    }
    
    if (videoPeerConnectionRef.current && from === teacherSocketId) {
      try {
        await videoPeerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Error setting remote description for video:', err);
      }
    }
  };

  const handleWebrtcIceCandidate = ({ from, candidate }) => {
    if (teacherPcRef.current && candidate) {
      try {
        teacherPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate (teacherPc):', err);
      }
    }
    if (peerConnection && from === screenSharingTo && candidate) {
      try {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate (screen):', err);
      }
    }
    if (videoPeerConnectionRef.current && from === teacherSocketId && candidate) {
      try {
        videoPeerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate for video:', err);
      }
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
    stopStudentScreenShare();
  };

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
      setIsTeacherVideoActive(false);
      setTeacherVideoStream(null);
    }
  };

  const handleTeacherPresent = (data) => {
    setTeacherPresent(true);
    setTeacherName(data.teacherName);
    setTeacherSocketId(data.teacherSocketId);
  };

  const handleUserMentioned = useCallback((data) => {
    console.log('Student mentioned:', data);
    setMentionModalData({
      senderName: data.senderName,
      text: data.text,
      timestamp: data.timestamp
    });
  }, []);

  const handleTeacherVideoStarted = ({ teacherSocketId, teacherName }) => {
    console.log('Teacher started video');
  };

  const handleTeacherVideoStopped = () => {
    console.log('Teacher stopped video');
    setIsTeacherVideoActive(false);
    setTeacherVideoStream(null);
    if (teacherPcRef.current) {
      teacherPcRef.current.close();
      teacherPcRef.current = null;
    }
  };

  const closeMentionModal = () => {
    setMentionModalData(null);
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
    });

    newSocket.on('disconnect', (reason) => {
      if (!isMountedRef.current) return;
      console.log('WebSocket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      if (!isMountedRef.current) return;
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
    });

    fetch(`${API_BASE_URL}/api/messages/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (isMountedRef.current) {
          setMessages(Array.isArray(data) ? data : []);
        }
      })
      .catch(err => console.error('Error loading messages:', err));

    return () => {
      isMountedRef.current = false;
      if (socketRef.current?.connected) {
        socketRef.current.emit('leave_webinar', { sessionId });
        socketRef.current.disconnect();
      }
      if (peerConnection) peerConnection.close();
      if (teacherPcRef.current) teacherPcRef.current.close();
      if (videoPeerConnectionRef.current) videoPeerConnectionRef.current.close();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (localVideoStream) localVideoStream.getTracks().forEach(t => t.stop());
      if (teacherScreenStream) teacherScreenStream.getTracks().forEach(t => t.stop());
      if (teacherVideoStream) teacherVideoStream.getTracks().forEach(t => t.stop());
      socketRef.current = null;
    };
  }, [sessionId, student]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (message) => setMessages(prev => [...prev, message]);

    socketRef.current.on('user_mentioned', handleUserMentioned);
    socketRef.current.on('teacher_screen_share_started', handleTeacherScreenShareStarted);
    socketRef.current.on('teacher_screen_share_stopped', handleTeacherScreenShareStopped);
    socketRef.current.on('teacher_webrtc_offer', handleTeacherWebrtcOffer);
    socketRef.current.on('webrtc_answer', handleWebrtcAnswer);
    socketRef.current.on('webrtc_ice_candidate', handleWebrtcIceCandidate);
    socketRef.current.on('teacher_requested_student_screen', handleTeacherRequestedStudentScreen);
    socketRef.current.on('teacher_stopped_watching', handleTeacherStoppedWatching);
    socketRef.current.on('new_message', handleNewMessage);
    socketRef.current.on('participants_list', handleParticipantsList);
    socketRef.current.on('user_joined', handleUserJoined);
    socketRef.current.on('user_left', handleUserLeft);
    socketRef.current.on('teacher_present', handleTeacherPresent);
    socketRef.current.on('teacher_video_offer', handleTeacherVideoOffer);
    socketRef.current.on('teacher_video_started', handleTeacherVideoStarted);
    socketRef.current.on('teacher_video_stopped', handleTeacherVideoStopped);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('user_mentioned', handleUserMentioned);
        socketRef.current.off('teacher_screen_share_started', handleTeacherScreenShareStarted);
        socketRef.current.off('teacher_screen_share_stopped', handleTeacherScreenShareStopped);
        socketRef.current.off('teacher_webrtc_offer', handleTeacherWebrtcOffer);
        socketRef.current.off('webrtc_answer', handleWebrtcAnswer);
        socketRef.current.off('webrtc_ice_candidate', handleWebrtcIceCandidate);
        socketRef.current.off('teacher_requested_student_screen', handleTeacherRequestedStudentScreen);
        socketRef.current.off('teacher_stopped_watching', handleTeacherStoppedWatching);
        socketRef.current.off('new_message', handleNewMessage);
        socketRef.current.off('participants_list', handleParticipantsList);
        socketRef.current.off('user_joined', handleUserJoined);
        socketRef.current.off('user_left', handleUserLeft);
        socketRef.current.off('teacher_present', handleTeacherPresent);
        socketRef.current.off('teacher_video_offer', handleTeacherVideoOffer);
        socketRef.current.off('teacher_video_started', handleTeacherVideoStarted);
        socketRef.current.off('teacher_video_stopped', handleTeacherVideoStopped);
      }
    };
  }, [peerConnection, teacherSocketId, screenSharingTo, handleUserMentioned]);

  // ── Привязываем поток экрана к teacherScreenVideoRef ──
  useEffect(() => {
    const el = teacherScreenVideoRef.current;
    if (!el) return;

    if (teacherScreenActive && teacherScreenStream) {
      el.srcObject = teacherScreenStream;
      el.muted = false;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Screen playback error (needs user gesture):', err.message);
          // Отображаем кнопку "Включить звук" — см. View
        });
      }
    } else {
      el.srcObject = null;
    }
  }, [teacherScreenActive, teacherScreenStream]);

  // ── Привязываем поток камеры к teacherCameraVideoRef ──
  useEffect(() => {
    const el = teacherCameraVideoRef.current;
    if (!el) return;

    if (isTeacherVideoActive && teacherVideoStream) {
      el.srcObject = teacherVideoStream;
      el.muted = false;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error('Camera playback error:', err);
        });
      }
    } else {
      el.srcObject = null;
    }
  }, [isTeacherVideoActive, teacherVideoStream]);

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
      localStream={localStream}
      isSharingScreen={isSharingScreen}
      incomingScreenRequest={incomingScreenRequest}
      setIncomingScreenRequest={setIncomingScreenRequest}
      messagesEndRef={messagesEndRef}
      // ── передаём два отдельных рефа вместо одного ──
      teacherScreenVideoRef={teacherScreenVideoRef}
      teacherCameraVideoRef={teacherCameraVideoRef}
      sendMessage={sendMessage}
      trackActivity={trackActivity}
      startStudentScreenShare={startStudentScreenShare}
      stopStudentScreenShare={stopStudentScreenShare}
      socketRef={socketRef}
      mentionModalData={mentionModalData}
      closeMentionModal={closeMentionModal}
      localVideoStream={localVideoStream}
      isVideoEnabled={isVideoEnabled}
      isAudioEnabled={isAudioEnabled}
      teacherVideoStream={teacherVideoStream}
      isTeacherVideoActive={isTeacherVideoActive}
      startStudentVideo={startStudentVideo}
      stopStudentVideo={stopStudentVideo}
      toggleStudentAudio={toggleStudentAudio}
    />
  );
};

export default WebinarStudent;