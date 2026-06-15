import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const StudentMaterials = ({ studentId, sessionId }) => {
  const [materials, setMaterials] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMaterial, setExpandedMaterial] = useState(null);
  
  const [allMaterials, setAllMaterials] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [viewMode, setViewMode] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const audioRef = useRef(null);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      
      if (sessionId) {
        const response = await fetch(`${API_BASE_URL}/api/materials/session/${sessionId}/with-summaries`);
        if (response.ok) {
          const data = await response.json();
          setMaterials(data.materials || []);
          setSummaries(data.summaries || []);
        }
      }
      
      const allResponse = await fetch(`${API_BASE_URL}/api/materials/student/${studentId}`);
      if (allResponse.ok) {
        const data = await allResponse.json();
        setAllMaterials(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки материалов:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPastSessions = async () => {
    if (!studentId) return;
    
    setLoadingPast(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/${studentId}/past-sessions`);
      const data = await response.json();
      if (data.success) {
        setPastSessions(data.sessions);
      }
    } catch (err) {
      console.error('Ошибка загрузки прошлых занятий:', err);
    } finally {
      setLoadingPast(false);
    }
  };

  const downloadFile = (filePath, originalName) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${filePath}`;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const playRecording = (filePath, type) => {
    const url = `${API_BASE_URL}${filePath}`;
    if (type === 'video' || filePath.match(/\.(mp4|webm|mov)$/i)) {
      window.open(url, '_blank');
    } else {
      const audio = new Audio(url);
      audio.play().catch(err => console.error('Ошибка воспроизведения:', err));
    }
  };

  const playAudioMaterial = (material) => {
    if (playingAudio === material.id) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPlayingAudio(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(`${API_BASE_URL}${material.filePath}`);
    audio.play().catch(err => console.error('Ошибка воспроизведения:', err));
    audio.onended = () => setPlayingAudio(null);
    audioRef.current = audio;
    setPlayingAudio(material.id);
  };

  const openVideoMaterial = (material) => {
    setPlayingVideo(material);
  };

  const getSortedMaterials = (items) => {
    let result = [...(items || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        (m.originalName || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.courseTitle || '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'date_asc': return result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'name_asc': return result.sort((a, b) => (a.originalName || '').localeCompare(b.originalName || ''));
      case 'name_desc': return result.sort((a, b) => (b.originalName || '').localeCompare(a.originalName || ''));
      case 'type': return result.sort((a, b) => (a.fileType || '').localeCompare(b.fileType || ''));
      default: return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Неизвестно';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Дата неизвестна';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return 'PDF';
    if (fileType?.includes('image')) return 'IMG';
    if (fileType?.includes('video')) return 'VID';
    if (fileType?.includes('audio')) return 'AUD';
    if (fileType?.includes('word') || fileType?.includes('document')) return 'DOC';
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return 'XLS';
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return 'PPT';
    return 'FILE';
  };

  const openSessionDetail = (session) => {
    setSelectedSession(session);
    setShowSessionDetail(true);
  };

  const closeSessionDetail = () => {
    setSelectedSession(null);
    setShowSessionDetail(false);
  };

  const filteredMaterials = () => {
    let items = viewMode === 'current' ? materials : allMaterials;
    return getSortedMaterials(items);
  };

  useEffect(() => {
    loadMaterials();
    loadPastSessions();
  }, [studentId, sessionId]);

  return (
    <div className="student-materials">
      <style jsx>{`
        .student-materials {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .materials-header {
          padding: 16px 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .header-title {
          font-weight: 600;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .view-toggle {
          display: flex;
          gap: 8px;
        }
        .view-btn {
          padding: 6px 14px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .view-btn.active {
          background: #7B61FF;
          color: white;
          border-color: #7B61FF;
        }
        .search-input {
          padding: 8px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          font-size: 13px;
          width: 200px;
        }
        .materials-list {
          padding: 16px;
          max-height: 500px;
          overflow-y: auto;
        }
        .material-item {
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
          cursor: pointer;
        }
        .material-item:hover {
          border-color: #7B61FF;
        }
        .material-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
        }
        .material-file {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .material-icon {
          font-size: 20px;
          font-weight: 600;
          min-width: 45px;
          padding: 6px 10px;
          background: #e5e7eb;
          border-radius: 8px;
          text-align: center;
        }
        .material-details {
          flex: 1;
        }
        .material-name {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          word-break: break-word;
        }
        .material-meta {
          font-size: 11px;
          color: #6B7280;
          margin-top: 4px;
        }
        .material-course {
          font-size: 12px;
          color: #7B61FF;
          margin-top: 4px;
        }
        .download-btn {
          padding: 8px 16px;
          background: #dc327e;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .download-btn:hover {
          background: #059669;
        }
        .material-description {
          font-size: 13px;
          color: #6B7280;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }
        .summaries-section {
          margin-top: 16px;
        }
        .summary-item {
          padding: 12px;
          background: white;
          border-radius: 10px;
          margin-bottom: 8px;
        }
        .summary-title {
          font-weight: 600;
          font-size: 13px;
          color: #7B61FF;
          margin-bottom: 6px;
        }
        .summary-content {
          font-size: 13px;
          color: #374151;
          line-height: 1.4;
          max-height: 100px;
          overflow-y: auto;
        }

        .past-sessions-section {
          margin-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .past-sessions-list {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
        }
        .past-session-card {
          padding: 14px;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s;
        }
        .past-session-card:hover {
          border-color: #7B61FF;
          background: #faf9ff;
        }
        .session-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .session-name {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
        }
        .attendance-badge {
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }
        .attendance-badge.attended {
          background: #D1FAE5;
          color: #065F46;
        }
        .attendance-badge.missed {
          background: #FEE2E2;
          color: #DC2626;
        }
        .session-meta {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 8px;
        }
        .session-teacher {
          font-size: 12px;
          color: #7B61FF;
        }
        .session-stats {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 12px;
        }
        .stat {
          display: flex;
          gap: 5px;
        }
        .stat-label {
          color: #9CA3AF;
        }
        .stat-value {
          color: #111827;
          font-weight: 500;
        }
        .comment-preview {
          margin-top: 8px;
          padding: 8px;
          background: #FEF3C7;
          border-radius: 8px;
          font-size: 12px;
          color: #78350F;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6B7280;
        }
        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6B7280;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 20px;
          width: 90%;
          max-width: 700px;
          max-height: 85vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 22px;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          background: white;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }
        .close-modal {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #9CA3AF;
        }
        .close-modal:hover {
          color: #374151;
        }
        .modal-body {
          padding: 20px 22px;
        }
        .detail-section {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-section:last-child {
          border-bottom: none;
        }
        .section-title {
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          margin-bottom: 12px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .detail-label {
          width: 130px;
          color: #9CA3AF;
        }
        .detail-value {
          color: #111827;
        }
        .teacher-comment-box {
          padding: 12px;
          background: #FEF3C7;
          border-radius: 10px;
        }
        .teacher-comment-box p {
          margin: 0;
          color: #78350F;
        }
        .recordings-list, .materials-list-detail {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .recording-item, .material-item-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: #f9fafb;
          border-radius: 10px;
          gap: 10px;
        }
        .recording-info, .material-info-detail {
          flex: 1;
        }
        .recording-title, .material-name-detail {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
        }
        .recording-duration {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 2px;
        }
        .play-btn {
          padding: 6px 14px;
          background: #7B61FF;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .play-btn:hover {
          background: #6750E0;
        }
        .modal-footer {
          padding: 16px 22px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }
        .close-btn {
          padding: 8px 20px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
        }
      `}</style>

      <div className="materials-header">
        <div className="header-title">
          Материалы лекций
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'current' ? 'active' : ''}`}
              onClick={() => setViewMode('current')}
            >
              Текущая лекция
            </button>
            <button
              className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              Все материалы
            </button>
            <button
              className={`view-btn ${viewMode === 'past' ? 'active' : ''}`}
              onClick={() => setViewMode('past')}
            >
              Прошедшие занятия
            </button>
          </div>
        </div>
        {viewMode !== 'past' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Поиск материалов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '20px', fontSize: '13px', background: 'white', cursor: 'pointer' }}
            >
              <option value="date_desc">Сначала новые</option>
              <option value="date_asc">Сначала старые</option>
              <option value="name_asc">По имени А→Я</option>
              <option value="name_desc">По имени Я→А</option>
              <option value="type">По типу</option>
            </select>
          </div>
        )}
      </div>

      {viewMode === 'past' ? (
        loadingPast ? (
          <div className="loading-spinner">Загрузка прошедших занятий...</div>
        ) : pastSessions.length === 0 ? (
          <div className="empty-state">
            <p>Нет прошедших занятий</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Здесь будут отображаться занятия, которые уже прошли
            </p>
          </div>
        ) : (
          <div className="past-sessions-list">
            {pastSessions.map((session) => (
              <div 
                key={session.id} 
                className="past-session-card"
                onClick={() => openSessionDetail(session)}
              >
                <div className="session-title">
                  <span className="session-name">
                    {session.subjectName || session.courseTitle || 'Занятие'}
                  </span>
                  <span className={`attendance-badge ${session.attendanceStatus}`}>
                    {session.attendanceStatus === 'attended' ? 'Посещено' : 'Пропущено'}
                  </span>
                </div>
                <div className="session-meta">
                  {formatDate(session.startTime)} • {session.teacherName}
                </div>
                <div className="session-stats">
                  <span className="stat">
                    <span className="stat-label">Записей:</span>
                    <span className="stat-value">{session.recordings?.length || 0}</span>
                  </span>
                  <span className="stat">
                    <span className="stat-label">Материалов:</span>
                    <span className="stat-value">{session.materials?.length || 0}</span>
                  </span>
                  {session.hasReviewed && (
                    <span className="stat">
                      <span className="stat-label">Ознакомлен</span>
                    </span>
                  )}
                </div>
                {session.comment && (
                  <div className="comment-preview">
                    {session.comment.substring(0, 80)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="loading-spinner">Загрузка материалов...</div>
      ) : filteredMaterials().length === 0 ? (
        <div className="empty-state">
          <p>Нет доступных материалов</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            {viewMode === 'current' 
              ? 'Преподаватель еще не загрузил материалы для этой лекции'
              : 'У вас пока нет доступа к материалам'}
          </p>
        </div>
      ) : (
        <div className="materials-list">
          {filteredMaterials().map(material => (
            <div 
              key={material.id} 
              className="material-item"
              onClick={() => setExpandedMaterial(expandedMaterial === material.id ? null : material.id)}
            >
              <div className="material-info">
                <div className="material-file">
                  <span className="material-icon">{getFileIcon(material.fileType)}</span>
                  <div className="material-details">
                    <div className="material-name">{material.originalName}</div>
                    <div className="material-meta">
                      {formatFileSize(material.fileSize)} • 
                      {new Date(material.createdAt).toLocaleDateString()}
                    </div>
                    {material.courseTitle && (
                      <div className="material-course">
                        Курс: {material.courseTitle}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                  {(material.fileType?.includes('audio') || material.originalName?.match(/\.(mp3|wav|ogg|webm|m4a)$/i)) && (
                    <button
                      className="download-btn"
                      style={{ background: playingAudio === material.id ? '#7B61FF' : '#DBEAFE', color: playingAudio === material.id ? 'white' : '#1E40AF' }}
                      onClick={(e) => { e.stopPropagation(); playAudioMaterial(material); }}
                    >
                      {playingAudio === material.id ? '⏸ Пауза' : '▶ Слушать'}
                    </button>
                  )}
                  {(material.fileType?.includes('video') || material.originalName?.match(/\.(mp4|webm|mov|avi)$/i)) && (
                    <button
                      className="download-btn"
                      style={{ background: '#FEE2E2', color: '#991B1B' }}
                      onClick={(e) => { e.stopPropagation(); openVideoMaterial(material); }}
                    >
                      ▶ Смотреть
                    </button>
                  )}
                  <button
                    className="download-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(material.filePath, material.originalName);
                    }}
                  >
                    Скачать
                  </button>
                </div>
              </div>
              
              {material.description && expandedMaterial === material.id && (
                <div className="material-description">{material.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {summaries.length > 0 && viewMode === 'current' && (
        <div className="summaries-section">
          <div className="materials-header" style={{ borderTop: '1px solid #e5e7eb' }}>
            <span className="header-title">Конспекты лекции</span>
          </div>
          <div className="materials-list">
            {summaries.map(summary => (
              <div key={summary.id} className="summary-item">
                <div className="summary-title">
                  {summary.aiSummary ? 'Краткий конспект' : 
                   summary.aiBulletPoints ? 'Тезисы' :
                   summary.aiStructure ? 'Структура' : 'Конспект'}
                </div>
                <div className="summary-content">
                  {summary.aiSummary || summary.aiBulletPoints || summary.aiStructure || summary.timedTranscription}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSessionDetail && selectedSession && (
        <div className="modal-overlay" onClick={closeSessionDetail}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedSession.subjectName || selectedSession.courseTitle}</h3>
              <button className="close-modal" onClick={closeSessionDetail}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">Дата и время:</span>
                  <span className="detail-value">{formatDate(selectedSession.startTime)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Преподаватель:</span>
                  <span className="detail-value">{selectedSession.teacherName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Группа:</span>
                  <span className="detail-value">{selectedSession.groupName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Статус:</span>
                  <span className={`detail-value ${selectedSession.attendanceStatus}`}>
                    {selectedSession.attendanceStatus === 'attended' ? 'Посещено' : 'Пропущено'}
                  </span>
                </div>
              </div>

              {selectedSession.comment && (
                <div className="detail-section">
                  <div className="section-title">Комментарий преподавателя</div>
                  <div className="teacher-comment-box">
                    <p>{selectedSession.comment}</p>
                  </div>
                </div>
              )}

              {selectedSession.recordings && selectedSession.recordings.length > 0 && (
                <div className="detail-section">
                  <div className="section-title">Записи занятия</div>
                  <div className="recordings-list">
                    {selectedSession.recordings.map((rec) => (
                      <div key={rec.id} className="recording-item">
                        <div className="recording-info">
                          <div className="recording-title">{rec.title || 'Запись'}</div>
                          {rec.duration && (
                            <div className="recording-duration">{formatDuration(rec.duration)}</div>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            const isVideo = rec.type === 'video' || rec.filePath?.match(/\.(mp4|webm|mov)$/i);
                            if (isVideo) {
                              setPlayingVideo({ originalName: rec.title || 'Запись', filePath: rec.filePath });
                            } else {
                              playRecording(rec.filePath, rec.type);
                            }
                          }}
                          className="play-btn"
                        >
                          {rec.type === 'video' ? '▶ Смотреть' : '▶ Слушать'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSession.materials && selectedSession.materials.length > 0 && (
                <div className="detail-section">
                  <div className="section-title">Материалы к занятию</div>
                  <div className="materials-list-detail">
                    {selectedSession.materials.map((mat) => (
                      <div key={mat.id} className="material-item-detail">
                        <div className="material-info-detail">
                          <div className="material-name-detail">
                            {mat.name || mat.originalName || mat.fileName}
                          </div>
                          {mat.size && (
                            <div className="recording-duration">{formatFileSize(mat.size)}</div>
                          )}
                        </div>
                        <button 
                          onClick={() => downloadFile(mat.filePath, mat.name)}
                          className="play-btn"
                        >
                          Скачать
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button onClick={closeSessionDetail} className="close-btn">Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Встроенный видеоплеер */}
      {playingVideo && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setPlayingVideo(null)}
        >
          <div
            style={{ background: '#111827', borderRadius: '16px', overflow: 'hidden', width: '90%', maxWidth: '900px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{playingVideo.originalName || playingVideo.title || 'Видео'}</span>
              <button
                onClick={() => setPlayingVideo(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            </div>
            <video
              src={`${API_BASE_URL}${playingVideo.filePath}`}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '70vh', display: 'block', background: '#000' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMaterials;