import React, { useState, useRef, useEffect } from 'react';

const RecordingCard = ({ recording, onEdit, onDelete, onTranscribe, onEnhanceText }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Состояния аудиоплеера
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef(null);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Управление аудио
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      await onTranscribe();
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleEnhance = async (action) => {
    if (onEnhanceText && recording.transcription) {
      await onEnhanceText(action);
    }
  };

  const getTypeIcon = () => {
    return recording.type === 'video' ? '📹' : '🎙️';
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="recording-card">
      <style jsx>{`
        .recording-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
          background: white;
        }
        .recording-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .recording-header {
          padding: 20px;
          background-color: #f9fafb;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .recording-info {
          flex: 1;
        }
        .recording-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .recording-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #6B7280;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .type-badge {
          display: inline-block;
          padding: 4px 12px;
          background-color: #e5e7eb;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .type-badge.audio {
          background-color: #EFF6FF;
          color: #1E40AF;
        }
        .type-badge.video {
          background-color: #FEF3C7;
          color: #92400E;
        }
        .recording-actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          font-weight: 500;
        }
        .action-btn:hover {
          background-color: #f3f4f6;
          transform: translateY(-1px);
        }
        .action-btn.danger:hover {
          background-color: #FEE2E2;
          border-color: #FECACA;
        }
        .action-btn.primary {
          background-color: #7B61FF;
          color: white;
          border-color: #7B61FF;
        }
        .action-btn.primary:hover {
          background-color: #6750E0;
        }
        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .recording-content {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          background-color: white;
        }
        
        /* Кастомный аудиоплеер */
        .audio-player-container {
          background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .player-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .play-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #7B61FF;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .play-btn:hover {
          background: #6750E0;
          transform: scale(1.05);
        }
        .time-display {
          font-size: 14px;
          color: #374151;
          font-family: monospace;
          min-width: 100px;
        }
        .progress-slider {
          flex: 1;
          min-width: 200px;
          height: 4px;
          -webkit-appearance: none;
          background: #e5e7eb;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7B61FF;
          cursor: pointer;
        }
        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .volume-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          font-size: 14px;
        }
        .volume-slider {
          width: 80px;
          height: 4px;
          -webkit-appearance: none;
          background: #e5e7eb;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #7B61FF;
          cursor: pointer;
        }
        
        .transcription-section {
          margin-bottom: 20px;
        }
        .section-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .transcription-text {
          background-color: #f9fafb;
          padding: 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          color: #374151;
          max-height: 300px;
          overflow-y: auto;
          white-space: pre-wrap;
        }
        .empty-transcription {
          color: #9CA3AF;
          font-style: italic;
        }
        .enhance-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .enhance-btn {
          padding: 6px 12px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .enhance-btn:hover {
          background-color: #e5e7eb;
        }
        .expand-icon {
          font-size: 20px;
          color: #6B7280;
        }
        @media (max-width: 768px) {
          .recording-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .recording-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .player-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .progress-slider {
            min-width: auto;
          }
          .volume-control {
            justify-content: flex-end;
          }
        }
      `}</style>

      <div className="recording-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="recording-info">
          <div className="recording-title">
            <span>{recording.type === 'audio' ? '[Аудио]' : '[Видео]'}</span>
            <span>{recording.title || 'Без названия'}</span>
            <span className={`type-badge ${recording.type === 'audio' ? 'audio' : 'video'}`}>
              {recording.type === 'audio' ? 'Аудио' : 'Видео'}
            </span>
          </div>
          <div className="recording-meta">
            <span className="meta-item">Дата: {formatDate(recording.createdAt)}</span>
            {recording.duration && (
              <span className="meta-item">Длительность: {formatDuration(recording.duration)}</span>
            )}
            {recording.fileSize && (
              <span className="meta-item">Размер: {formatFileSize(recording.fileSize)}</span>
            )}
            {recording.courseTitle && (
              <span className="meta-item">Курс: {recording.courseTitle}</span>
            )}
          </div>
        </div>
        <div className="recording-actions" onClick={(e) => e.stopPropagation()}>
          {!recording.transcription && (
            <button 
              onClick={handleTranscribe} 
              disabled={isTranscribing}
              className="action-btn primary"
            >
              {isTranscribing ? 'Транскрибация...' : 'Распознать речь'}
            </button>
          )}
          <button onClick={() => onEdit(recording)} className="action-btn">
            Редактировать
          </button>
          <button onClick={() => onDelete()} className="action-btn danger">
            Удалить
          </button>
          <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="recording-content">
          {/* Аудиоплеер */}
          {recording.filePath && (
            <div className="audio-player-container">
              <audio
                ref={audioRef}
                src={recording.filePath}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="player-controls">
                <button className="play-btn" onClick={handlePlayPause}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                
                <div className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                
                <input
                  type="range"
                  className="progress-slider"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                />
                
                <div className="volume-control">
                  <button className="volume-btn" onClick={handleToggleMute}>
                    {isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
                  </button>
                  <input
                    type="range"
                    className="volume-slider"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="transcription-section">
            <div className="section-label">Транскрипция</div>
            {recording.transcription ? (
              <>
                <div className="transcription-text">{recording.transcription}</div>
                <div className="enhance-buttons">
                  <button onClick={() => handleEnhance('summary')} className="enhance-btn">
                    Создать краткое содержание
                  </button>
                  <button onClick={() => handleEnhance('bullet_points')} className="enhance-btn">
                    Выделить основные тезисы
                  </button>
                  <button onClick={() => handleEnhance('structure')} className="enhance-btn">
                    Структурировать по темам
                  </button>
                  <button onClick={() => handleEnhance('questions')} className="enhance-btn">
                    Сгенерировать вопросы
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-transcription">
                Транскрипция отсутствует. Нажмите "Распознать речь" для автоматического распознавания.
              </div>
            )}
          </div>

          {recording.aiSummary && (
            <div className="transcription-section">
              <div className="section-label">Краткое содержание (AI)</div>
              <div className="transcription-text">{recording.aiSummary}</div>
            </div>
          )}

          {recording.aiBulletPoints && (
            <div className="transcription-section">
              <div className="section-label">Основные тезисы (AI)</div>
              <div className="transcription-text">{recording.aiBulletPoints}</div>
            </div>
          )}

          {recording.aiStructure && (
            <div className="transcription-section">
              <div className="section-label">Структура лекции (AI)</div>
              <div className="transcription-text">{recording.aiStructure}</div>
            </div>
          )}

          {recording.aiQuestions && (
            <div className="transcription-section">
              <div className="section-label">Вопросы для самопроверки (AI)</div>
              <div className="transcription-text">{recording.aiQuestions}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordingCard;