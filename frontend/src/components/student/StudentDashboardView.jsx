import React, { useState, useMemo } from 'react';
import StudentVideoPlayer from '../StudentVideoPlayer';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

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
  downloadMaterial,
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
  scheduledSessions,
  loadingScheduled,
  loadScheduledSessions,
  playRecording,
  onMarkAsReviewed,
  onUnmarkAsReviewed,
  reviewingSessionId
}) => {
  const [activeTab, setActiveTab] = useState('webinars');
  
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [groupBy, setGroupBy] = useState('day');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [summaryActiveTab, setSummaryActiveTab] = useState('timed');

  const summaryTabs = [
    { id: 'timed', label: 'С таймингами', field: 'timedTranscription' },
    { id: 'summary', label: 'Краткий конспект', field: 'aiSummary' },
    { id: 'bulletPoints', label: 'Тезисы', field: 'aiBulletPoints' },
    { id: 'structure', label: 'Структура', field: 'aiStructure' },
    { id: 'questions', label: 'Вопросы', field: 'aiQuestions' }
  ];

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
    const filePath = recording.filePath || recording.recordingPath || '';
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
    if (filterType !== 'all') filtered = filtered.filter(r => r.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.courseTitle || '').toLowerCase().includes(q) ||
        (r.teacherName || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [recordings, filterType, searchQuery]);

  const groupedRecordings = useMemo(() => {
    const groups = new Map();
    filteredRecordings.forEach(rec => {
      let groupKey, groupTitle;
      if (groupBy === 'day') {
        const date = new Date(rec.createdAt);
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) { groupKey = 'today'; groupTitle = 'Сегодня'; }
        else if (date.toDateString() === yesterday.toDateString()) { groupKey = 'yesterday'; groupTitle = 'Вчера'; }
        else { groupKey = date.toISOString().split('T')[0]; groupTitle = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); }
      } else if (groupBy === 'week') {
        const date = new Date(rec.createdAt);
        const wn = getWeekNumber(date); const yr = date.getFullYear();
        groupKey = `${yr}-W${wn}`;
        const ws = getStartOfWeek(date); const we = new Date(ws); we.setDate(we.getDate() + 6);
        groupTitle = `${ws.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else {
        groupKey = rec.courseTitle || rec.subjectName || 'Без предмета';
        groupTitle = groupKey;
      }
      if (!groups.has(groupKey)) groups.set(groupKey, { id: groupKey, title: groupTitle, items: [] });
      groups.get(groupKey).items.push(rec);
    });
    const sorted = Array.from(groups.values());
    if (groupBy === 'day') {
      sorted.sort((a, b) => {
        if (a.id === 'today') return -1; if (b.id === 'today') return 1;
        if (a.id === 'yesterday') return -1; if (b.id === 'yesterday') return 1;
        return b.id.localeCompare(a.id);
      });
    } else if (groupBy === 'week') {
      sorted.sort((a, b) => b.id.localeCompare(a.id));
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [filteredRecordings, groupBy]);

  const toggleGroup = (id) => {
    const next = new Set(expandedGroups);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedGroups(next);
  };

  const expandAllGroups = () => setExpandedGroups(new Set(groupedRecordings.map(g => g.id)));
  const collapseAllGroups = () => setExpandedGroups(new Set());

  useMemo(() => {
    if (groupedRecordings.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([groupedRecordings[0].id]));
    }
  }, [groupedRecordings]);

  const handleOpenSummaryModal = (recording, defaultTab = 'timed') => {
    setSummaryActiveTab(defaultTab);
    openSummaryModal(recording);
  };

  const handlePlayClick = (recording) => {
    playRecording(recording);
  };

  const handleSessionClick = (sessionId) => {
    setSelectedSession(String(sessionId));
    handleJoinSession();
  };

  const unreviewedCount = missedSessions?.filter(s => !s.hasReviewed).length || 0;

  const now = new Date();
  const todayStr = now.toDateString();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const scheduledToday = (scheduledSessions || []).filter(s => {
    const d = new Date(s.scheduledStart);
    return d.toDateString() === todayStr;
  });
  const scheduledThisWeek = (scheduledSessions || []).filter(s => {
    const d = new Date(s.scheduledStart);
    return d >= startOfWeek && d < endOfWeek;
  });

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [calMonth]);

  const scheduledDates = useMemo(() => {
    const set = new Set();
    (scheduledSessions || []).forEach(s => {
      const d = new Date(s.scheduledStart);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [scheduledSessions]);

  const activeDates = useMemo(() => {
    const set = new Set();
    (sessions || []).forEach(s => {
      const d = new Date(s.startTime);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [sessions]);

  // Стили для компактных медиа-плееров
  const compactVideoStyle = {
    width: '100%',
    maxWidth: '400px',
    height: 'auto',
    maxHeight: '225px',
    borderRadius: '8px',
    margin: '10px auto',
    display: 'block',
    backgroundColor: '#000',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  const compactAudioStyle = {
    width: '100%',
    maxWidth: '400px',
    margin: '10px auto',
    display: 'block'
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

        .logo {
          width: 48px;
          height: 48px;
          background-color: #7B61FF;
          border-radius: 12px;
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
          transition: all 0.2s;
        }

        .session-card:hover {
          border-color: #7B61FF;
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.1);
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

        .btn-enter {
          margin-top: 12px;
          padding: 10px 20px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .btn-enter:hover:not(:disabled) {
          background-color: #6750E0;
          transform: translateY(-1px);
        }

        .btn-enter:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .missed-session-card {
          padding: 20px;
          background-color: #FFF5F5;
          border-radius: 16px;
          border: 1px solid #FEE2E2;
          margin-bottom: 16px;
          transition: all 0.2s;
        }

        .missed-session-card.reviewed {
          background-color: #F0FDF4;
          border-color: #D1FAE5;
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
          color: #991B1B;
          margin: 0;
        }

        .missed-session-card.reviewed .missed-session-title {
          color: #065F46;
        }

        .reviewed-badge {
          display: inline-block;
          margin-left: 12px;
          padding: 2px 10px;
          background-color: #10B981;
          color: white;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .missed-date {
          font-size: 13px;
          color: #991B1B;
          background-color: #FEE2E2;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .missed-session-card.reviewed .missed-date {
          color: #065F46;
          background-color: #D1FAE5;
        }

        .missed-info {
          margin-bottom: 16px;
        }

        .missed-subject {
          display: inline-block;
          padding: 4px 12px;
          background-color: #FEE2E2;
          color: #991B1B;
          border-radius: 20px;
          font-size: 13px;
          margin-right: 8px;
          margin-bottom: 8px;
        }

        .missed-session-card.reviewed .missed-subject {
          background-color: #D1FAE5;
          color: #065F46;
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

        .btn-download-small:hover {
          background-color: #059669;
        }

        .btn-review {
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

        .btn-review:hover:not(:disabled) {
          background-color: #059669;
          transform: translateY(-1px);
        }

        .btn-review:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .btn-unreview {
          padding: 10px 20px;
          background-color: #F59E0B;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-unreview:hover:not(:disabled) {
          background-color: #D97706;
          transform: translateY(-1px);
        }

        .btn-unreview:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .reviewed-info {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
          font-size: 12px;
          color: #6B7280;
          text-align: right;
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

        .materials-section {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .materials-title {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 10px;
        }

        .materials-list-inline {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

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

        .material-name-inline {
          flex: 1;
          color: #111827;
          word-break: break-word;
        }

        .material-size {
          font-size: 11px;
          color: #6B7280;
        }

        .comment-bubble {
          margin: 10px 0;
          padding: 10px 14px;
          background-color: #FEF3C7;
          border-radius: 10px;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .comment-icon {
          font-size: 16px;
        }

        .comment-label {
          font-size: 11px;
          font-weight: 600;
          color: #92400E;
          margin-bottom: 3px;
        }

        .comment-text {
          font-size: 13px;
          color: #78350F;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .download-text-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .group-section {
          margin-bottom: 24px;
        }

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
          border: 1px solid #e5e7eb;
        }

        .group-header:hover {
          background-color: #f3f4f6;
        }

        .group-icon {
          font-size: 16px;
          transition: transform 0.2s;
          display: inline-block;
        }

        .group-icon.expanded {
          transform: rotate(90deg);
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
          flex-wrap: wrap;
        }

        .stats-mini {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-mini-card {
          text-align: center;
          padding: 16px;
          background: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .stat-mini-value {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
        }

        .stat-mini-label {
          font-size: 13px;
          color: #6B7280;
          margin-top: 4px;
        }

        /* Компактные стили для видео и аудио */
        .compact-video {
          width: 100%;
          max-width: 400px;
          height: auto;
          max-height: 225px;
          border-radius: 8px;
          margin: 10px auto;
          display: block;
          background-color: #000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .compact-audio {
          width: 100%;
          max-width: 400px;
          margin: 10px auto;
          display: block;
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
          .material-item-inline {
            flex-direction: column;
            align-items: flex-start;
          }
          .recordings-list {
            padding-left: 0;
          }
          .compact-video {
            max-width: 100%;
          }
          .compact-audio {
            max-width: 100%;
          }
        }
      `}</style>

      <div className="header">
        <div className="logo-section">
          <div className="logo"></div>
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
          {unreviewedCount > 0 && (
            <span className="missed-badge">{unreviewedCount}</span>
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
            <div className="stats-mini">
              <div className="stat-mini-card">
                <div className="stat-mini-value">{sessions.length}</div>
                <div className="stat-mini-label">Активных сейчас</div>
              </div>
              <div className="stat-mini-card">
                <div className="stat-mini-value">{scheduledToday.length}</div>
                <div className="stat-mini-label">Сегодня запланировано</div>
              </div>
              <div className="stat-mini-card">
                <div className="stat-mini-value">{scheduledThisWeek.length}</div>
                <div className="stat-mini-label">На этой неделе</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>Активные вебинары</h3>
                    <button className="refresh-button" onClick={loadSessions} disabled={loading} style={{ fontSize: '13px', padding: '6px 14px' }}>
                      {loading ? 'Загрузка...' : 'Обновить'}
                    </button>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  {loading ? (
                    <div className="loading-spinner">Загрузка...</div>
                  ) : sessions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '12px', color: '#6B7280', fontSize: '14px' }}>
                      Нет активных вебинаров
                    </div>
                  ) : (
                    <div className="session-list">
                      {sessions.map(session => (
                        <div key={session.id} className="session-card">
                          <div className="session-title">{session.courseTitle || 'Вебинар'}</div>
                          <div className="session-meta">Преподаватель: {session.teacherName || 'Неизвестно'}</div>
                          <div className="session-meta">Начало: {new Date(session.startTime).toLocaleString('ru-RU')}</div>
                          <button
                            onClick={() => handleSessionClick(session.id)}
                            className="btn-enter"
                            disabled={loading && selectedSession === String(session.id)}
                          >
                            {loading && selectedSession === String(session.id) ? 'Подключение...' : 'Войти'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>Предстоящие занятия</h3>
                    <button className="refresh-button" onClick={loadScheduledSessions} disabled={loadingScheduled} style={{ fontSize: '13px', padding: '6px 14px' }}>
                      {loadingScheduled ? 'Загрузка...' : 'Обновить'}
                    </button>
                  </div>

                  {loadingScheduled ? (
                    <div className="loading-spinner">Загрузка...</div>
                  ) : (scheduledSessions || []).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '12px', color: '#6B7280', fontSize: '14px' }}>
                      Нет запланированных занятий
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(scheduledSessions || []).map(session => {
                        const dt = new Date(session.scheduledStart);
                        const isToday = dt.toDateString() === todayStr;
                        return (
                          <div key={session.id} style={{ padding: '14px 16px', background: isToday ? '#F5F3FF' : '#f9fafb', borderRadius: '12px', border: `1px solid ${isToday ? '#7B61FF' : '#e5e7eb'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                              <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                                {session.title || session.courseTitle || 'Занятие'}
                              </div>
                              {isToday && (
                                <span style={{ padding: '2px 8px', background: '#7B61FF', color: 'white', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>Сегодня</span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                              {dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в {dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6B7280' }}>
                              {session.courseTitle} · {session.teacherName}
                              {session.duration && ` · ${session.duration} мин`}
                            </div>
                            {session.description && (
                              <div style={{ fontSize: '12px', color: '#374151', marginTop: '6px', padding: '6px 8px', background: 'white', borderRadius: '6px' }}>{session.description}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '16px', position: 'sticky', top: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <button
                    onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6B7280', padding: '4px 8px', borderRadius: '6px' }}
                  >‹</button>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                    {calMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6B7280', padding: '4px 8px', borderRadius: '6px' }}
                  >›</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                  {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#9CA3AF', padding: '4px 0' }}>{d}</div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {calDays.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                    const isToday = day.toDateString() === todayStr;
                    const hasScheduled = scheduledDates.has(key);
                    const hasActive = activeDates.has(key);
                    return (
                      <div
                        key={key}
                        style={{
                          textAlign: 'center',
                          padding: '5px 2px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: isToday ? '700' : '400',
                          background: isToday ? '#7B61FF' : 'transparent',
                          color: isToday ? 'white' : '#111827',
                          position: 'relative',
                          cursor: hasScheduled || hasActive ? 'pointer' : 'default',
                        }}
                        title={hasScheduled ? 'Запланировано занятие' : hasActive ? 'Активный вебинар' : ''}
                      >
                        {day.getDate()}
                        {(hasScheduled || hasActive) && (
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: isToday ? 'white' : hasActive ? '#10B981' : '#7B61FF',
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6B7280' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                    Активный вебинар
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6B7280' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7B61FF' }} />
                    Запланировано
                  </div>
                </div>
              </div>
            </div>
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
                    <p>Отлично! Вы не пропустили ни одного занятия</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>
                      Продолжайте в том же духе
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {filteredAndSortedMissed.filter(s => !s.hasReviewed).length > 0 && (
                  <>
                    {filteredAndSortedMissed
                      .filter(session => !session.hasReviewed)
                      .map(session => {
                        const availableTabs = summaryTabs.filter(tab => hasSummaryContent(session, tab.id));
                        const isReviewing = reviewingSessionId === session.id;
                        const mediaTypes = getMediaTypes(session);
                        const showVideo = mediaTypes.hasVideo;
                        const showAudio = mediaTypes.hasAudio;
                        const durationFormatted = session.duration && !isNaN(session.duration) 
                          ? `${Math.floor(session.duration / 60)}:${String(session.duration % 60).padStart(2, '0')}` 
                          : '';
                        
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
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
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

                            {session.sessionComment && (
                              <div className="comment-bubble">
                                <span className="comment-icon">💬</span>
                                <div>
                                  <div className="comment-label">Комментарий преподавателя</div>
                                  <div className="comment-text">{session.sessionComment}</div>
                                </div>
                              </div>
                            )}

                            {(session.filePath || session.recordingPath) && (
                              <>
                                {showVideo && (
                                  <video
                                    controls
                                    src={`${API_BASE_URL}${session.filePath || session.recordingPath}`}
                                    className="compact-video"
                                  />
                                )}
                                {showAudio && !showVideo && (
                                  <audio
                                    controls
                                    src={`${API_BASE_URL}${session.filePath || session.recordingPath}`}
                                    className="compact-audio"
                                  />
                                )}
                              </>
                            )}

                            {durationFormatted && (
                              <div className="recording-detail">
                                Длительность: {durationFormatted}
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

                            {availableTabs.length > 0 && (
                              <div className="download-text-buttons">
                                <span style={{ fontSize: '12px', color: '#6B7280', alignSelf: 'center' }}>
                                  Скачать конспекты:
                                </span>
                                {availableTabs.map(tab => {
                                  const text = getSummaryText(session, tab.id);
                                  if (!text) return null;
                                  return (
                                    <React.Fragment key={tab.id}>
                                      <button
                                        className="btn-download-small"
                                        onClick={() => downloadTextContent(text, `${session.courseTitle || 'конспект'}_${tab.label}.txt`)}
                                        style={{ backgroundColor: '#6B7280' }}
                                      >
                                        {tab.label} (TXT)
                                      </button>
                                      <button
                                        className="btn-download-small"
                                        onClick={() => downloadTextAsDoc(text, `${session.courseTitle || 'конспект'}_${tab.label}`)}
                                        style={{ backgroundColor: '#6B7280' }}
                                      >
                                        {tab.label} (DOC)
                                      </button>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}

                            {session.materials && session.materials.length > 0 && (
                              <div className="materials-section">
                                <div className="materials-title">Материалы к лекции ({session.materials.length}):</div>
                                <div className="materials-list-inline">
                                  {session.materials.map(material => (
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

                            <div className="button-group">
                              {(session.filePath || session.recordingPath) ? (
                                <button
                                  className="btn-play"
                                  onClick={() => handlePlayClick(session)}
                                >
                                  {showVideo ? 'Смотреть запись' : 'Слушать запись'}
                                </button>
                              ) : (
                                <button className="btn-play" disabled>
                                  Запись пока недоступна
                                </button>
                              )}
                              {(session.filePath || session.recordingPath) && (
                                <button
                                  className="btn-download"
                                  onClick={() => downloadRecording(session.filePath || session.recordingPath, session.courseTitle)}
                                >
                                  Скачать запись
                                </button>
                              )}
                              <button
                                className="btn-review"
                                onClick={() => onMarkAsReviewed(session)}
                                disabled={isReviewing}
                              >
                                {isReviewing ? '...' : 'Отметить как изученное'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}

                {filteredAndSortedMissed.filter(s => s.hasReviewed).length > 0 && (
                  <>
                    {filteredAndSortedMissed
                      .filter(session => session.hasReviewed)
                      .map(session => {
                        const availableTabs = summaryTabs.filter(tab => hasSummaryContent(session, tab.id));
                        const isReviewing = reviewingSessionId === session.id;
                        const mediaTypes = getMediaTypes(session);
                        const showVideo = mediaTypes.hasVideo;
                        const showAudio = mediaTypes.hasAudio;
                        const durationFormatted = session.duration && !isNaN(session.duration) 
                          ? `${Math.floor(session.duration / 60)}:${String(session.duration % 60).padStart(2, '0')}` 
                          : '';
                        
                        return (
                          <div key={session.id} className="missed-session-card reviewed">
                            <div className="missed-session-header">
                              <h4 className="missed-session-title">
                                {session.courseTitle || session.title || 'Вебинар'}
                                <span className="reviewed-badge">Ознакомлен</span>
                              </h4>
                              <span className="missed-date">
                                {new Date(session.startTime || session.scheduledStart).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
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

                            {session.sessionComment && (
                              <div className="comment-bubble">
                                <span className="comment-icon">💬</span>
                                <div>
                                  <div className="comment-label">Комментарий преподавателя</div>
                                  <div className="comment-text">{session.sessionComment}</div>
                                </div>
                              </div>
                            )}

                            {(session.filePath || session.recordingPath) && (
                              <>
                                {showVideo && (
                                  <video
                                    controls
                                    src={`${API_BASE_URL}${session.filePath || session.recordingPath}`}
                                    className="compact-video"
                                  />
                                )}
                                {showAudio && !showVideo && (
                                  <audio
                                    controls
                                    src={`${API_BASE_URL}${session.filePath || session.recordingPath}`}
                                    className="compact-audio"
                                  />
                                )}
                              </>
                            )}

                            {durationFormatted && (
                              <div className="recording-detail">
                                Длительность: {durationFormatted}
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

                            {availableTabs.length > 0 && (
                              <div className="download-text-buttons">
                                <span style={{ fontSize: '12px', color: '#6B7280', alignSelf: 'center' }}>
                                  Скачать конспекты:
                                </span>
                                {availableTabs.map(tab => {
                                  const text = getSummaryText(session, tab.id);
                                  if (!text) return null;
                                  return (
                                    <React.Fragment key={tab.id}>
                                      <button
                                        className="btn-download-small"
                                        onClick={() => downloadTextContent(text, `${session.courseTitle || 'конспект'}_${tab.label}.txt`)}
                                        style={{ backgroundColor: '#6B7280' }}
                                      >
                                        {tab.label} (TXT)
                                      </button>
                                      <button
                                        className="btn-download-small"
                                        onClick={() => downloadTextAsDoc(text, `${session.courseTitle || 'конспект'}_${tab.label}`)}
                                        style={{ backgroundColor: '#6B7280' }}
                                      >
                                        {tab.label} (DOC)
                                      </button>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}

                            {session.materials && session.materials.length > 0 && (
                              <div className="materials-section">
                                <div className="materials-title">Материалы к лекции ({session.materials.length}):</div>
                                <div className="materials-list-inline">
                                  {session.materials.map(material => (
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

                            <div className="button-group">
                              {(session.filePath || session.recordingPath) ? (
                                <button
                                  className="btn-play"
                                  onClick={() => handlePlayClick(session)}
                                >
                                  {showVideo ? 'Смотреть запись' : 'Слушать запись'}
                                </button>
                              ) : (
                                <button className="btn-play" disabled>
                                  Запись пока недоступна
                                </button>
                              )}
                              {(session.filePath || session.recordingPath) && (
                                <button
                                  className="btn-download"
                                  onClick={() => downloadRecording(session.filePath || session.recordingPath, session.courseTitle)}
                                >
                                  Скачать запись
                                </button>
                              )}
                              <button
                                className="btn-unreview"
                                onClick={() => onUnmarkAsReviewed(session)}
                                disabled={isReviewing}
                              >
                                {isReviewing ? '...' : 'Снять отметку'}
                              </button>
                            </div>

                            {session.reviewedAt && (
                              <div className="reviewed-info">
                                Изучено: {new Date(session.reviewedAt).toLocaleDateString('ru-RU')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'recordings' && (
          <div className="section">
            <div className="section-title">
              <span>Записи вебинаров</span>
              <div className="controls-group">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Поиск по названию, курсу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select className="sort-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">Все типы</option>
                  <option value="audio">Аудио</option>
                  <option value="video">Видео</option>
                </select>
                <select className="sort-select" value={groupBy} onChange={(e) => { setGroupBy(e.target.value); setExpandedGroups(new Set()); }}>
                  <option value="day">По дням</option>
                  <option value="week">По неделям</option>
                  <option value="subject">По предметам</option>
                </select>
                <button className="refresh-button" onClick={expandAllGroups}>Развернуть все</button>
                <button className="refresh-button" onClick={collapseAllGroups}>Свернуть все</button>
              </div>
            </div>

            {loadingRecordings ? (
              <div className="loading-spinner">Загрузка записей...</div>
            ) : groupedRecordings.length === 0 ? (
              <div className="empty-state">
                {searchQuery || filterType !== 'all' ? (
                  <p>Ничего не найдено</p>
                ) : (
                  <>
                    <p>Нет доступных записей</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>После завершения вебинаров здесь появятся записи</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                {groupedRecordings.map(group => (
                  <div key={group.id} className="group-section">
                    <div className="group-header" onClick={() => toggleGroup(group.id)}>
                      <span className={`group-icon ${expandedGroups.has(group.id) ? 'expanded' : ''}`}>▶</span>
                      <span className="group-title">{group.title}</span>
                      <span className="group-count">({group.items.length})</span>
                    </div>

                    {expandedGroups.has(group.id) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '28px' }}>
                        {group.items.map(recording => {
                          const mediaTypes = getMediaTypes(recording);
                          const showVideo = mediaTypes.hasVideo;
                          const showAudio = mediaTypes.hasAudio;
                          const durationFormatted = recording.duration && !isNaN(recording.duration) 
                            ? `${Math.floor(recording.duration / 60)}:${String(recording.duration % 60).padStart(2, '0')}` 
                            : '';
                          const availableTabs = summaryTabs.filter(tab => hasSummaryContent(recording, tab.id));
                          
                          return (
                            <div key={recording.id} className="recording-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                <div>
                                  <div className="recording-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    {recording.title || recording.courseTitle || 'Запись вебинара'}
                                    {showVideo && !showAudio && (
                                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', background: '#FEE2E2', color: '#991B1B' }}>Видео</span>
                                    )}
                                    {!showVideo && showAudio && (
                                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', background: '#DBEAFE', color: '#1E40AF' }}>Аудио</span>
                                    )}
                                    {showVideo && showAudio && (
                                      <>
                                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', background: '#FEE2E2', color: '#991B1B' }}>Видео</span>
                                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', background: '#DBEAFE', color: '#1E40AF' }}>Аудио</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="recording-detail">Курс: {recording.courseTitle || 'Неизвестно'}</div>
                                  <div className="recording-detail">Преподаватель: {recording.teacherName || 'Неизвестно'}</div>
                                  <div className="recording-detail">
                                    {new Date(recording.createdAt).toLocaleString('ru-RU')}
                                    {durationFormatted && ` · ${durationFormatted}`}
                                  </div>
                                </div>
                              </div>

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
                                  controls
                                  src={`${API_BASE_URL}${recording.filePath}`}
                                  className="compact-video"
                                />
                              )}
                              {showAudio && !showVideo && (
                                <audio
                                  controls
                                  src={`${API_BASE_URL}${recording.filePath}`}
                                  className="compact-audio"
                                />
                              )}

                              {availableTabs.length > 0 ? (
                                <div className="summary-buttons">
                                  {availableTabs.map(tab => (
                                    <button key={tab.id} className="summary-btn has-content" onClick={() => handleOpenSummaryModal(recording, tab.id)}>
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="no-summary">Конспекты пока не добавлены</div>
                              )}

                              {availableTabs.length > 0 && (
                                <div className="download-text-buttons">
                                  <span style={{ fontSize: '12px', color: '#6B7280', alignSelf: 'center' }}>
                                    Скачать конспекты:
                                  </span>
                                  {availableTabs.map(tab => {
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

                              <div className="button-group">
                                <button className="btn-play" onClick={() => handlePlayClick(recording)}>
                                  {showVideo ? 'Полноэкранный просмотр' : 'Слушать запись'}
                                </button>
                                <button className="btn-download" onClick={() => downloadRecording(recording.filePath, recording.title)}>
                                  Скачать запись
                                </button>
                              </div>

                              {recording.materials && recording.materials.length > 0 && (
                                <div className="materials-section">
                                  <div className="materials-title">Материалы к лекции ({recording.materials.length}):</div>
                                  <div className="materials-list-inline">
                                    {recording.materials.map(material => (
                                      <div key={material.id} className="material-item-inline">
                                        <span className="material-icon-small">{getFileIcon(material.fileType)}</span>
                                        <span className="material-name-inline">{material.originalName}</span>
                                        <span className="material-size">{formatFileSize(material.fileSize)}</span>
                                        <button className="btn-download-small" onClick={() => downloadMaterial(material.filePath, material.originalName)}>
                                          Скачать
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
                  Всего записей: {filteredRecordings.length}
                </div>
              </div>
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