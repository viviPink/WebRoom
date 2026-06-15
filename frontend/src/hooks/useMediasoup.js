/**
 * useMediasoup.js — React hook для mediasoup SFU
 * Заменяет всю P2P WebRTC логику
 * 
 * Используется и преподавателем, и студентом
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import MediasoupClient from '../utils/mediasoupClient';

const useMediasoup = (socketRef, sessionId, userRole) => {
  const clientRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // producerId -> { stream, kind, appData, socketId }
  const [localProducers, setLocalProducers] = useState(new Map()); // label -> producerId

  // Инициализация mediasoup при подключении сокета
  const initMediasoup = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !sessionId) {
      console.warn('[mediasoup] Cannot init: socket not connected or no sessionId');
      return;
    }

    try {
      console.log('[mediasoup] Initializing for session', sessionId);
      const client = new MediasoupClient();

      // Получаем RTP capabilities от сервера
      const { rtpCapabilities } = await new Promise((resolve, reject) => {
        socketRef.current.emit('ms-get-rtp-capabilities', { sessionId }, (response) => {
          if (response.error) reject(new Error(response.error));
          else resolve(response);
        });
      });

      await client.init(socketRef.current, sessionId, rtpCapabilities);

      // Callback при получении нового consumer
      client.onNewConsumer = (consumer, stream, appData) => {
        console.log('[mediasoup] New consumer created:', {
          producerId: consumer.producerId,
          kind: consumer.kind,
          appData: appData
        });
        
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(consumer.producerId, {
            stream,
            kind: consumer.kind,
            appData: appData || {},
            consumerId: consumer.id,
          });
          return next;
        });
      };

      client.onConsumerClosed = (consumerId) => {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          for (const [key, val] of next) {
            if (val.consumerId === consumerId) {
              next.delete(key);
              break;
            }
          }
          return next;
        });
      };

      clientRef.current = client;
      setIsReady(true);
      console.log('[mediasoup] Ready! Fetching existing producers...');

      // Подписываемся на существующие producers
      const existingProducers = await client.getProducers();
      console.log('[mediasoup] Existing producers:', existingProducers?.length || 0);
      if (Array.isArray(existingProducers)) {
        for (const p of existingProducers) {
          await client.consume(p.producerId, p.appData);
        }
      }
    } catch (err) {
      console.error('[mediasoup] init error:', err);
      setIsReady(false);
    }
  }, [socketRef, sessionId]);

  // Слушаем события от сервера
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleNewProducer = async ({ producerId, socketId, kind, appData }) => {
      console.log('[mediasoup] New producer event:', { producerId, socketId, kind, label: appData?.label, appData });
      if (!clientRef.current) {
        console.warn('[mediasoup] Client not ready, cannot consume new producer');
        return;
      }
      // Не подписываемся на свои собственные producers
      if (socketId === socket.id) {
        console.log('[mediasoup] Skipping own producer');
        return;
      }
      try {
        // consume использует внутреннюю очередь — безопасно вызывать параллельно
        await clientRef.current.consume(producerId, appData);
        console.log('[mediasoup] Consumed producer:', producerId, kind, appData?.type, appData?.role);
      } catch (err) {
        console.error('[mediasoup] Error consuming new producer:', err.message);
      }
    };

    const handleProducerClosed = ({ producerId }) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(producerId);
        return next;
      });
    };

    const handleProducerPaused = ({ producerId }) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        const entry = next.get(producerId);
        if (entry) {
          next.set(producerId, { ...entry, paused: true });
        }
        return next;
      });
    };

    const handleProducerResumed = ({ producerId }) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        const entry = next.get(producerId);
        if (entry) {
          next.set(producerId, { ...entry, paused: false });
        }
        return next;
      });
    };

    socket.on('ms-new-producer', handleNewProducer);
    socket.on('ms-producer-closed', handleProducerClosed);
    socket.on('ms-producer-paused', handleProducerPaused);
    socket.on('ms-producer-resumed', handleProducerResumed);

    return () => {
      socket.off('ms-new-producer', handleNewProducer);
      socket.off('ms-producer-closed', handleProducerClosed);
      socket.off('ms-producer-paused', handleProducerPaused);
      socket.off('ms-producer-resumed', handleProducerResumed);
    };
  }, [socketRef, isReady]);

  // ── Produce (отправка медиа) ────────────────────────────────

  /**
   * Начать трансляцию камеры
   */
  const startCamera = useCallback(async (constraints = { video: true, audio: true }) => {
    if (!clientRef.current) return null;
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      const producer = await clientRef.current.produce(videoTrack, 'camera', { role: userRole, type: 'camera', kind: 'video' });
      setLocalProducers(prev => new Map(prev).set('camera', producer.id));
      console.log('[mediasoup] Camera video producer created:', producer.id);
    }
    if (audioTrack) {
      const producer = await clientRef.current.produce(audioTrack, 'mic', { role: userRole, type: 'mic', kind: 'audio' });
      setLocalProducers(prev => new Map(prev).set('mic', producer.id));
      console.log('[mediasoup] Mic audio producer created:', producer.id);
    }

    return stream;
  }, [userRole]);

  /**
   * Начать трансляцию экрана
   */
  const startScreenShare = useCallback(async (target = 'all') => {
    if (!clientRef.current) return null;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      const producer = await clientRef.current.produce(videoTrack, 'screen', { role: userRole, type: 'screen', target, kind: 'video' });
      setLocalProducers(prev => new Map(prev).set('screen', producer.id));
      console.log('[mediasoup] Screen video producer created:', producer.id);

      videoTrack.onended = () => {
        stopScreenShare();
      };
    }
    if (audioTrack) {
      const producer = await clientRef.current.produce(audioTrack, 'screen-audio', { role: userRole, type: 'screen-audio', target, kind: 'audio' });
      setLocalProducers(prev => new Map(prev).set('screen-audio', producer.id));
      console.log('[mediasoup] Screen audio producer created:', producer.id);
    }

    return stream;
  }, [userRole]);

  /**
   * Транслировать запись (видео/аудио файл)
   */
  const startPlaybackBroadcast = useCallback(async (videoElement) => {
    if (!clientRef.current || !videoElement) return;

    const stream = videoElement.captureStream ? videoElement.captureStream() : videoElement.mozCaptureStream();
    if (!stream) throw new Error('captureStream не поддерживается');

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      const producer = await clientRef.current.produce(videoTrack, 'playback-video', { role: 'teacher', type: 'playback', kind: 'video' });
      setLocalProducers(prev => new Map(prev).set('playback-video', producer.id));
    }
    if (audioTrack) {
      const producer = await clientRef.current.produce(audioTrack, 'playback-audio', { role: 'teacher', type: 'playback', kind: 'audio' });
      setLocalProducers(prev => new Map(prev).set('playback-audio', producer.id));
    }
  }, []);

  /**
   * Включить только микрофон (для студента — голос)
   */
  const startMic = useCallback(async () => {
    if (!clientRef.current) return null;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const producer = await clientRef.current.produce(audioTrack, 'mic', { role: userRole, type: 'mic', kind: 'audio' });
      setLocalProducers(prev => new Map(prev).set('mic', producer.id));
      console.log('[mediasoup] Mic only producer created:', producer.id);
    }
    return stream;
  }, [userRole]);

  // ── Stop (остановка) ────────────────────────────────────────

  const stopCamera = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.closeProducer('camera');
    await clientRef.current.closeProducer('mic');
    setLocalProducers(prev => { const n = new Map(prev); n.delete('camera'); n.delete('mic'); return n; });
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.closeProducer('screen');
    await clientRef.current.closeProducer('screen-audio');
    setLocalProducers(prev => { const n = new Map(prev); n.delete('screen'); n.delete('screen-audio'); return n; });
  }, []);

  const stopPlaybackBroadcast = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.closeProducer('playback-video');
    await clientRef.current.closeProducer('playback-audio');
    setLocalProducers(prev => { const n = new Map(prev); n.delete('playback-video'); n.delete('playback-audio'); return n; });
  }, []);

  const stopMic = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.closeProducer('mic');
    setLocalProducers(prev => { const n = new Map(prev); n.delete('mic'); return n; });
  }, []);

  // ── Pause/Resume ────────────────────────────────────────────

  const pauseProducer = useCallback(async (label) => {
    if (!clientRef.current) return;
    await clientRef.current.pauseProducer(label);
  }, []);

  const resumeProducer = useCallback(async (label) => {
    if (!clientRef.current) return;
    await clientRef.current.resumeProducer(label);
  }, []);

  // ── Cleanup ─────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.close();
      clientRef.current = null;
    }
    setIsReady(false);
    setRemoteStreams(new Map());
    setLocalProducers(new Map());
  }, []);

  // ── Вспомогательные геттеры ─────────────────────────────────

  const getTeacherCameraStream = useCallback(() => {
    for (const [, entry] of remoteStreams) {
      if (entry.appData?.role === 'teacher' && entry.appData?.type === 'camera') return entry.stream;
    }
    return null;
  }, [remoteStreams]);

  const getTeacherScreenStream = useCallback(() => {
    for (const [, entry] of remoteStreams) {
      if (entry.appData?.role === 'teacher' && entry.appData?.type === 'screen') return entry.stream;
    }
    return null;
  }, [remoteStreams]);

  const getTeacherAudioStream = useCallback(() => {
    for (const [, entry] of remoteStreams) {
      if (entry.appData?.role === 'teacher' && 
          (entry.appData?.type === 'mic' || entry.appData?.type === 'screen-audio') &&
          entry.kind === 'audio') {
        return entry.stream;
      }
    }
    return null;
  }, [remoteStreams]);

  const getTeacherMicStream = useCallback(() => {
    for (const [, entry] of remoteStreams) {
      if (entry.appData?.role === 'teacher' && entry.appData?.type === 'mic' && entry.kind === 'audio') {
        return entry.stream;
      }
    }
    return null;
  }, [remoteStreams]);

  const getPlaybackStream = useCallback(() => {
    for (const [, entry] of remoteStreams) {
      if (entry.appData?.type === 'playback') return entry.stream;
    }
    return null;
  }, [remoteStreams]);

  const getStudentMicStreams = useCallback(() => {
    const streams = [];
    for (const [producerId, entry] of remoteStreams) {
      if (entry.appData?.role === 'student' && entry.appData?.type === 'mic') {
        streams.push({ producerId, stream: entry.stream, appData: entry.appData });
      }
    }
    return streams;
  }, [remoteStreams]);

  const getStudentScreenStream = useCallback((socketId) => {
    for (const [, entry] of remoteStreams) {
      if (entry.appData?.role === 'student' && entry.appData?.type === 'screen' && entry.appData?.socketId === socketId) {
        return entry.stream;
      }
    }
    return null;
  }, [remoteStreams]);

  return {
    initMediasoup,
    isReady,
    remoteStreams,
    localProducers,
    startCamera,
    startScreenShare,
    startPlaybackBroadcast,
    startMic,
    stopCamera,
    stopScreenShare,
    stopPlaybackBroadcast,
    stopMic,
    pauseProducer,
    resumeProducer,
    cleanup,
    getTeacherCameraStream,
    getTeacherScreenStream,
    getTeacherAudioStream,
    getTeacherMicStream,
    getPlaybackStream,
    getStudentMicStreams,
    getStudentScreenStream,
    clientRef,
  };
};

export default useMediasoup;