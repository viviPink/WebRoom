import React, { useState, useEffect, useMemo } from 'react';
import RecordingCard from '../../../components/common/RecordingCard';
import TeacherVideoPlayer from '../../../components/TeacherVideoPlayer';
import TranscriptionTab from '../../common/TranscriptionTab';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const RecordingsTab = ({ 
  recordings, 
  loading, 
  onLoad, 
  onEdit, 
  onDelete, 
  onTranscribe,
  onEnhanceText,
  onUpdateField,
  teacherId
}) => {
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedRecordingForPlayback, setSelectedRecordingForPlayback] = useState(null);
  const [groupBy, setGroupBy] = useState('day');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showTranscriptionTab, setShowTranscriptionTab] = useState(false);
  const [selectedRecordingForEdit, setSelectedRecordingForEdit] = useState(null);

  useEffect(() => {
    onLoad();
  }, []);

  const handlePlayRecording = (recording) => {
    setSelectedRecordingForPlayback(recording);
  };

  const handleClosePlayer = () => {
    setSelectedRecordingForPlayback(null);
  };

  const handleOpenTranscriptionTab = (recording) => {
    if (!recording || !recording.id || isNaN(Number(recording.id))) {
      console.error('Некорректный ID записи:', recording?.id);
      alert('Ошибка: не удалось определить ID записи');
      return;
    }
    setSelectedRecordingForEdit(recording);
    setShowTranscriptionTab(true);
  };

  const handleCloseTranscriptionTab = () => {
    setShowTranscriptionTab(false);
    setSelectedRecordingForEdit(null);
    onLoad();
  };

  const handleTranscriptionSave = () => {
    onLoad();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return 'PDF';
    if (fileType?.includes('image')) return 'IMG';
    if (fileType?.includes('video')) return 'VID';
    if (fileType?.includes('audio')) return 'AUD';
    if (fileType?.includes('word')) return 'DOC';
    if (fileType?.includes('sheet')) return 'XLS';
    if (fileType?.includes('presentation')) return 'PPT';
    return 'FILE';
  };

  const downloadMaterial = (filePath, originalName) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${filePath}`;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTextContent = (content, filename) => {
    if (!content) return;
    let textContent = typeof content === 'object' 
      ? (content.text || JSON.stringify(content, null, 2))
      : String(content);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadTextAsDoc = (content, filename) => {
    if (!content) return;
    let textContent = typeof content === 'object' 
      ? (content.text || JSON.stringify(content, null, 2))
      : String(content);
    const htmlContent = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 2cm; line-height: 1.5; }
        pre { white-space: pre-wrap; font-family: inherit; }
      </style>
    </head>
    <body>
      <pre>${escapeHtml(textContent)}</pre>
    </body>
    </html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const getMediaTypes = (recording) => {
    const filePath = recording.filePath || '';
    const fileExtension = filePath.match(/\.([^.]+)$/i)?.[1]?.toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mpeg', 'ogv'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
    
    const isVideoFile = videoExtensions.includes(fileExtension);
    const isAudioFile = audioExtensions.includes(fileExtension);
    
    if (recording.type === 'video' || isVideoFile) {
      return { hasVideo: true, hasAudio: true };
    }
    
    if (recording.type === 'audio' || isAudioFile) {
      return { hasVideo: false, hasAudio: true };
    }
    
    return { hasVideo: false, hasAudio: false };
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const filteredRecordings = useMemo(() => {
    let filtered = [...recordings];
    if (filterType !== 'all' && filterType) {
      filtered = filtered.filter(rec => rec.type === filterType);
    }
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      filtered = filtered.filter(rec => (
        (rec.title && rec.title.toLowerCase().includes(searchLower)) ||
        (rec.courseTitle && rec.courseTitle.toLowerCase().includes(searchLower)) ||
        (rec.description && rec.description.toLowerCase().includes(searchLower)) ||
        (rec.teacherName && rec.teacherName.toLowerCase().includes(searchLower))
      ));
    }
    return filtered;
  }, [recordings, filterType, filterText]);

  const groupedRecordings = useMemo(() => {
    const groups = new Map();
    
    filteredRecordings.forEach(rec => {
      let groupKey;
      let groupTitle;
      
      if (groupBy === 'day') {
        const date = new Date(rec.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
          groupKey = 'today';
          groupTitle = 'Сегодня';
        } else if (date.toDateString() === yesterday.toDateString()) {
          groupKey = 'yesterday';
          groupTitle = 'Вчера';
        } else {
          groupKey = date.toISOString().split('T')[0];
          groupTitle = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        }
      } else if (groupBy === 'week') {
        const date = new Date(rec.createdAt);
        const weekNumber = getWeekNumber(date);
        const year = date.getFullYear();
        groupKey = `${year}-W${weekNumber}`;
        
        const weekStart = getStartOfWeek(date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        groupTitle = `${weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else {
        groupKey = rec.courseTitle || rec.subjectName || 'Без предмета';
        groupTitle = rec.courseTitle || rec.subjectName || 'Без предмета';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          title: groupTitle,
          items: []
        });
      }
      groups.get(groupKey).items.push(rec);
    });
    
    const sortedGroups = Array.from(groups.values());
    
    if (groupBy === 'day') {
      sortedGroups.sort((a, b) => {
        if (a.id === 'today') return -1;
        if (b.id === 'today') return 1;
        if (a.id === 'yesterday') return -1;
        if (b.id === 'yesterday') return 1;
        return b.id.localeCompare(a.id);
      });
    } else if (groupBy === 'week') {
      sortedGroups.sort((a, b) => b.id.localeCompare(a.id));
    } else {
      sortedGroups.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return sortedGroups;
  }, [filteredRecordings, groupBy]);

  useEffect(() => {
    if (groupedRecordings.length > 0 && expandedGroups.size === 0) {
      const firstGroupId = groupedRecordings[0]?.id;
      if (firstGroupId) {
        setExpandedGroups(new Set([firstGroupId]));
      }
    }
  }, [groupedRecordings]);

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    const allIds = groupedRecordings.map(g => g.id);
    setExpandedGroups(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const getSummaryText = (recording, type) => {
    if (!recording) return '';
    switch(type) {
      case 'timed': 
        if (recording.timedTranscription !== null && typeof recording.timedTranscription === 'object') {
          return recording.timedTranscription.text || JSON.stringify(recording.timedTranscription);
        }
        return recording.timedTranscription || '';
      case 'summary': return recording.aiSummary || '';
      case 'bulletPoints': return recording.aiBulletPoints || '';
      case 'structure': return recording.aiStructure || '';
      case 'questions': return recording.aiQuestions || '';
      default: return '';
    }
  };

  const hasSummaryContent = (recording, type) => {
    const text = getSummaryText(recording, type);
    return text && text.trim().length > 0;
  };

  return (
    <>
      <div className="section">
        <style jsx>{`
          .section {
            background-color: #fff;
            border-radius: 24px;
            padding: 24px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin: 0 0 8px 0;
          }
          .description {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 24px;
            padding: 12px;
            background-color: #f9fafb;
            border-radius: 12px;
          }
          .filters {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }
          .search-input {
            flex: 1;
            padding: 10px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            font-size: 14px;
          }
          .search-input:focus {
            outline: none;
            border-color: #7B61FF;
            box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
          }
          .type-filter, .group-filter {
            padding: 10px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background-color: white;
            cursor: pointer;
          }
          .refresh-button {
            padding: 10px 20px;
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }
          .refresh-button:hover:not(:disabled) { background-color: #e5e7eb; }
          .group-controls {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e7eb;
          }
          .expand-btn {
            padding: 6px 12px;
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }
          .expand-btn:hover { background-color: #e5e7eb; }
          .group-section { margin-bottom: 24px; }
          .group-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background-color: #f9fafb;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 12px;
          }
          .group-header:hover { background-color: #f3f4f6; }
          .group-icon { font-size: 18px; transition: transform 0.2s; }
          .group-icon.expanded { transform: rotate(90deg); }
          .group-title { font-size: 16px; font-weight: 600; color: #111827; }
          .group-count { font-size: 13px; color: #6B7280; margin-left: 8px; }
          .recordings-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding-left: 28px;
          }
          .empty-state {
            padding: 60px 20px;
            text-align: center;
            background-color: #f9fafb;
            border-radius: 16px;
            color: #6B7280;
          }
          .loading-state { padding: 40px; text-align: center; color: #6B7280; }
          .recording-card {
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s;
          }
          .recording-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .recording-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 12px;
          }
          .recording-title {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
          }
          .badge.audio { background-color: #DBEAFE; color: #1E40AF; }
          .badge.video { background-color: #FEE2E2; color: #991B1B; }
          .recording-detail { font-size: 13px; color: #6B7280; margin-bottom: 6px; }
          
          /* Компактные стили для видео и аудио */
          .compact-video {
            width: 100%;
            max-width: 400px;
            height: auto;
            max-height: 225px;
            border-radius: 8px;
            margin: 12px 0;
            background-color: #000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .compact-audio {
            width: 100%;
            max-width: 400px;
            margin: 12px 0;
          }
          
          .button-group {
            display: flex;
            gap: 10px;
            margin-top: 12px;
            flex-wrap: wrap;
          }
          .btn-play {
            padding: 8px 16px;
            background-color: #7B61FF;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-play:hover { background-color: #6750E0; transform: translateY(-1px); }
          .btn-download {
            padding: 8px 16px;
            background-color: #10B981;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-download:hover { background-color: #059669; }
          .btn-download-small {
            padding: 4px 12px;
            background-color: #10B981;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }
          .btn-download-small:hover { background-color: #059669; }
          .btn-edit {
            padding: 8px 16px;
            background-color: #F59E0B;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-edit:hover { background-color: #D97706; }
          .materials-section {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }
          .materials-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; }
          .materials-list-inline { display: flex; flex-direction: column; gap: 8px; }
          .material-item-inline {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background-color: #e5e7eb;
            border-radius: 10px;
            font-size: 13px;
            flex-wrap: wrap;
          }
          .material-icon-small {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            background: #d1d5db;
            border-radius: 4px;
            min-width: 35px;
            text-align: center;
          }
          .material-name-inline { flex: 1; color: #111827; word-break: break-word; }
          .material-size { font-size: 11px; color: #6B7280; }
          .comment-bubble {
            margin: 10px 0;
            padding: 10px 14px;
            background-color: #FEF3C7;
            border-radius: 10px;
            display: flex;
            gap: 8px;
            align-items: flex-start;
          }
          .comment-icon { font-size: 16px; }
          .comment-label { font-size: 11px; font-weight: 600; color: #92400E; margin-bottom: 3px; }
          .comment-text { font-size: 13px; color: #78350F; white-space: pre-wrap; line-height: 1.5; }
          .summary-buttons {
            display: flex;
            gap: 8px;
            margin: 16px 0 12px;
            flex-wrap: wrap;
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
          }
          .summary-btn {
            padding: 6px 12px;
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            color: #374151;
          }
          .summary-btn:hover { background-color: #e5e7eb; }
          .summary-btn.has-content { background-color: #10B981; color: white; border-color: #10B981; }
          .download-text-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }
          @media (max-width: 768px) {
            .recordings-list { padding-left: 0; }
            .material-item-inline { flex-direction: column; align-items: flex-start; }
            .compact-video { max-width: 100%; }
            .compact-audio { max-width: 100%; }
          }
        `}</style>

        <h3 className="section-title">Записи лекций</h3>
        <div className="description">
          Здесь хранятся все аудио- и видеозаписи проведённых вебинаров.
          Вы можете просматривать записи, просматривать транскрипцию, создавать конспекты с помощью ИИ,
          а также редактировать и удалять записи.
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder="Поиск по названию, предметам или преподавателю..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="search-input"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="type-filter"
          >
            <option value="all">Все типы</option>
            <option value="audio">Аудио</option>
            <option value="video">Видео</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="group-filter"
          >
            <option value="day">Группировка по дням</option>
            <option value="week">Группировка по неделям</option>
            <option value="subject">Группировка по предметам</option>
          </select>
          <button onClick={onLoad} disabled={loading} className="refresh-button">
            {loading ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>

        {groupedRecordings.length > 0 && (
          <div className="group-controls">
            <button onClick={expandAll} className="expand-btn">Развернуть все</button>
            <button onClick={collapseAll} className="expand-btn">Свернуть все</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <p>Загрузка записей...</p>
          </div>
        ) : groupedRecordings.length === 0 ? (
          <div className="empty-state">
            <p>Нет записей лекций</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Записи появятся здесь после завершения вебинаров с включённой записью
            </p>
          </div>
        ) : (
          groupedRecordings.map(group => (
            <div key={group.id} className="group-section">
              <div className="group-header" onClick={() => toggleGroup(group.id)}>
                <span className={`group-icon ${expandedGroups.has(group.id) ? 'expanded' : ''}`}>▶</span>
                <span className="group-title">{group.title}</span>
                <span className="group-count">({group.items.length})</span>
              </div>
              
              {expandedGroups.has(group.id) && (
                <div className="recordings-list">
                  {group.items.map(recording => {
                    const mediaTypes = getMediaTypes(recording);
                    const showVideo = mediaTypes.hasVideo;
                    const showAudio = mediaTypes.hasAudio;
                    const durationFormatted = formatDuration(recording.duration);
                    const availableSummaryTypes = [
                      { id: 'timed', label: 'С таймингами' },
                      { id: 'summary', label: 'Краткий конспект' },
                      { id: 'bulletPoints', label: 'Тезисы' },
                      { id: 'structure', label: 'Структура' },
                      { id: 'questions', label: 'Вопросы' }
                    ].filter(tab => hasSummaryContent(recording, tab.id));
                    
                    return (
                      <div key={recording.id} className="recording-card">
                        <div className="recording-header">
                          <div className="recording-title">
                            {recording.title || recording.courseTitle || 'Запись вебинара'}
                            {showVideo && !showAudio && (
                              <span className="badge video">Видео</span>
                            )}
                            {!showVideo && showAudio && (
                              <span className="badge audio">Аудио</span>
                            )}
                            {showVideo && showAudio && (
                              <>
                                <span className="badge video">Видео</span>
                                <span className="badge audio">Аудио</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="recording-detail">
                          Курс: {recording.courseTitle || 'Неизвестно'}
                        </div>
                        <div className="recording-detail">
                          Преподаватель: {recording.teacherName || 'Неизвестно'}
                        </div>
                        <div className="recording-detail">
                          Дата: {new Date(recording.createdAt).toLocaleDateString()}
                        </div>
                        {durationFormatted && (
                          <div className="recording-detail">
                            Длительность: {durationFormatted}
                          </div>
                        )}
                        
                        {recording.sessionComment && (
                          <div className="comment-bubble">
                            <span className="comment-icon">💬</span>
                            <div>
                              <div className="comment-label">Комментарий преподавателя</div>
                              <div className="comment-text">{recording.sessionComment}</div>
                            </div>
                          </div>
                        )}
                        
                        {showVideo && (
                          <video
                            className="compact-video"
                            controls
                            src={`${API_BASE_URL}${recording.filePath}`}
                          />
                        )}
                        {showAudio && !showVideo && (
                          <audio
                            className="compact-audio"
                            controls
                            src={`${API_BASE_URL}${recording.filePath}`}
                          />
                        )}
                        
                        <div className="button-group">
                          <button 
                            className="btn-play"
                            onClick={() => handlePlayRecording(recording)}
                          >
                            {showVideo ? 'Полноэкранный просмотр' : 'Слушать запись'}
                          </button>
                          <button 
                            className="btn-download"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `${API_BASE_URL}${recording.filePath}`;
                              link.download = recording.title || 'запись';
                              link.click();
                            }}
                          >
                            Скачать запись
                          </button>
                        </div>

                        {availableSummaryTypes.length > 0 && (
                          <div className="summary-buttons">
                            {availableSummaryTypes.map(tab => (
                              <button
                                key={tab.id}
                                className="summary-btn has-content"
                                onClick={() => handleOpenTranscriptionTab(recording)}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {availableSummaryTypes.length > 0 && (
                          <div className="download-text-buttons">
                            <span style={{ fontSize: '12px', color: '#6B7280', alignSelf: 'center' }}>
                              Скачать конспекты:
                            </span>
                            {availableSummaryTypes.map(tab => {
                              const text = getSummaryText(recording, tab.id);
                              if (!text) return null;
                              return (
                                <React.Fragment key={tab.id}>
                                  <button
                                    className="btn-download-small"
                                    onClick={() => downloadTextContent(text, `${recording.title || 'конспект'}_${tab.label}.txt`)}
                                    style={{ backgroundColor: '#6B7280' }}
                                  >
                                    {tab.label} (TXT)
                                  </button>
                                  <button
                                    className="btn-download-small"
                                    onClick={() => downloadTextAsDoc(text, `${recording.title || 'конспект'}_${tab.label}`)}
                                    style={{ backgroundColor: '#6B7280' }}
                                  >
                                    {tab.label} (DOC)
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}

                        {recording.materials && recording.materials.length > 0 && (
                          <div className="materials-section">
                            <div className="materials-title">
                              Материалы к лекции ({recording.materials.length}):
                            </div>
                            <div className="materials-list-inline">
                              {recording.materials.map(material => (
                                <div key={material.id} className="material-item-inline">
                                  <span className="material-icon-small">{getFileIcon(material.fileType)}</span>
                                  <span className="material-name-inline">{material.originalName}</span>
                                  <span className="material-size">{formatFileSize(material.fileSize)}</span>
                                  <button
                                    className="btn-download-small"
                                    onClick={() => downloadMaterial(material.filePath, material.originalName)}
                                  >
                                    Скачать
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div style={{ marginTop: '16px' }}>
                          <button
                            className="btn-edit"
                            onClick={() => handleOpenTranscriptionTab(recording)}
                          >
                            Редактировать конспект
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}

        {selectedRecordingForPlayback && (
          <TeacherVideoPlayer
            recording={selectedRecordingForPlayback}
            onClose={handleClosePlayer}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateField={onUpdateField}
          />
        )}
      </div>

      {showTranscriptionTab && selectedRecordingForEdit && (
        <TranscriptionTab
          recordingId={selectedRecordingForEdit.id}
          teacherId={teacherId}
          onClose={handleCloseTranscriptionTab}
          onSave={handleTranscriptionSave}
        />
      )}
    </>
  );
};

export default RecordingsTab;