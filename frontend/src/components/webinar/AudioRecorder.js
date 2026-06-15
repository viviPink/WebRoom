import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import AudioRecorderView from './AudioRecorderView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

// --- Константы ---
const SILENCE_THRESHOLD    = 0.015;
const SILENCE_DURATION_MS  = 1200;
const MIN_CHUNK_DURATION_MS = 3000;
const MAX_CHUNK_DURATION_MS = 15000;
const WAVEFORM_HISTORY     = 80;

const AudioRecorder = forwardRef(({
  sessionId,
  teacherId,
  teacherName,
  socketRef,
  onRecordingStarted   = () => {},
  onRecordingStopped   = () => {},
  onRecordingSaved     = () => {},
  onTranscriptionUpdate = () => {},
}, ref) => {
  const [isRecording,          setIsRecording]          = useState(false);
  const [isPaused,             setIsPaused]             = useState(false);
  const [recordingTime,        setRecordingTime]        = useState(0);
  const [showSaveModal,        setShowSaveModal]        = useState(false);
  const [recordingTitle,       setRecordingTitle]       = useState('');
  const [recordingDescription, setRecordingDescription] = useState('');
  const [uploading,            setUploading]            = useState(false);
  const [recordingDuration,    setRecordingDuration]    = useState(0);
  const [showTranscription,    setShowTranscription]    = useState(false);

  const [plainTranscription, setPlainTranscription] = useState('');
  const [timedTranscription, setTimedTranscription] = useState('');
  const [allTimings,         setAllTimings]          = useState([]);
  const [isTranscribing,     setIsTranscribing]      = useState(false);

  const [volumeLevel,      setVolumeLevel]      = useState(0);
  const [isSilence,        setIsSilence]        = useState(false);
  const [waveformHistory,  setWaveformHistory]  = useState([]);
  const [isAiCorrecting,   setIsAiCorrecting]   = useState(false);
  const [correctionQueue,  setCorrectionQueue]  = useState([]);

  // Streaming state
  const [streamingError, setStreamingError] = useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────
  const timerRef              = useRef(null);
  const audioStreamRef        = useRef(null);
  const audioContextRef       = useRef(null);
  const mediaStreamSourceRef  = useRef(null);
  const processorRef          = useRef(null);
  const mediaRecorderRef      = useRef(null);  // теперь ref, не state

  const audioBufferRef        = useRef([]);
  const isFinalizingRef       = useRef(false);

  const silenceStartRef       = useRef(null);
  const chunkStartTimeRef     = useRef(Date.now());
  const pendingCorrectionRef  = useRef([]);
  const aiCorrectionTimerRef  = useRef(null);
  const waveformIntervalRef   = useRef(null);

  // Streaming refs
  const streamingIdRef        = useRef(null);
  const chunkIndexRef         = useRef(0);
  const chunkQueueRef         = useRef([]);
  const isSendingRef          = useRef(false);

  // ── Форматирование ────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimeDetailed = (seconds) => {
    const mins   = Math.floor(seconds / 60);
    const secs   = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  };

  const floatToWav = (buffer, sampleRate) => {
    const bytesPerSample = 2;
    const channels    = 1;
    const dataLength  = buffer.length * bytesPerSample;
    const headerLen   = 44;
    const totalLength = headerLen + dataLength;
    const wav         = new ArrayBuffer(totalLength);
    const view        = new DataView(wav);
    const writeString = (v, offset, s) => {
      for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
    };
    writeString(view,  0, 'RIFF');
    view.setUint32(4,  totalLength - 8, true);
    writeString(view,  8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20,  1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    let offset = 44;
    for (let i = 0; i < buffer.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([wav], { type: 'audio/wav' });
  };

  const formatTimedTranscription = (timings) => {
    if (!timings || timings.length === 0) return '';
    let result = '';
    let currentSentence = [];
    let sentenceStartTime = timings[0]?.start || 0;
    timings.forEach((timing, index) => {
      currentSentence.push(timing.word);
      const isNewSentence =
        index === 0 ||
        timing.word.match(/[.!?]$/) ||
        currentSentence.length >= 15 ||
        index === timings.length - 1;
      if (isNewSentence) {
        result += `[${formatTimeDetailed(sentenceStartTime)}] ${currentSentence.join(' ')}\n`;
        currentSentence = [];
        if (index < timings.length - 1) sentenceStartTime = timings[index + 1]?.start || 0;
      }
    });
    return result;
  };

  // ── Стриминг аудио-чанков (webm) на сервер ───────────────────────────
  const processChunkQueue = useCallback(async () => {
    if (isSendingRef.current) return;
    if (chunkQueueRef.current.length === 0) return;
    if (!streamingIdRef.current) return;

    isSendingRef.current = true;

    while (chunkQueueRef.current.length > 0) {
      const { blob, index } = chunkQueueRef.current.shift();

      try {
        const formData = new FormData();
        formData.append('chunk',       blob, `chunk_${index}.webm`);
        formData.append('streamingId', streamingIdRef.current);
        formData.append('chunkIndex',  index);

        const res = await fetch(`${API_BASE_URL}/api/audio/stream/chunk`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          console.error(`AudioRecorder: ошибка отправки чанка #${index}`, res.status);
          setStreamingError(`Ошибка отправки чанка #${index}`);
          chunkQueueRef.current.unshift({ blob, index });
          break;
        } else {
          setStreamingError(null);
        }
      } catch (err) {
        console.error(`AudioRecorder: сетевая ошибка чанка #${index}`, err);
        setStreamingError('Нет связи с сервером. Повтор...');
        chunkQueueRef.current.unshift({ blob, index });
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    isSendingRef.current = false;
  }, []);

  const enqueueChunk = useCallback((blob) => {
    const index = chunkIndexRef.current++;
    chunkQueueRef.current.push({ blob, index });
    processChunkQueue();
  }, [processChunkQueue]);

  // ── AI-коррекция через LM Studio ─────────────────────────────────────
  const correctTextWithAI = useCallback(async (rawText) => {
    if (!rawText || rawText.trim().length < 20) return rawText;
    try {
      setIsAiCorrecting(true);
      const response = await fetch(`${API_BASE_URL}/api/whisper/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      if (!response.ok) return rawText;
      const data = await response.json();
      return data.corrected?.trim() || rawText;
    } catch (e) {
      console.warn('AI коррекция не удалась:', e);
      return rawText;
    } finally {
      setIsAiCorrecting(false);
    }
  }, []);

  const scheduleAiCorrection = useCallback((newRawText) => {
    pendingCorrectionRef.current.push(newRawText);
    if (aiCorrectionTimerRef.current) clearTimeout(aiCorrectionTimerRef.current);

    aiCorrectionTimerRef.current = setTimeout(async () => {
      const batch = pendingCorrectionRef.current.join(' ');
      pendingCorrectionRef.current = [];
      if (!batch.trim()) return;

      const corrected = await correctTextWithAI(batch);

      setPlainTranscription(prev => {
        const idx = prev.lastIndexOf(batch.trim());
        if (idx === -1) return prev;
        const updated = prev.slice(0, idx) + corrected + prev.slice(idx + batch.trim().length);
        onTranscriptionUpdate(updated);
        return updated;
      });
    }, 4000);
  }, [correctTextWithAI, onTranscriptionUpdate]);

  // ── Transcribe whisper-чанк ───────────────────────────────────────────
  const transcribeAudioChunk = useCallback(async (audioData, sampleRate) => {
    if (!audioData || audioData.length === 0 || isFinalizingRef.current) return;

    try {
      setIsTranscribing(true);
      const wavBlob = floatToWav(audioData, sampleRate);
      if (wavBlob.size < 2000) return;

      const formData = new FormData();
      formData.append('audio',          wavBlob, `chunk_${Date.now()}.wav`);
      formData.append('return_timings', 'true');

      const response = await fetch(`${API_BASE_URL}/api/whisper/transcribe-chunk`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`Ошибка транскрибации: ${response.status}`);

      const result = await response.json();

      if (result.text && result.text.trim()) {
        const rawText = result.text.trim();

        setPlainTranscription(prev => {
          const separator = prev && !prev.endsWith(' ') ? ' ' : '';
          const newText = prev + separator + rawText;
          onTranscriptionUpdate(newText);
          return newText;
        });

        scheduleAiCorrection(rawText);

        if (result.timings && result.timings.length > 0) {
          setAllTimings(prev => {
            const newTimings = [...prev, ...result.timings];
            setTimedTranscription(formatTimedTranscription(newTimings));
            return newTimings;
          });
        }
      }
    } catch (err) {
      console.error('Ошибка транскрибации фрагмента:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [scheduleAiCorrection, onTranscriptionUpdate]);

  const finalizeTranscription = async () => {
    if (!audioContextRef.current || audioBufferRef.current.length === 0) return;
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

  // ── Старт записи ─────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      // 1. Инициализируем стриминговую сессию на сервере
      const initRes = await fetch(`${API_BASE_URL}/api/audio/stream/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, teacherId, teacherName }),
      });
      if (!initRes.ok) throw new Error('Не удалось создать аудио-сессию на сервере');
      const { streamingId } = await initRes.json();
      streamingIdRef.current = streamingId;
      chunkIndexRef.current  = 0;
      chunkQueueRef.current  = [];
      isSendingRef.current   = false;
      setStreamingError(null);

      // 2. Микрофон
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          sampleRate:       16000,
          channelCount:     1,
        },
      });
      audioStreamRef.current = stream;

      // 3. MediaRecorder — чанки идут на сервер
      const recorder = new MediaRecorder(stream, {
        mimeType:          'audio/webm',
        audioBitsPerSecond: 128000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) enqueueChunk(e.data);
      };

      recorder.onstop = () => {
        setShowSaveModal(true);
      };

      recorder.start(3000); // чанк каждые 3 секунды
      mediaRecorderRef.current = recorder;

      // 4. AudioContext для Whisper-транскрипции (через worklet, параллельно)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;

      const workletCode = `
        class VolumeProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this._buffer = [];
          }
          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            const data = input[0];
            for (let i = 0; i < data.length; i++) this._buffer.push(data[i]);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
            const rms = Math.sqrt(sum / data.length);
            this.port.postMessage({ rms, buffer: Array.from(data) });
            return true;
          }
        }
        registerProcessor('volume-processor', VolumeProcessor);
      `;
      const blob      = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const workletNode = new AudioWorkletNode(audioContext, 'volume-processor');
      processorRef.current = workletNode;

      audioBufferRef.current  = [];
      silenceStartRef.current = null;
      chunkStartTimeRef.current = Date.now();
      isFinalizingRef.current = false;

      workletNode.port.onmessage = (e) => {
        const { rms, buffer } = e.data;
        audioBufferRef.current.push(...buffer);

        setVolumeLevel(Math.min(1, rms / 0.3));

        const now           = Date.now();
        const chunkAge      = now - chunkStartTimeRef.current;
        const currentlySilent = rms < SILENCE_THRESHOLD;
        setIsSilence(currentlySilent);

        if (currentlySilent) {
          if (!silenceStartRef.current) silenceStartRef.current = now;
          const silenceDuration = now - silenceStartRef.current;
          if (silenceDuration >= SILENCE_DURATION_MS && chunkAge >= MIN_CHUNK_DURATION_MS) {
            const bufferCopy = new Float32Array(audioBufferRef.current);
            transcribeAudioChunk(bufferCopy, audioContext.sampleRate);
            audioBufferRef.current = [];
            chunkStartTimeRef.current = now;
            silenceStartRef.current = null;
          }
        } else {
          silenceStartRef.current = null;
          if (chunkAge >= MAX_CHUNK_DURATION_MS) {
            const bufferCopy = new Float32Array(audioBufferRef.current);
            transcribeAudioChunk(bufferCopy, audioContext.sampleRate);
            audioBufferRef.current = [];
            chunkStartTimeRef.current = now;
          }
        }
      };

      waveformIntervalRef.current = setInterval(() => {
        setVolumeLevel(v => {
          setWaveformHistory(prev => {
            const next = [...prev, v];
            return next.length > WAVEFORM_HISTORY ? next.slice(-WAVEFORM_HISTORY) : next;
          });
          return v;
        });
      }, 80);

      source.connect(workletNode);

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      if (socketRef.current?.connected) {
        socketRef.current.emit('start_recording', { sessionId, teacherId, teacherName });
      }
      onRecordingStarted();
    } catch (err) {
      console.error('Ошибка начала записи:', err);
      alert('Не удалось получить доступ к микрофону');
    }
  };

  // ── Пауза / Продолжить ────────────────────────────────────────────────
  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'recording') return;

    recorder.pause();
    setIsPaused(true);
    clearInterval(waveformIntervalRef.current);
    if (mediaStreamSourceRef.current && processorRef.current) {
      mediaStreamSourceRef.current.disconnect(processorRef.current);
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'paused') return;

    recorder.resume();
    setIsPaused(false);
    if (mediaStreamSourceRef.current && processorRef.current) {
      mediaStreamSourceRef.current.connect(processorRef.current);
      waveformIntervalRef.current = setInterval(() => {
        setVolumeLevel(v => {
          setWaveformHistory(prev => {
            const next = [...prev, v];
            return next.length > WAVEFORM_HISTORY ? next.slice(-WAVEFORM_HISTORY) : next;
          });
          return v;
        });
      }, 80);
    }
  };

  // ── Стоп ──────────────────────────────────────────────────────────────
  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    clearInterval(waveformIntervalRef.current);
    if (aiCorrectionTimerRef.current) clearTimeout(aiCorrectionTimerRef.current);

    await finalizeTranscription();
    await new Promise(resolve => setTimeout(resolve, 500));

    recorder.stop(); // → последний ondataavailable + onstop
    mediaRecorderRef.current = null;

    if (processorRef.current)       { processorRef.current.disconnect();       processorRef.current = null; }
    if (mediaStreamSourceRef.current){ mediaStreamSourceRef.current.disconnect(); mediaStreamSourceRef.current = null; }
    if (audioContextRef.current)    { await audioContextRef.current.close();   audioContextRef.current = null; }

    setIsRecording(false);
    setIsPaused(false);
    setWaveformHistory([]);

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('stop_recording', { sessionId, teacherId, teacherName });
    }
    onRecordingStopped();
  };

  // ── Сохранение (только метаданные — аудио уже на сервере) ────────────
  const saveRecording = async () => {
    if (!streamingIdRef.current) {
      alert('Нет данных для сохранения');
      return;
    }

    setUploading(true);
    try {
      // Ждём отправки всех чанков
      if (chunkQueueRef.current.length > 0 || isSendingRef.current) {
        await new Promise((resolve) => {
          const check = setInterval(() => {
            if (chunkQueueRef.current.length === 0 && !isSendingRef.current) {
              clearInterval(check);
              resolve();
            }
          }, 200);
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/audio/stream/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamingId:       streamingIdRef.current,
          sessionId,
          teacherId,
          title:             recordingTitle || `Запись от ${new Date().toLocaleString()}`,
          description:       recordingDescription,
          duration:          recordingDuration,
          transcription:     plainTranscription,
          timedTranscription,
          timings:           allTimings.length > 0 ? allTimings : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка финализации: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      setShowSaveModal(false);
      setRecordingTitle('');
      setRecordingDescription('');
      setRecordingTime(0);
      setRecordingDuration(0);
      setPlainTranscription('');
      setTimedTranscription('');
      setAllTimings([]);
      streamingIdRef.current = null;

      onRecordingSaved(result);
      alert('Запись успешно сохранена');
    } catch (err) {
      console.error('Ошибка сохранения записи:', err);
      alert('Ошибка сохранения записи: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelRecording = async () => {
    if (streamingIdRef.current) {
      try {
        await fetch(`${API_BASE_URL}/api/audio/stream/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamingId: streamingIdRef.current }),
        });
      } catch (_) {}
      streamingIdRef.current = null;
    }

    setShowSaveModal(false);
    setRecordingTitle('');
    setRecordingDescription('');
    setRecordingTime(0);
    setRecordingDuration(0);
    chunkQueueRef.current = [];
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

  // ── Таймер ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          setRecordingDuration(prev + 1);
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isPaused]);

  // ── Экспорт методов для VideoRecorder ─────────────────────────────────
  useImperativeHandle(ref, () => ({
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isRecording,
    isPaused,
  }), [isRecording, isPaused]);

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
      volumeLevel={volumeLevel}
      isSilence={isSilence}
      waveformHistory={waveformHistory}
      isAiCorrecting={isAiCorrecting}
      streamingError={streamingError}
    />
  );
});

export default AudioRecorder;