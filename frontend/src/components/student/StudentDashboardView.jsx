
import React, { useState, useMemo } from 'react';
import StudentVideoPlayer from '../StudentVideoPlayer';

const StudentDashboardView = ({
  student,
  onLogout,
  onEnterWebinar,
  sessions,
  selectedSession,
  currentSession,
  error,
  loading,
  isJoined,
  recordings,
  loadingRecordings,
  missedSessions,
  loadingMissed,
  downloadRecording,
  openSummaryModal,
  closeSummaryModal,
  selectedRecordingForSummary,
  summaryModalOpen,
  selectedRecordingForPlayback,
  handleClosePlayer,
  setSelectedSession,
  setError,
  handleJoinSession,
  loadSessions,
  loadMissedSessions,
  playRecording
}) => {
  const [activeTab, setActiveTab] = useState('webinars');
  
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryActiveTab, setSummaryActiveTab] = useState('timed');

  const summaryTabs = [
    { id: 'timed', label: 'С таймингами', field: 'timedTranscription' },
    { id: 'summary', label: 'Краткий конспект', field: 'aiSummary' },
    { id: 'bulletPoints', label: 'Тезисы', field: 'aiBulletPoints' },
    { id: 'structure', label: 'Структура', field: 'aiStructure' },
    { id: 'questions', label: 'Вопросы', field: 'aiQuestions' }
  ];

  const getSummaryText = (recording, tabId) => {
    if (!recording) return '';
    switch(tabId) {
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

  const hasSummaryContent = (recording, tabId) => {
    const text = getSummaryText(recording, tabId);
    return text && text.trim().length > 0;
  };

  const filteredAndSortedRecordings = useMemo(() => {
    let filtered = [...recordings];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recording => {
        const titleMatch = (recording.title || '').toLowerCase().includes(query);
        const courseMatch = (recording.courseTitle || '').toLowerCase().includes(query);
        const teacherMatch = (recording.teacherName || '').toLowerCase().includes(query);
        return titleMatch || courseMatch || teacherMatch;
      });
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      switch(sortBy) {
        case 'date':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'name':
          comparison = (a.title || a.courseTitle || '').localeCompare(b.title || b.courseTitle || '');
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        default:
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [recordings, searchQuery, sortBy, sortOrder]);

  const filteredAndSortedMissed = useMemo(() => {
    let filtered = [...(missedSessions || [])];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session => {
        const titleMatch = (session.courseTitle || session.title || '').toLowerCase().includes(query);
        const teacherMatch = (session.teacherName || '').toLowerCase().includes(query);
        return titleMatch || teacherMatch;
      });
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.startTime || a.scheduledStart);
      const dateB = new Date(b.startTime || b.scheduledStart);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return filtered;
  }, [missedSessions, searchQuery, sortOrder]);

  const handleOpenSummaryModal = (recording, defaultTab = 'timed') => {
    setSummaryActiveTab(defaultTab);
    openSummaryModal(recording);
  };

  const handlePlayClick = (recording) => {
    playRecording(recording);
  };

  return (
    <div className="dashboard-container">
      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background-color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 0;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          background-color: #fff;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 16px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title {
          font-size: 24px;
          font-weight: 700;
          color: #000;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-name {
          color: #111827;
          font-size: 14px;
          font-weight: 500;
        }

        .user-group {
          color: #6B7280;
          font-size: 14px;
        }

        .back-button {
          background: none;
          border: none;
          font-size: 16px;
          color: #6B7280;
          cursor: pointer;
          padding: 8px 16px;
          transition: all 0.2s;
          border-radius: 12px;
        }

        .back-button:hover {
          color: #7B61FF;
          background-color: #f3f4f6;
        }

        .tabs-container {
          margin: 24px 40px 0 40px;
          display: flex;
          gap: 8px;
          background-color: #fff;
          padding: 8px;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e5e7eb;
        }

        .tab-button {
          flex: 1;
          padding: 12px 20px;
          border: none;
          background: transparent;
          font-size: 16px;
          font-weight: 500;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: #6B7280;
          position: relative;
        }

        .tab-button.active {
          background-color: #7B61FF;
          color: white;
        }

        .tab-button:not(.active):hover {
          background-color: #f3f4f6;
          color: #111827;
        }

        .missed-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background-color: #EF4444;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 20px;
          min-width: 18px;
          text-align: center;
        }

        .main-content {
          padding: 0 40px 40px 40px;
        }

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
          margin: 0 0 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .controls-group {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input {
          padding: 10px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          width: 250px;
          outline: none;
          transition: all 0.2s;
        }

        .search-input:focus {
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }

        .sort-select {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
        }

        .sort-select:focus {
          border-color: #7B61FF;
        }

        .sort-order-btn {
          padding: 10px 16px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .sort-order-btn:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .refresh-button {
          padding: 10px 16px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .refresh-button:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .session-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .session-card {
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-card:hover {
          border-color: #7B61FF;
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.1);
        }

        .session-card.selected {
          border: 2px solid #7B61FF;
          background-color: #F5F3FF;
        }

        .session-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .session-meta {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 4px;
        }

        .missed-session-card {
          padding: 20px;
          background-color: #FEF3C7;
          border-radius: 16px;
          border: 1px solid #FDE68A;
          margin-bottom: 16px;
          transition: all 0.2s;
        }

        .missed-session-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .missed-session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }

        .missed-session-title {
          font-size: 18px;
          font-weight: 600;
          color: #92400E;
          margin: 0;
        }

        .missed-date {
          font-size: 13px;
          color: #B45309;
          background-color: #FFEDD5;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .missed-info {
          margin-bottom: 16px;
        }

        .missed-subject {
          display: inline-block;
          padding: 4px 12px;
          background-color: #FFEDD5;
          color: #92400E;
          border-radius: 20px;
          font-size: 13px;
          margin-right: 8px;
          margin-bottom: 8px;
        }

        .missed-group {
          display: inline-block;
          padding: 4px 12px;
          background-color: #EFF6FF;
          color: #1E40AF;
          border-radius: 20px;
          font-size: 13px;
        }

        .missed-description {
          margin-top: 12px;
          padding: 12px;
          background-color: white;
          border-radius: 12px;
          font-size: 14px;
          color: #6B7280;
        }

        .btn-primary {
          width: 100%;
          padding: 14px 24px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #6750E0;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(123, 97, 255, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 10px 20px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .btn-play {
          padding: 10px 20px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-play:hover:not(:disabled) {
          background-color: #6750E0;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.2);
        }

        .btn-play:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-download {
          padding: 10px 20px;
          background-color: #10B981;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-download:hover {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }

        .recordings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }

        .recording-card {
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }

        .recording-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .recording-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 12px 0;
        }

        .recording-detail {
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 6px;
        }

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

        .summary-btn:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .summary-btn.has-content {
          background-color: #10B981;
          color: white;
          border-color: #10B981;
        }

        .summary-btn.has-content:hover {
          background-color: #059669;
        }

        .no-summary {
          margin: 16px 0 12px;
          padding: 10px;
          background-color: #FEF3C7;
          border-radius: 12px;
          font-size: 12px;
          color: #92400E;
          text-align: center;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          color: #6B7280;
        }

        .error-message {
          padding: 12px 16px;
          background-color: #FEE2E2;
          color: #DC2626;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6B7280;
        }

        .profile-info {
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .profile-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .profile-row:last-child {
          border-bottom: none;
        }

        .profile-label {
          width: 120px;
          font-weight: 500;
          color: #374151;
        }

        .profile-value {
          color: #111827;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .stat-item {
          text-align: center;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 16px;
        }

        .stat-label {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .stat-value.missed {
          color: #EF4444;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .modal-content {
          background-color: white;
          border-radius: 24px;
          width: 90%;
          max-width: 900px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6B7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background-color: #f3f4f6;
          color: #111827;
        }

        .modal-tabs {
          padding: 12px 24px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .modal-tab-btn {
          padding: 8px 16px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .modal-tab-btn.active {
          background-color: #7B61FF;
          color: white;
          border-color: #7B61FF;
        }

        .modal-tab-btn.has-content {
          background-color: #10B981;
          color: white;
          border-color: #10B981;
        }

        .modal-tab-btn.has-content.active {
          background-color: #7B61FF;
        }

        .modal-tab-btn:hover:not(.active) {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .summary-text {
          font-size: 16px;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
        }

        .summary-empty {
          text-align: center;
          padding: 40px;
          color: #9CA3AF;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .header {
            padding: 16px 20px;
            flex-direction: column;
            text-align: center;
          }
          .tabs-container {
            margin: 16px 20px 0 20px;
            flex-wrap: wrap;
          }
          .tab-button {
            flex: 1;
            min-width: 100px;
            padding: 10px 12px;
            font-size: 14px;
          }
          .main-content {
            padding: 0 20px 20px 20px;
          }
          .section-title {
            flex-direction: column;
            align-items: stretch;
          }
          .controls-group {
            justify-content: stretch;
          }
          .search-input {
            width: 100%;
          }
          .recordings-grid {
            grid-template-columns: 1fr;
          }
          .button-group {
            flex-direction: column;
          }
          .profile-row {
            flex-direction: column;
            gap: 4px;
          }
          .profile-label {
            width: auto;
          }
          .missed-session-header {
            flex-direction: column;
          }
          .modal-content {
            width: 95%;
            max-height: 85vh;
          }
          .modal-body {
            padding: 16px;
          }
          .modal-tabs {
            padding: 12px 16px;
          }
          .summary-buttons {
            justify-content: center;
          }
        }
      `}</style>

      <div className="header">
        <div className="logo-section">
          <span className="title">ВебРум</span>
        </div>
        <div className="user-info">
          <span className="user-name">{student?.full_name}</span>
          <span className="user-group">({student?.group})</span>
        </div>
        <button onClick={onLogout} className="back-button">
          Выйти
        </button>
      </div>

      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('webinars')}
          className={`tab-button ${activeTab === 'webinars' ? 'active' : ''}`}
        >
          Вебинары
        </button>
        <button
          onClick={() => setActiveTab('missed')}
          className={`tab-button ${activeTab === 'missed' ? 'active' : ''}`}
        >
          Пропущенные
          {missedSessions?.length > 0 && (
            <span className="missed-badge">{missedSessions.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('recordings')}
          className={`tab-button ${activeTab === 'recordings' ? 'active' : ''}`}
        >
          Записи
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
        >
          Профиль
        </button>
      </div>

      <div className="main-content">
        {activeTab === 'webinars' && (
          <div className="section">
            <div className="section-title">
              Доступные вебинары
              <button className="refresh-button" onClick={loadSessions} disabled={loading}>
                {loading ? 'Загрузка...' : 'Обновить'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading && <div className="loading-spinner">Загрузка...</div>}

            {!loading && sessions.length === 0 ? (
              <div className="empty-state">
                <p>Нет активных вебинаров</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Проверьте позже, возможно скоро появятся новые вебинары
                </p>
              </div>
            ) : (
              <>
                <div className="session-list">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      className={`session-card ${selectedSession === String(session.id) ? 'selected' : ''}`}
                      onClick={() => setSelectedSession(String(session.id))}
                    >
                      <div className="session-title">
                        {session.courseTitle || 'Вебинар'}
                      </div>
                      <div className="session-meta">
                        Преподаватель: {session.teacherName || 'Неизвестно'}
                      </div>
                      <div className="session-meta">
                        Начало: {new Date(session.startTime).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSession && (
                  <button
                    className="btn-primary"
                    onClick={handleJoinSession}
                    disabled={loading || isJoined}
                  >
                    {loading ? 'Присоединение...' : isJoined ? 'Уже в вебинаре' : 'Присоединиться к вебинару'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'missed' && (
          <div className="section">
            <div className="section-title">
              <span>Пропущенные занятия</span>
              <div className="controls-group">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Поиск по названию или преподавателю..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="sort-order-btn"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? 'Старые сначала' : 'Новые сначала'}
                </button>
                <button
                  className="refresh-button"
                  onClick={loadMissedSessions}
                  disabled={loadingMissed}
                >
                  {loadingMissed ? 'Загрузка...' : 'Обновить'}
                </button>
              </div>
            </div>

            {loadingMissed && <div className="loading-spinner">Загрузка пропущенных занятий...</div>}

            {!loadingMissed && filteredAndSortedMissed.length === 0 ? (
              <div className="empty-state">
                {searchQuery ? (
                  <>
                    <p>Ничего не найдено по запросу "{searchQuery}"</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>
                      Попробуйте изменить поисковый запрос
                    </p>
                  </>
                ) : (
                  <>
                    <p>Отлично Вы не пропустили ни одного занятия</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>
                      Продолжайте в том же духе
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {!searchQuery && missedSessions?.length > 0 && (
                  <div className="empty-state" style={{ marginBottom: '20px', padding: '20px' }}>
                    <p style={{ fontWeight: 'bold', color: '#92400E' }}>
                      У вас есть {missedSessions.length} пропущенных занятий
                    </p>
                    <p style={{ fontSize: '14px' }}>
                      Ознакомьтесь с записями и конспектами, чтобы не отставать от программы
                    </p>
                  </div>
                )}

                {filteredAndSortedMissed.map(session => {
                  const availableTabs = summaryTabs.filter(tab => hasSummaryContent(session, tab.id));
                  
                  return (
                    <div key={session.id} className="missed-session-card">
                      <div className="missed-session-header">
                        <h4 className="missed-session-title">
                          {session.courseTitle || session.title || 'Вебинар'}
                        </h4>
                        <span className="missed-date">
                          {new Date(session.startTime || session.scheduledStart).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="missed-info">
                        {session.subjectName && (
                          <span className="missed-subject">{session.subjectName}</span>
                        )}
                        {session.groupName && (
                          <span className="missed-group">{session.groupName}</span>
                        )}
                      </div>

                      {session.description && (
                        <div className="missed-description">
                          {session.description}
                        </div>
                      )}

                      {availableTabs.length > 0 ? (
                        <div className="summary-buttons">
                          {availableTabs.map(tab => (
                            <button
                              key={tab.id}
                              className="summary-btn has-content"
                              onClick={() => handleOpenSummaryModal(session, tab.id)}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="no-summary">
                          Конспекты пока не добавлены
                        </div>
                      )}

                      <div className="button-group">
                        {session.recordingPath || session.filePath ? (
                          <button
                            className="btn-play"
                            onClick={() => handlePlayClick(session)}
                          >
                            Смотреть запись
                          </button>
                        ) : (
                          <button className="btn-play" disabled>
                            Запись пока недоступна
                          </button>
                        )}
                        {session.recordingPath && (
                          <button
                            className="btn-download"
                            onClick={() => downloadRecording(session.recordingPath, session.courseTitle)}
                          >
                            Скачать
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === 'recordings' && (
          <div className="section">
            <div className="section-title">
              <span>Все записи вебинаров</span>
              <div className="controls-group">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Поиск по названию или преподавателю..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date">Сортировать по дате</option>
                  <option value="name">Сортировать по названию</option>
                  <option value="duration">Сортировать по длительности</option>
                </select>
                <button
                  className="sort-order-btn"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
                </button>
              </div>
            </div>

            {loadingRecordings ? (
              <div className="loading-spinner">Загрузка записей...</div>
            ) : filteredAndSortedRecordings.length === 0 ? (
              <div className="empty-state">
                {searchQuery ? (
                  <>
                    <p>Ничего не найдено по запросу "{searchQuery}"</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>
                      Попробуйте изменить поисковый запрос
                    </p>
                  </>
                ) : (
                  <>
                    <p>Нет доступных записей</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>
                      После завершения вебинаров здесь появятся записи
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="recordings-grid">
                  {filteredAndSortedRecordings.map(recording => {
                    const availableTabs = summaryTabs.filter(tab => hasSummaryContent(recording, tab.id));
                    
                    return (
                      <div key={recording.id} className="recording-card">
                        <div className="recording-title">
                          {recording.title || 'Запись вебинара'}
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
                        {recording.duration && (
                          <div className="recording-detail">
                            Длительность: {Math.floor(recording.duration / 60)}:{String(recording.duration % 60).padStart(2, '0')}
                          </div>
                        )}

                        {availableTabs.length > 0 ? (
                          <div className="summary-buttons">
                            {availableTabs.map(tab => (
                              <button
                                key={tab.id}
                                className="summary-btn has-content"
                                onClick={() => handleOpenSummaryModal(recording, tab.id)}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="no-summary">
                            Конспекты пока не добавлены
                          </div>
                        )}

                        <div className="button-group">
                          <button
                            className="btn-play"
                            onClick={() => handlePlayClick(recording)}
                          >
                            Смотреть запись
                          </button>
                          <button
                            className="btn-download"
                            onClick={() => downloadRecording(recording.filePath, recording.title)}
                          >
                            Скачать
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {filteredAndSortedRecordings.length > 0 && (
                  <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
                    Найдено записей: {filteredAndSortedRecordings.length}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="section">
            <div className="section-title">Информация о студенте</div>
            
            <div className="profile-info">
              <div className="profile-row">
                <span className="profile-label">ID:</span>
                <span className="profile-value">{student?.id}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">Имя:</span>
                <span className="profile-value">{student?.full_name}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">Группа:</span>
                <span className="profile-value">{student?.group}</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Посещено вебинаров</div>
                <div className="stat-value">
                  {recordings.filter(r => r.sessionId && !missedSessions?.some(m => m.id === r.sessionId)).length}
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Пропущено</div>
                <div className="stat-value missed">{missedSessions?.length || 0}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Всего записей</div>
                <div className="stat-value">{recordings.length}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">С конспектами</div>
                <div className="stat-value">
                  {recordings.filter(r => 
                    r.timedTranscription || r.aiSummary || r.aiBulletPoints || r.aiStructure || r.aiQuestions
                  ).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {summaryModalOpen && selectedRecordingForSummary && (
        <div className="modal-overlay" onClick={closeSummaryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Конспект: {selectedRecordingForSummary.title || selectedRecordingForSummary.courseTitle || 'Вебинар'}</h3>
              <button className="modal-close" onClick={closeSummaryModal}>×</button>
            </div>
            
            <div className="modal-tabs">
              {summaryTabs.map(tab => {
                const hasContent = hasSummaryContent(selectedRecordingForSummary, tab.id);
                if (!hasContent) return null;
                return (
                  <button
                    key={tab.id}
                    className={`modal-tab-btn ${summaryActiveTab === tab.id ? 'active' : ''} has-content`}
                    onClick={() => setSummaryActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            
            <div className="modal-body">
              {(() => {
                const currentText = getSummaryText(selectedRecordingForSummary, summaryActiveTab);
                if (currentText && currentText.trim()) {
                  return <div className="summary-text">{currentText}</div>;
                }
                return (
                  <div className="summary-empty">
                    <p>Конспект пока не готов</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>
                      Преподаватель скоро добавит конспект в этот раздел
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              {selectedRecordingForSummary.filePath && (
                <button
                  className="btn-download"
                  onClick={() => downloadRecording(selectedRecordingForSummary.filePath, selectedRecordingForSummary.title)}
                >
                  Скачать запись
                </button>
              )}
              <button className="btn-secondary" onClick={closeSummaryModal}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {selectedRecordingForPlayback && (
        <StudentVideoPlayer
          recording={selectedRecordingForPlayback}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
};

export default StudentDashboardView;