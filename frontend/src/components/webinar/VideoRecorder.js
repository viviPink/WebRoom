import React, { useState, useRef, useEffect } from 'react';
import VideoRecorderView from './VideoRecorderView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

const VideoRecorder = ({ 
  sessionId, 
  teacherId, 
  teacherName, 
  localStream,
  socketRef,
  onRecordingStarted = () => {},
  onRecordingStopped = () => {},
  onRecordingSaved = () => {}
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [videoChunks, setVideoChunks] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingDescription, setRecordingDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const isManualStopRef = useRef(false);
  const localStreamRef = useRef(localStream);
  
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  useEffect(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    if (!localStream) return;

    const recStream = recorder.stream;
    if (!recStream) return;

    const newVideoTrack = localStream.getVideoTracks()[0];
    const oldVideoTrack = recStream.getVideoTracks()[0];
    
    if (newVideoTrack && (!oldVideoTrack || newVideoTrack.id !== oldVideoTrack.id)) {
      recStream.addTrack(newVideoTrack);
      if (oldVideoTrack) {
        recStream.removeTrack(oldVideoTrack);
      }
      console.log('VideoRecorder: видеотрек заменён при переключении');
    }

    const newAudioTrack = localStream.getAudioTracks()[0];
    const oldAudioTrack = recStream.getAudioTracks()[0];
    if (newAudioTrack && (!oldAudioTrack || newAudioTrack.id !== oldAudioTrack.id)) {
      recStream.addTrack(newAudioTrack);
      if (oldAudioTrack) {
        recStream.removeTrack(oldAudioTrack);
      }
    }
  }, [localStream]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startVideoRecording = async () => {
    try {
      const stream = localStreamRef.current;
      if (!stream || stream.getVideoTracks().length === 0) {
        alert('Нет потока для записи. Сначала начните трансляцию экрана или включите камеру.');
        return;
      }

      const recordingStream = new MediaStream(stream.getTracks());

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: 2500000
      });

      const chunks = [];
      const currentRecordingTime = { value: 0 };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        if (!isManualStopRef.current) {
          console.log('onstop вызван автоматически (например при replaceTrack) - игнорируем');
          return;
        }
        setRecordingDuration(currentRecordingTime.value);
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoChunks([blob]);
        setShowSaveModal(true);
      };

      recorder.start(3000);
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      const intervalId = setInterval(() => {
        currentRecordingTime.value += 1;
        setRecordingTime(currentRecordingTime.value);
      }, 1000);
      timerRef.current = intervalId;

      if (socketRef.current?.connected) {
        socketRef.current.emit('start_recording', { sessionId, teacherId, teacherName, type: 'video' });
      }

      onRecordingStarted();
    } catch (err) {
      console.error('Ошибка начала записи видео:', err);
      alert('Не удалось начать запись видео: ' + err.message);
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      setIsPaused(false);
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      }
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      isManualStopRef.current = true;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      recorder.stop();

      setIsRecording(false);
      setIsPaused(false);

      if (socketRef.current?.connected) {
        socketRef.current.emit('stop_recording', { sessionId, teacherId, teacherName, type: 'video' });
      }

      onRecordingStopped();
      
      setTimeout(() => { isManualStopRef.current = false; }, 100);
    }
  };

  const saveRecording = async () => {
    if (videoChunks.length === 0) {
      alert('Нет данных для сохранения');
      return;
    }

    setUploading(true);
    try {
      const blob = videoChunks[0];
      const formData = new FormData();
      formData.append('video', blob, `recording_${sessionId}_${Date.now()}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('teacherId', teacherId);
      formData.append('title', recordingTitle || `Видеозапись от ${new Date().toLocaleString()}`);
      formData.append('description', recordingDescription);
      formData.append('duration', recordingDuration);
      formData.append('type', 'video');

      const response = await fetch(`${API_BASE_URL}/api/video/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Ошибка загрузки видео');

      const result = await response.json();

      setShowSaveModal(false);
      setRecordingTitle('');
      setRecordingDescription('');
      setVideoChunks([]);
      setRecordingTime(0);
      setRecordingDuration(0);

      onRecordingSaved(result);
      alert('Видеозапись успешно сохранена');
    } catch (err) {
      console.error('Ошибка сохранения видео:', err);
      alert('Ошибка сохранения видео: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelRecording = () => {
    setShowSaveModal(false);
    setRecordingTitle('');
    setRecordingDescription('');
    setVideoChunks([]);
    setRecordingTime(0);
    setRecordingDuration(0);
  };

  useEffect(() => {
    if (isRecording && !isPaused) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      }
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  return (
    <VideoRecorderView
      isRecording={isRecording}
      isPaused={isPaused}
      recordingTime={recordingTime}
      showSaveModal={showSaveModal}
      recordingTitle={recordingTitle}
      setRecordingTitle={setRecordingTitle}
      recordingDescription={recordingDescription}
      setRecordingDescription={setRecordingDescription}
      uploading={uploading}
      recordingDuration={recordingDuration}
      formatTime={formatTime}
      startVideoRecording={startVideoRecording}
      pauseRecording={pauseRecording}
      resumeRecording={resumeRecording}
      stopRecording={stopRecording}
      saveRecording={saveRecording}
      cancelRecording={cancelRecording}
    />
  );
};

export default VideoRecorder;