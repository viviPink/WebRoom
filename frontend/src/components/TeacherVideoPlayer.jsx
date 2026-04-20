
import React, { useState, useRef, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.31.119.190:3002';

const TeacherVideoPlayer = ({ recording, onClose, onEdit, onDelete, onUpdateField }) => {
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
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  
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
    if (!content) return false;
    if (typeof content === 'string') return content.trim().length > 0;
    if (typeof content === 'object') {
      if (content.text) return content.text.trim().length > 0;
      if (content.segments) return content.segments.length > 0;
      return Object.keys(content).length > 0;
    }
    return false;
  };

  const getContent = (field) => {
    const content = recording?.[field];
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      if (content.text) return content.text;
      if (content.segments) return content;
    }
    return JSON.stringify(content);
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
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

  const seekToTime = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const startEdit = (fieldId, currentValue) => {
    setEditingField(fieldId);
    setEditValue(typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : currentValue);
  };

  const saveEdit = async () => {
    if (editingField && onUpdateField) {
      let valueToSave = editValue;
      const tab = summaryTabs.find(t => t.id === editingField);
      if (tab && tab.id === 'timed') {
        try {
          const parsed = JSON.parse(editValue);
          valueToSave = parsed;
        } catch (e) {
          console.log('Сохраняем как текст');
        }
      }
      await onUpdateField(recording.id, { [tab.field]: valueToSave });
    }
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const videoUrl = `${API_BASE_URL}${recording?.filePath || recording?.recordingPath}`;

  const renderContent = (tabId, content, isEditing) => {
    if (isEditing) {
      return (
        <div>
          <textarea
            className="edit-textarea"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={15}
          />
          <div className="edit-actions">
            <button className="edit-save" onClick={saveEdit}>Сохранить</button>
            <button className="edit-cancel" onClick={cancelEdit}>Отмена</button>
          </div>
        </div>
      );
    }

    if (tabId === 'timed') {
      if (typeof content === 'object' && content.segments) {
        return (
          <div>
            {content.segments.map((segment, idx) => (
              <div key={idx} className="timed-item">
                <div 
                  className="timed-time"
                  onClick={() => seekToTime(segment.start)}
                >
                  {formatTime(segment.start)}
                </div>
                <div className="timed-text">{segment.text}</div>
              </div>
            ))}
          </div>
        );
      }
      if (typeof content === 'string') {
        return <div className="summary-text">{content}</div>;
      }
      return <div className="summary-text">{JSON.stringify(content)}</div>;
    }
    
    if (tabId === 'bulletPoints') {
      const lines = typeof content === 'string' ? content.split('\n') : [];
      return (
        <ul className="bullet-list">
          {lines.filter(line => line.trim()).map((point, idx) => (
            <li key={idx} className="bullet-item">
              {point.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '')}
            </li>
          ))}
        </ul>
      );
    }
    
    if (tabId === 'questions') {
      const lines = typeof content === 'string' ? content.split('\n') : [];
      return (
        <div>
          {lines.filter(line => line.trim()).map((q, idx) => {
            const questionMatch = q.match(/^([^?]+[?])/);
            if (questionMatch) {
              const question = questionMatch[1];
              const answer = q.substring(question.length).replace(/^[:;,-]\s*/, '');
              return (
                <div key={idx} className="question-item">
                  <div className="question-text">{question}</div>
                  {answer && <div className="question-answer">{answer}</div>}
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
      );
    }
    
    if (tabId === 'structure') {
      const lines = typeof content === 'string' ? content.split('\n') : [];
      let currentTitle = '';
      const items = [];
      
      lines.forEach(line => {
        if (line.match(/^#+\s/)) {
          currentTitle = line.replace(/^#+\s/, '');
          items.push({ title: currentTitle, content: '' });
        } else if (currentTitle && items.length > 0 && line.trim()) {
          items[items.length - 1].content += line + '\n';
        }
      });
      
      if (items.length === 0) {
        return <div className="summary-text">{content}</div>;
      }
      
      return (
        <div>
          {items.map((item, idx) => (
            <div key={idx} className="structure-item">
              <div className="structure-title">{item.title}</div>
              <div className="structure-content">{item.content.trim()}</div>
            </div>
          ))}
        </div>
      );
    }
    
    return <div className="summary-text">{content}</div>;
  };

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
          flex-shrink: 0;
        }

        .player-title {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .edit-recording-btn {
          padding: 8px 16px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-recording-btn:hover {
          background-color: #2563eb;
        }

        .delete-recording-btn {
          padding: 8px 16px;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-recording-btn:hover {
          background-color: #dc2626;
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
          min-height: 0;
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
          flex-shrink: 0;
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
          font-size: 18px;
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
          width: 450px;
          background-color: #fff;
          border-left: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .notes-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background-color: #fafbfc;
          flex-shrink: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notes-title-section {
          flex: 1;
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

        .transcribe-btn {
          padding: 8px 16px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .transcribe-btn:hover {
          background-color: #6750E0;
        }

        .notes-content {
          flex: 1;
          padding: 20px 24px;
          overflow-y: auto;
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

        .summary-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .expand-icon {
          color: #6B7280;
          font-size: 18px;
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .edit-icon {
          color: #6B7280;
          font-size: 14px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .edit-icon:hover {
          background-color: #e5e7eb;
          color: #111827;
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
          display: inline-block;
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
          margin-top: 8px;
        }

        .edit-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-family: monospace;
          resize: vertical;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .edit-save {
          padding: 8px 16px;
          background-color: #10B981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .edit-save:hover {
          background-color: #059669;
        }

        .edit-cancel {
          padding: 8px 16px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
        }

        .edit-cancel:hover {
          background-color: #e5e7eb;
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
          .video-controls {
            padding: 16px;
          }
          .notes-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
        }
      `}</style>

      <div className="player-header">
        <h3 className="player-title">
          {recording?.title || recording?.courseTitle || 'Видеозапись'}
        </h3>
        <div className="header-actions">
          {onEdit && (
            <button className="edit-recording-btn" onClick={() => onEdit(recording)}>
              Редактировать
            </button>
          )}
          {onDelete && (
            <button className="delete-recording-btn" onClick={() => onDelete(recording.id)}>
              Удалить
            </button>
          )}
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
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
            <div className="notes-title-section">
              <h4 className="notes-title">Конспект лекции</h4>
              <p className="notes-subtitle">
                {summaryTabs.filter(tab => hasContent(tab.field)).length} разделов доступно
              </p>
            </div>
          </div>

          <div className="notes-content">
            {summaryTabs.filter(tab => hasContent(tab.field)).length === 0 ? (
              <div className="notes-empty">
                <p>Конспекты пока не добавлены</p>
                <p style={{ fontSize: '13px' }}>Нажмите на иконку редактирования чтобы добавить конспект</p>
              </div>
            ) : (
              <>
                {summaryTabs.map(tab => {
                  const hasContentFlag = hasContent(tab.field);
                  const content = getContent(tab.field);
                  const isExpanded = expandedSections[tab.id];
                  const isEditing = editingField === tab.id;
                  
                  return (
                    <div key={tab.id} className="summary-section">
                      <div 
                        className="summary-header"
                      >
                        <span 
                          className="summary-label"
                          onClick={() => toggleSection(tab.id)}
                          style={{ cursor: 'pointer', flex: 1 }}
                        >
                          {tab.label}
                        </span>
                        <div className="summary-actions">
                          {onUpdateField && (
                            <span 
                              className="edit-icon"
                              onClick={() => startEdit(tab.id, content)}
                              title="Редактировать"
                            >
                              ✎
                            </span>
                          )}
                          <span 
                            className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleSection(tab.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            ▼
                          </span>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="summary-body">
                          {renderContent(tab.id, content, isEditing)}
                          {!isEditing && !hasContentFlag && (
                            <div className="notes-empty" style={{ padding: '20px' }}>
                              <p>Нет содержимого</p>
                              {onUpdateField && (
                                <button 
                                  className="edit-save" 
                                  onClick={() => startEdit(tab.id, '')}
                                  style={{ marginTop: '8px' }}
                                >
                                  Добавить
                                </button>
                              )}
                            </div>
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

export default TeacherVideoPlayer;