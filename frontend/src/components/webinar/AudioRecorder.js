import React, { useState, useRef, useEffect } from 'react';
import AudioRecorderView from './AudioRecorderView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

const SOCKET_URL = API_BASE_URL;



const AudioRecorder = ({ 
  sessionId, 
  teacherId, 
  teacherName, 
  socketRef,
  onRecordingStarted = () => {},
  onRecordingStopped = () => {},
  onRecordingSaved = () => {},
  onTranscriptionUpdate = () => {}
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingDescription, setRecordingDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  
  const [plainTranscription, setPlainTranscription] = useState('');
  const [timedTranscription, setTimedTranscription] = useState('');
  const [allTimings, setAllTimings] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const timerRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const processorRef = useRef(null);
  
  const audioBufferRef = useRef([]);
  const lastProcessTimeRef = useRef(Date.now());
  const isFinalizingRef = useRef(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeDetailed = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  const floatToWav = (buffer, sampleRate) => {
    const bytesPerSample = 2;
    const format = 1;
    const channels = 1;
    
    const dataLength = buffer.length * bytesPerSample;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    
    const wav = new ArrayBuffer(totalLength);
    const view = new DataView(wav);
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(view, 8, 'WAVE');
    
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true);
    
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    floatTo16BitPCM(view, 44, buffer);
    
    return new Blob([wav], { type: 'audio/wav' });
  };
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  const floatTo16BitPCM = (view, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const formatTimedTranscription = (timings) => {
    if (!timings || timings.length === 0) return '';
    
    let result = '';
    let currentSentence = [];
    let sentenceStartTime = timings[0]?.start || 0;
    
    timings.forEach((timing, index) => {
      currentSentence.push(timing.word);
      
      const isNewSentence = index === 0 || 
                           timing.word.match(/[.!?]$/) || 
                           currentSentence.length >= 15 ||
                           index === timings.length - 1;
      
      if (isNewSentence) {
        const startTime = formatTimeDetailed(sentenceStartTime);
        const sentenceText = currentSentence.join(' ');
        
        result += `[${startTime}] ${sentenceText}\n`;
        
        currentSentence = [];
        if (index < timings.length - 1) {
          sentenceStartTime = timings[index + 1]?.start || 0;
        }
      }
    });
    
    return result;
  };

  const transcribeAudioChunk = async (audioData, sampleRate) => {
    if (!audioData || audioData.length === 0 || isFinalizingRef.current) return;

    try {
      setIsTranscribing(true);
      
      const wavBlob = floatToWav(audioData, sampleRate);
      
      if (wavBlob.size < 2000) {
        setIsTranscribing(false);
        return;
      }

      const formData = new FormData();
      formData.append('audio', wavBlob, `chunk_${Date.now()}.wav`);
      formData.append('return_timings', 'true');

      const response = await fetch(`${API_BASE_URL}/api/audio/transcribe-chunk`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Ошибка транскрибации: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.text && result.text.trim()) {
        setPlainTranscription(prev => {
          const separator = prev && !prev.endsWith(' ') ? ' ' : '';
          const newText = prev + separator + result.text;
          onTranscriptionUpdate(newText);
          return newText;
        });
        
        if (result.timings && result.timings.length > 0) {
          setAllTimings(prev => {
            const newTimings = [...prev, ...result.timings];
            const timedText = formatTimedTranscription(newTimings);
            setTimedTranscription(timedText);
            return newTimings;
          });
        }
      }
    } catch (err) {
      console.error('Ошибка транскрибации фрагмента:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const finalizeTranscription = async () => {
    if (!audioContextRef.current || audioBufferRef.current.length === 0) {
      return;
    }

    isFinalizingRef.current = true;
    
    try {
      const audioData = new Float32Array(audioBufferRef.current);
      await transcribeAudioChunk(audioData, audioContextRef.current.sampleRate);
      audioBufferRef.current = [];
    } catch (err) {
      console.error('Ошибка финальной транскрипции:', err);
    } finally {
      isFinalizingRef.current = false;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      audioStreamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000
      });

      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        setRecordingDuration(recordingTime);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioChunks([blob]);
        setShowSaveModal(true);
      };

      recorder.start(3000);
      setMediaRecorder(recorder);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;
      
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      audioBufferRef.current = [];
      lastProcessTimeRef.current = Date.now();
      isFinalizingRef.current = false;
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        audioBufferRef.current.push(...inputData);
        
        const now = Date.now();
        if (now - lastProcessTimeRef.current >= 10000) {
          if (audioBufferRef.current.length > 0) {
            const bufferCopy = new Float32Array(audioBufferRef.current);
            transcribeAudioChunk(bufferCopy, audioContext.sampleRate);
            audioBufferRef.current = [];
            lastProcessTimeRef.current = now;
          }
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      if (socketRef.current?.connected) {
        socketRef.current.emit('start_recording', {
          sessionId,
          teacherId,
          teacherName
        });
      }

      onRecordingStarted();
    } catch (err) {
      console.error('Ошибка начала записи:', err);
      alert('Не удалось получить доступ к микрофону');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
      
      if (processorRef.current && mediaStreamSourceRef.current) {
        processorRef.current.disconnect();
        mediaStreamSourceRef.current.disconnect();
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
      
      if (processorRef.current && mediaStreamSourceRef.current && audioContextRef.current) {
        mediaStreamSourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);
      }
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      
      await finalizeTranscription();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      mediaRecorder.stop();
      
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      setIsRecording(false);
      setIsPaused(false);

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }

      if (socketRef.current?.connected) {
        socketRef.current.emit('stop_recording', {
          sessionId,
          teacherId,
          teacherName
        });
      }

      onRecordingStopped();
    }
  };

  const saveRecording = async () => {
    if (audioChunks.length === 0) {
      alert('Нет данных для сохранения');
      return;
    }

    setUploading(true);
    try {
      const blob = audioChunks[0];
      const formData = new FormData();
      formData.append('audio', blob, `recording_${sessionId}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('teacherId', teacherId);
      formData.append('title', recordingTitle || `Запись от ${new Date().toLocaleString()}`);
      formData.append('description', recordingDescription);
      formData.append('duration', recordingDuration);
      
      formData.append('transcription', plainTranscription);
      formData.append('timedTranscription', timedTranscription);
      
      if (allTimings.length > 0) {
        formData.append('timings', JSON.stringify(allTimings));
      }

      const response = await fetch(`${API_BASE_URL}/api/audio/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки файла: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      setShowSaveModal(false);
      
      setRecordingTitle('');
      setRecordingDescription('');
      setAudioChunks([]);
      setRecordingTime(0);
      setRecordingDuration(0);
      setPlainTranscription('');
      setTimedTranscription('');
      setAllTimings([]);

      onRecordingSaved(result);
      
      alert('Запись успешно сохранена');
    } catch (err) {
      console.error('Ошибка сохранения записи:', err);
      alert('Ошибка сохранения записи: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelRecording = () => {
    setShowSaveModal(false);
    setRecordingTitle('');
    setRecordingDescription('');
    setAudioChunks([]);
    setRecordingTime(0);
    setRecordingDuration(0);
  };

  const undoLastTranscription = () => {
    setPlainTranscription(prev => {
      const sentences = prev.split(/[.!?]+/).filter(s => s.trim());
      sentences.pop();
      const newText = sentences.join('. ') + (sentences.length > 0 ? '.' : '');
      onTranscriptionUpdate(newText);
      return newText;
    });
    
    if (allTimings.length > 0) {
      setAllTimings(prev => {
        const newTimings = prev.slice(0, Math.max(0, prev.length - 10));
        setTimedTranscription(formatTimedTranscription(newTimings));
        return newTimings;
      });
    }
  };

  const clearTranscription = () => {
    if (window.confirm('Очистить текущий конспект?')) {
      setPlainTranscription('');
      setTimedTranscription('');
      setAllTimings([]);
      onTranscriptionUpdate('');
    }
  };

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { 
      if (timerRef.current) {
        clearInterval(timerRef.current); 
      }
    };
  }, [isRecording, isPaused]);

  return (
    <AudioRecorderView
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
      startRecording={startRecording}
      pauseRecording={pauseRecording}
      resumeRecording={resumeRecording}
      stopRecording={stopRecording}
      saveRecording={saveRecording}
      cancelRecording={cancelRecording}
      showTranscription={showTranscription}
      setShowTranscription={setShowTranscription}
      liveTranscription={plainTranscription}
      timedTranscription={timedTranscription}
      isTranscribing={isTranscribing}
      onUndoLast={undoLastTranscription}
      onClearTranscription={clearTranscription}
      timingsCount={allTimings.length}
    />
  );
};

export default AudioRecorder;