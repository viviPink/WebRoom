
import React, { useState, useRef, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.31.119.190:3002';

const StudentVideoPlayer = ({ recording, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    timed: true,
    summary: false,
    bulletPoints: false,
    structure: false,
    questions: false
  });
  
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const progressBarRef = useRef(null);

  const summaryTabs = [
    { id: 'timed', label: 'Транскрипция с таймингами', field: 'timedTranscription' },
    { id: 'summary', label: 'Краткий конспект', field: 'aiSummary' },
    { id: 'bulletPoints', label: 'Тезисы', field: 'aiBulletPoints' },
    { id: 'structure', label: 'Структура лекции', field: 'aiStructure' },
    { id: 'questions', label: 'Вопросы для самопроверки', field: 'aiQuestions' }
  ];

  const hasContent = (field) => {
    const content = recording?.[field];
    return content && content.trim().length > 0;
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!isFullscreen) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const videoUrl = `${API_BASE_URL}${recording?.filePath || recording?.recordingPath}`;

  const availableSections = summaryTabs.filter(tab => hasContent(tab.field));

  return (
    <div className="video-player-container">
      <style jsx>{`
        .video-player-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #1a1a2e;
          z-index: 10000;
          display: flex;
          flex-direction: column;
        }

        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background-color: #16213e;
          border-bottom: 1px solid #2c3e5c;
        }

        .player-title {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          background-color: #2c3e5c;
          color: #fff;
        }

        .main-layout {
          flex: 1;
          display: flex;
          flex-direction: row;
          overflow: hidden;
        }

        .video-section {
          flex: 2;
          display: flex;
          flex-direction: column;
          background-color: #0f0f1a;
          position: relative;
        }

        .video-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #000;
          position: relative;
        }

        .video-element {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          cursor: pointer;
        }

        .video-controls {
          background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0));
          padding: 20px 24px 16px;
        }

        .progress-bar-container {
          margin-bottom: 16px;
          cursor: pointer;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background-color: #3b3b5c;
          border-radius: 2px;
          position: relative;
        }

        .progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background-color: #7B61FF;
          border-radius: 2px;
          width: ${(currentTime / duration) * 100 || 0}%;
        }

        .progress-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: #7B61FF;
          border-radius: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          left: ${(currentTime / duration) * 100 || 0}%;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .progress-bar-container:hover .progress-handle {
          opacity: 1;
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .control-button {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .control-button:hover {
          background-color: rgba(255,255,255,0.1);
        }

        .time-display {
          color: #94a3b8;
          font-size: 14px;
          font-family: monospace;
          margin-left: 8px;
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .volume-slider {
          width: 80px;
          height: 4px;
          -webkit-appearance: none;
          background: #3b3b5c;
          border-radius: 2px;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #7B61FF;
          border-radius: 50%;
          cursor: pointer;
        }

        .fullscreen-button {
          margin-left: 8px;
        }

        .notes-section {
          width: 400px;
          background-color: #fff;
          border-left: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .notes-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background-color: #fafbfc;
        }

        .notes-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px 0;
        }

        .notes-subtitle {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }

        .notes-content {
          flex: 1;
          padding: 20px 24px;
        }

        .notes-empty {
          text-align: center;
          padding: 60px 20px;
          color: #9CA3AF;
        }

        .notes-empty p {
          margin: 8px 0;
        }

        .summary-section {
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background-color: #f9fafb;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .summary-header:hover {
          background-color: #f3f4f6;
        }

        .summary-label {
          font-weight: 600;
          color: #111827;
          font-size: 15px;
        }

        .expand-icon {
          color: #6B7280;
          font-size: 18px;
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .summary-body {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          background-color: #fff;
        }

        .summary-text {
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
        }

        .timed-item {
          margin-bottom: 16px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 8px;
          border-left: 3px solid #7B61FF;
        }

        .timed-time {
          font-size: 12px;
          font-weight: 600;
          color: #7B61FF;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .timed-time:hover {
          text-decoration: underline;
        }

        .timed-text {
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }

        .bullet-list {
          list-style: none;
          padding-left: 0;
          margin: 0;
        }

        .bullet-item {
          position: relative;
          padding-left: 20px;
          margin-bottom: 12px;
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }

        .bullet-item::before {
          content: "•";
          position: absolute;
          left: 4px;
          color: #7B61FF;
          font-weight: bold;
        }

        .structure-item {
          margin-bottom: 16px;
        }

        .structure-title {
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .structure-content {
          font-size: 14px;
          color: #4B5563;
          line-height: 1.5;
        }

        .question-item {
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .question-text {
          font-weight: 500;
          color: #111827;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .question-answer {
          font-size: 13px;
          color: #6B7280;
          padding-left: 12px;
          border-left: 2px solid #7B61FF;
        }

        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column;
          }
          .notes-section {
            width: 100%;
            max-height: 40%;
          }
          .controls-row {
            flex-wrap: wrap;
          }
          .volume-control {
            margin-left: 0;
          }
        }
      `}</style>

      <div className="player-header">
        <h3 className="player-title">
          {recording?.title || recording?.courseTitle || 'Видеозапись'}
        </h3>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="main-layout">
        <div className="video-section" ref={videoContainerRef}>
          <div className="video-wrapper">
            <video
              ref={videoRef}
              className="video-element"
              src={videoUrl}
              onClick={handlePlayPause}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              controlsList="nodownload"
            />
          </div>

          <div className="video-controls">
            <div 
              className="progress-bar-container" 
              onClick={handleProgressClick}
              ref={progressBarRef}
            >
              <div className="progress-bar">
                <div className="progress-fill" />
                <div className="progress-handle" />
              </div>
            </div>

            <div className="controls-row">
              <button className="control-button" onClick={handlePlayPause}>
                {isPlaying ? '⏸' : '▶'}
              </button>

              <span className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="volume-control">
                <button className="control-button" onClick={toggleMute}>
                  {isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>

              <button 
                className="control-button fullscreen-button" 
                onClick={toggleFullscreen}
              >
                {isFullscreen ? '⤬' : '⤢'}
              </button>
            </div>
          </div>
        </div>

        <div className="notes-section">
          <div className="notes-header">
            <h4 className="notes-title">Конспект лекции</h4>
            <p className="notes-subtitle">
              {availableSections.length} разделов доступно
            </p>
          </div>

          <div className="notes-content">
            {availableSections.length === 0 ? (
              <div className="notes-empty">
                <p>Конспекты пока не добавлены</p>
                <p style={{ fontSize: '13px' }}>Преподаватель скоро добавит материалы</p>
              </div>
            ) : (
              <>
                {summaryTabs.map(tab => {
                  if (!hasContent(tab.field)) return null;
                  
                  const content = recording[tab.field];
                  const isExpanded = expandedSections[tab.id];
                  
                  return (
                    <div key={tab.id} className="summary-section">
                      <div 
                        className="summary-header"
                        onClick={() => toggleSection(tab.id)}
                      >
                        <span className="summary-label">{tab.label}</span>
                        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                          ▼
                        </span>
                      </div>
                      
                      {isExpanded && (
                        <div className="summary-body">
                          {tab.id === 'timed' && typeof content === 'object' && content.segments ? (
                            <div>
                              {content.segments.map((segment, idx) => (
                                <div key={idx} className="timed-item">
                                  <div 
                                    className="timed-time"
                                    onClick={() => {
                                      if (videoRef.current) {
                                        videoRef.current.currentTime = segment.start;
                                        videoRef.current.play();
                                        setIsPlaying(true);
                                      }
                                    }}
                                  >
                                    {formatTime(segment.start)}
                                  </div>
                                  <div className="timed-text">{segment.text}</div>
                                </div>
                              ))}
                            </div>
                          ) : tab.id === 'timed' && typeof content === 'string' ? (
                            <div className="summary-text">{content}</div>
                          ) : tab.id === 'bulletPoints' ? (
                            <ul className="bullet-list">
                              {content.split('\n').filter(line => line.trim()).map((point, idx) => (
                                <li key={idx} className="bullet-item">{point.replace(/^[-*•]\s*/, '')}</li>
                              ))}
                            </ul>
                          ) : tab.id === 'questions' ? (
                            <div>
                              {content.split('\n').filter(line => line.trim()).map((q, idx) => {
                                const parts = q.split(/[?:]/);
                                if (parts.length > 1) {
                                  return (
                                    <div key={idx} className="question-item">
                                      <div className="question-text">{parts[0]}?</div>
                                      <div className="question-answer">{parts.slice(1).join(':')}</div>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={idx} className="question-item">
                                    <div className="question-text">{q}</div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="summary-text">{content}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentVideoPlayer;