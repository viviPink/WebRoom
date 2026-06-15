import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoRecorderView from './VideoRecorderView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

/**
 * VideoRecorder — непрерывная запись через canvas-композитинг.
 *
 * Чанки стримятся на сервер по мере записи — ничего не копится в памяти.
 * Схема:
 *   1. startVideoRecording → POST /api/video/stream/start  → получаем streamingId
 *   2. ondataavailable     → POST /api/video/stream/chunk  (каждые 3с)
 *   3. stopRecording       → POST /api/video/stream/finalize (только метаданные)
 *
 * Пропы:
 *   localStream         — текущий поток преподавателя
 *   studentScreenStream — поток экрана активного студента (или null)
 *   activeVideoSource   — 'local' | 'student'  (управляется снаружи)
 */
const VideoRecorder = ({
  sessionId,
  teacherId,
  teacherName,
  localStream,
  studentScreenStream,
  activeVideoSource = 'local',
  socketRef,
  audioRecorderRef,
  onRecordingStarted = () => {},
  onRecordingStopped = () => {},
  onRecordingSaved   = () => {},
}) => {
  const [isRecording,          setIsRecording]          = useState(false);
  const [isPaused,             setIsPaused]             = useState(false);
  const [recordingTime,        setRecordingTime]        = useState(0);
  const [showSaveModal,        setShowSaveModal]        = useState(false);
  const [recordingTitle,       setRecordingTitle]       = useState('');
  const [recordingDescription, setRecordingDescription] = useState('');
  const [uploading,            setUploading]            = useState(false);
  const [recordingDuration,    setRecordingDuration]    = useState(0);
  const [audioLinked,          setAudioLinked]          = useState(false);

  // Streaming state
  const [chunksSent,    setChunksSent]    = useState(0);
  const [streamingError, setStreamingError] = useState(null);

  // ── refs ──────────────────────────────────────────────────────────────
  const canvasRef            = useRef(null);
  const rafRef               = useRef(null);
  const mediaRecorderRef     = useRef(null);
  const timerRef             = useRef(null);
  const currentTimeRef       = useRef(0);
  const audioCtxRef          = useRef(null);
  const audioDestRef         = useRef(null);
  const audioSourceNodeRef   = useRef(null);

  // Streaming refs
  const streamingIdRef       = useRef(null);  // ID сессии стриминга на сервере
  const chunkIndexRef        = useRef(0);     // Порядковый номер чанка
  const chunkQueueRef        = useRef([]);    // Очередь неотправленных чанков
  const isSendingRef         = useRef(false); // Идёт ли сейчас отправка

  // Актуальные значения в rAF-цикле
  const localStreamRef        = useRef(localStream);
  const studentStreamRef      = useRef(studentScreenStream);
  const activeSourceRef       = useRef(activeVideoSource);

  useEffect(() => { localStreamRef.current   = localStream;          }, [localStream]);
  useEffect(() => { studentStreamRef.current = studentScreenStream;  }, [studentScreenStream]);
  useEffect(() => { activeSourceRef.current  = activeVideoSource;    }, [activeVideoSource]);

  // ── Переключение аудио на лету ────────────────────────────────────────
  const switchAudioSource = useCallback((stream) => {
    if (!audioCtxRef.current || !audioDestRef.current) return;

    if (audioSourceNodeRef.current) {
      try { audioSourceNodeRef.current.disconnect(); } catch (_) {}
      audioSourceNodeRef.current = null;
    }

    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const node = audioCtxRef.current.createMediaStreamSource(
        new MediaStream(audioTracks)
      );
      node.connect(audioDestRef.current);
      audioSourceNodeRef.current = node;
    } catch (err) {
      console.error('VideoRecorder: ошибка подключения аудио', err);
    }
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const stream = activeVideoSource === 'student' ? studentScreenStream : localStream;
    switchAudioSource(stream);
  }, [activeVideoSource, localStream, studentScreenStream, isRecording, switchAudioSource]);

  // ── Получение актуального video-элемента для rAF ─────────────────────
  const getOrCreateVideoEl = useCallback((stream) => {
    if (!stream || stream.getVideoTracks().length === 0) return null;

    const id = stream.id;
    let el = document.querySelector(`video[data-rec-id="${id}"]`);
    if (el) return el;

    el = document.createElement('video');
    el.setAttribute('data-rec-id', id);
    el.srcObject   = stream;
    el.muted       = true;
    el.autoplay    = true;
    el.playsInline = true;
    el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(el);
    el.play().catch(() => {});
    return el;
  }, []);

  // ── rAF-цикл рисования на canvas ─────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const stream = activeSourceRef.current === 'student'
      ? studentStreamRef.current
      : localStreamRef.current;

    const video = getOrCreateVideoEl(stream);

    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      if (canvas.width !== video.videoWidth) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#444';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ожидание видео...', canvas.width / 2, canvas.height / 2);
    }

    rafRef.current = requestAnimationFrame(drawFrame);
  }, [getOrCreateVideoEl]);

  const stopRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const cleanupVideoElements = () => {
    document.querySelectorAll('video[data-rec-id]').forEach(el => {
      el.srcObject = null;
      el.remove();
    });
  };

  // ── Стриминг чанков на сервер ─────────────────────────────────────────
  /**
   * Последовательная отправка чанков — следующий идёт только после ответа сервера.
   * Это гарантирует правильный порядок и не перегружает канал.
   */
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

        const res = await fetch(`${API_BASE_URL}/api/video/stream/chunk`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          console.error(`VideoRecorder: ошибка отправки чанка #${index}`, res.status);
          setStreamingError(`Ошибка отправки чанка #${index}`);
          // Возвращаем чанк в начало очереди и прекращаем
          chunkQueueRef.current.unshift({ blob, index });
          break;
        } else {
          setChunksSent(s => s + 1);
          setStreamingError(null);
        }
      } catch (err) {
        console.error(`VideoRecorder: сетевая ошибка при отправке чанка #${index}`, err);
        setStreamingError('Нет связи с сервером. Повтор...');
        // Возвращаем и делаем паузу перед повтором
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

  // ── Старт записи ─────────────────────────────────────────────────────
  const startVideoRecording = async () => {
    const initialStream = activeVideoSource === 'student'
      ? studentScreenStream
      : localStream;

    if (!initialStream || initialStream.getVideoTracks().length === 0) {
      alert('Нет потока для записи. Сначала начните трансляцию экрана или включите камеру.');
      return;
    }

    let withAudio = false;
    if (audioRecorderRef?.current) {
      const alreadyRecording = audioRecorderRef.current.isRecording;
      if (!alreadyRecording) {
        withAudio = window.confirm(
          'Включить аудиозапись с транскрибацией?\n\nАудиозапись будет синхронизирована с видео — пауза и остановка будут применяться к обеим записям.'
        );
      } else {
        withAudio = true;
      }
    }

    try {
      // 1. Инициализируем стриминговую сессию на сервере
      const initRes = await fetch(`${API_BASE_URL}/api/video/stream/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, teacherId, teacherName }),
      });

      if (!initRes.ok) throw new Error('Не удалось создать сессию записи на сервере');
      const { streamingId } = await initRes.json();
      streamingIdRef.current = streamingId;
      chunkIndexRef.current  = 0;
      chunkQueueRef.current  = [];
      isSendingRef.current   = false;
      setChunksSent(0);
      setStreamingError(null);

      // 2. Скрытый canvas
      const canvas = document.createElement('canvas');
      canvas.width  = 1280;
      canvas.height = 720;
      canvas.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(canvas);
      canvasRef.current = canvas;

      // 3. AudioContext
      const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
      const audioDest = audioCtx.createMediaStreamDestination();
      audioCtxRef.current  = audioCtx;
      audioDestRef.current = audioDest;
      switchAudioSource(initialStream);

      // 4. Запуск rAF
      rafRef.current = requestAnimationFrame(drawFrame);

      // 5. Составной поток
      const canvasStream    = canvas.captureStream(30);
      const compositeStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);

      // 6. MediaRecorder — чанки уходят на сервер, не в память
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(compositeStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          enqueueChunk(e.data); // → сразу на сервер, не в chunksRef
        }
      };

      recorder.onstop = () => {
        setRecordingDuration(currentTimeRef.current);
        setShowSaveModal(true);
      };

      recorder.start(3000); // чанк каждые 3 секунды
      mediaRecorderRef.current = recorder;

      // 7. Таймер
      currentTimeRef.current = 0;
      timerRef.current = setInterval(() => {
        currentTimeRef.current += 1;
        setRecordingTime(t => t + 1);
      }, 1000);

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Запускаем аудио если согласился
      if (withAudio && audioRecorderRef?.current && !audioRecorderRef.current.isRecording) {
        try {
          await audioRecorderRef.current.startRecording();
          setAudioLinked(true);
        } catch (err) {
          console.warn('VideoRecorder: не удалось запустить аудио', err);
        }
      } else if (withAudio) {
        setAudioLinked(true);
      }

      if (socketRef.current?.connected) {
        socketRef.current.emit('start_recording', {
          sessionId, teacherId, teacherName, type: 'video',
        });
      }

      onRecordingStarted();
    } catch (err) {
      console.error('VideoRecorder: ошибка старта', err);
      alert('Не удалось начать запись: ' + err.message);
      stopRaf();
      cleanupVideoElements();
      streamingIdRef.current = null;
    }
  };

  // ── Пауза / Продолжить ────────────────────────────────────────────────
  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'recording') return;

    recorder.pause();
    stopRaf();
    setIsPaused(true);
    clearInterval(timerRef.current);
    timerRef.current = null;

    if (audioLinked && audioRecorderRef?.current && !audioRecorderRef.current.isPaused) {
      audioRecorderRef.current.pauseRecording();
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'paused') return;

    recorder.resume();
    rafRef.current = requestAnimationFrame(drawFrame);
    setIsPaused(false);
    timerRef.current = setInterval(() => {
      currentTimeRef.current += 1;
      setRecordingTime(t => t + 1);
    }, 1000);

    if (audioLinked && audioRecorderRef?.current && audioRecorderRef.current.isPaused) {
      audioRecorderRef.current.resumeRecording();
    }
  };

  // ── Стоп ──────────────────────────────────────────────────────────────
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    stopRaf();
    clearInterval(timerRef.current);
    timerRef.current = null;

    recorder.stop(); // → вызовет последний ondataavailable + onstop
    mediaRecorderRef.current = null;

    if (audioSourceNodeRef.current) {
      try { audioSourceNodeRef.current.disconnect(); } catch (_) {}
      audioSourceNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current  = null;
      audioDestRef.current = null;
    }

    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }

    cleanupVideoElements();

    setIsRecording(false);
    setIsPaused(false);

    if (audioLinked && audioRecorderRef?.current && audioRecorderRef.current.isRecording) {
      audioRecorderRef.current.stopRecording();
    }
    setAudioLinked(false);

    if (socketRef.current?.connected) {
      socketRef.current.emit('stop_recording', {
        sessionId, teacherId, teacherName, type: 'video',
      });
    }

    onRecordingStopped();
  };

  // ── Финализация (только метаданные — файл уже на сервере) ─────────────
  const saveRecording = async () => {
    if (!streamingIdRef.current) {
      alert('Нет данных для сохранения');
      return;
    }

    setUploading(true);
    try {
      // Ждём отправки всех оставшихся чанков из очереди
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

      // Финализируем: сервер склеивает чанки в готовый файл
      const response = await fetch(`${API_BASE_URL}/api/video/stream/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamingId:  streamingIdRef.current,
          sessionId,
          teacherId,
          title:        recordingTitle || `Видеозапись от ${new Date().toLocaleString()}`,
          description:  recordingDescription,
          duration:     recordingDuration,
          type:         'video',
        }),
      });

      if (!response.ok) throw new Error('Ошибка финализации видео');

      const result = await response.json();

      setShowSaveModal(false);
      setRecordingTitle('');
      setRecordingDescription('');
      setRecordingTime(0);
      setRecordingDuration(0);
      setChunksSent(0);
      streamingIdRef.current = null;

      onRecordingSaved(result);
      alert('Видеозапись успешно сохранена');
    } catch (err) {
      console.error('VideoRecorder: ошибка финализации', err);
      alert('Ошибка сохранения видео: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelRecording = async () => {
    // Сообщаем серверу что запись отменена — он удалит временные чанки
    if (streamingIdRef.current) {
      try {
        await fetch(`${API_BASE_URL}/api/video/stream/cancel`, {
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
    setChunksSent(0);
    chunkQueueRef.current = [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Cleanup при размонтировании ───────────────────────────────────────
  useEffect(() => {
    return () => {
      stopRaf();
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (canvasRef.current) canvasRef.current.remove();
      cleanupVideoElements();
    };
  }, []);

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
      activeVideoSource={activeVideoSource}
      audioLinked={audioLinked}
      // Стриминг-статус для UI
      chunksSent={chunksSent}
      streamingError={streamingError}
    />
  );
};

export default VideoRecorder;