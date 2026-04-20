
import React, { useState } from 'react';
import Participants from '../../components/common/Participants';
import Chat from '../../components/common/Chat';
import AudioRecorder from '../../components/webinar/AudioRecorder';
import VideoRecorder from '../../components/webinar/VideoRecorder';
import TranscriptionModal from '../../components/webinar/TranscriptionModal';

const WebinarTeacherView = ({
  sessionId,
  teacher,
  onExit,
  messages,
  newMessage,
  setNewMessage,
  participants,
  studentsForMonitoring,
  connectionStatus,
  localStream,
  studentScreenStreams,
  isTeacherBroadcasting,
  activeStudentScreen,
  pendingScreenRequests,
  recordings,
  videoRecordings,
  transcriptions,
  transcribing,
  editingTranscription,
  messagesEndRef,
  studentVideoRef,
  teacherVideoRef,
  socketRef,
  startTeacherScreenShare,
  stopTeacherScreenShare,
  requestStudentScreen,
  stopWatchingStudentScreen,
  fetchRecordings,
  handleOpenTranscriptionEditor,
  handleCloseTranscriptionEditor,
  handleSaveTranscription,
  formatTime,
  playRecording,
  playVideoRecording,
  deleteRecording,
  transcribeRecording,
  sendMessage,
  finishWebinar,
  localVideoStream,
  isVideoEnabled,
  isAudioEnabled,
  studentVideoStreams,
  activeStudentVideo,
  startTeacherVideo,
  stopTeacherVideo,
  toggleTeacherAudio,
  setActiveStudentVideo,
  // ── трансляция записи ──
  isPlaybackBroadcasting,
  playbackRecording,
  playbackState,
  playbackCurrentTime,
  playbackDuration,
  startPlaybackBroadcast,
  pausePlaybackBroadcast,
  resumePlaybackBroadcast,
  seekPlaybackBroadcast,
  stopPlaybackBroadcast,
}) => {
  const [activeTab, setActiveTab] = useState('broadcast');
  // Список записей для выбора трансляции (все видеозаписи)
  const [showPlaybackPicker, setShowPlaybackPicker] = useState(false);

  const tabs = [
    { id: 'broadcast', label: 'Трансляция' },
    { id: 'students', label: 'Студенты', count: studentsForMonitoring.length },
    { id: 'recordings', label: 'Записи', count: (recordings?.length || 0) + (videoRecordings?.length || 0) }
  ];

  // Все записи (видео + аудио) для выбора трансляции
  const allRecordings = [
    ...(videoRecordings || []),
    ...(recordings || [])
  ];

  const renderStudentWithControls = (student) => (
    <div key={`student-${student.userId}-${student.socketId}`} className="student-card">
      <div className="student-info">
        <div className="student-status" />
        <div className="student-details">
          <div className="student-name">{student.userName}</div>
          <div className="student-id">ID: {student.userId}</div>
          {studentVideoStreams.has(student.socketId) && (
            <div className="student-video-badge" style={{ fontSize: '10px', color: '#10B981', marginTop: '4px' }}>
              📹 Видео включено
            </div>
          )}
        </div>
      </div>
      <div className="student-actions">
        <button
          onClick={() => {
            setNewMessage('@' + student.userName + ' ');
            setActiveTab('chat');
          }}
          className="btn-secondary"
        >
          Написать
        </button>
        {studentVideoStreams.has(student.socketId) && (
          <button
            onClick={() => setActiveStudentVideo({
              studentSocketId: student.socketId,
              studentName: student.userName
            })}
            className="btn-primary"
          >
            Смотреть видео
          </button>
        )}
        <button
          onClick={() => requestStudentScreen(student.socketId, student.userName)}
          disabled={activeStudentScreen?.studentSocketId === student.socketId}
          className={`btn-primary ${activeStudentScreen?.studentSocketId === student.socketId ? 'disabled' : ''}`}
        >
          {activeStudentScreen?.studentSocketId === student.socketId ? 'Смотрит экран' : 'Запросить экран'}
        </button>
      </div>
    </div>
  );

  // ── Форматирование времени для прогресс-бара ──
  const formatPlaybackTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="webinar-container">
      <style jsx>{`
        .webinar-container {
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

        .session-badge {
          padding: 6px 12px;
          background-color: #f3f4f6;
          border-radius: 20px;
          font-size: 12px;
          color: #6B7280;
        }

        .teacher-name {
          color: #111827;
          font-size: 14px;
          font-weight: 500;
        }

        .button-group {
          display: flex;
          gap: 12px;
        }

        .btn-danger {
          padding: 10px 20px;
          background-color: #EF4444;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background-color: #DC2626;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
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

        .main-layout {
          display: flex;
          gap: 24px;
          padding: 24px 40px;
          min-height: calc(100vh - 88px);
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sidebar {
          width: 380px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .tabs-container {
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
          font-size: 14px;
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

        .tab-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 8px;
          background-color: #EF4444;
          color: white;
          font-size: 11px;
          font-weight: 500;
          border-radius: 20px;
        }

        .tab-button.active .tab-badge {
          background-color: white;
          color: #7B61FF;
        }

        .video-block {
          background-color: #fff;
          border-radius: 24px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .video-header {
          padding: 12px 20px;
          background-color: #111827;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .video-header span {
          font-weight: 500;
          font-size: 14px;
        }

        .video-container {
          background-color: #000;
          position: relative;
          aspect-ratio: 16/9;
        }

        .video-container video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .video-controls {
          display: flex;
          gap: 12px;
          margin-top: 15px;
          flex-wrap: wrap;
        }

        .card {
          background-color: #fff;
          border-radius: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .card-header {
          padding: 16px 20px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .card-body {
          padding: 20px;
        }

        .btn-primary {
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

        .btn-primary:hover:not(:disabled) {
          background-color: #6750E0;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.2);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-outline {
          padding: 8px 16px;
          background-color: transparent;
          color: #6B7280;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-outline:hover {
          background-color: #f9fafb;
          transform: translateY(-1px);
        }

        .btn-success {
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

        .btn-success:hover {
          background-color: #059669;
          transform: translateY(-1px);
        }

        .students-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .student-card {
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }

        .student-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .student-status {
          width: 8px;
          height: 8px;
          background-color: #10B981;
          border-radius: 50%;
        }

        .student-details {
          flex: 1;
        }

        .student-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .student-id {
          font-size: 11px;
          color: #6B7280;
          margin-top: 2px;
        }

        .student-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .recordings-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 500px;
          overflow-y: auto;
        }

        .recording-item {
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .recording-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }

        .recording-info {
          flex: 1;
        }

        .recording-title {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          margin-bottom: 4px;
        }

        .recording-meta {
          font-size: 11px;
          color: #6B7280;
          margin-top: 4px;
        }

        .transcription-badge {
          margin-left: 8px;
          padding: 2px 8px;
          background-color: #10B981;
          color: white;
          font-size: 10px;
          border-radius: 20px;
        }

        .recording-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .transcription-preview {
          margin-top: 12px;
          padding: 12px;
          background-color: #f3f4f6;
          border-radius: 12px;
          max-height: 100px;
          overflow-y: auto;
        }

        .transcription-preview p {
          margin: 0;
          font-size: 12px;
          color: #374151;
          line-height: 1.4;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          color: #6B7280;
        }

        .pending-badge {
          padding: 4px 12px;
          background-color: #FEF3C7;
          color: #92400E;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .participants-section {
          background-color: #fff;
          border-radius: 24px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .participants-header {
          padding: 16px 20px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .participants-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .participants-list {
          overflow-y: auto;
          max-height: 300px;
        }

        .chat-section {
          background-color: #fff;
          border-radius: 24px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          padding: 16px 20px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 200px;
          max-height: 400px;
        }

        .empty-chat {
          text-align: center;
          padding: 20px;
          color: #6B7280;
          font-size: 14px;
        }

        .message-item {
          padding: 8px 12px;
          background-color: #f9fafb;
          border-radius: 12px;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .message-sender {
          font-size: 12px;
          font-weight: 600;
          color: #7B61FF;
        }

        .message-time {
          font-size: 11px;
          color: #9CA3AF;
        }

        .message-text {
          font-size: 14px;
          color: #111827;
        }

        .chat-input-area {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
        }

        .chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
        }

        .chat-input:focus {
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }

        .send-button {
          padding: 10px 16px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Трансляция записи ── */
        .playback-broadcast-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 24px;
          border: 1px solid #2d3561;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .playback-broadcast-header {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .playback-broadcast-title {
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background-color: #EF4444;
          border-radius: 50%;
          animation: blink 1.2s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .playback-broadcast-body {
          padding: 20px;
        }

        .playback-recording-info {
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }

        .playback-recording-name {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .playback-recording-meta {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }

        .playback-controls {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .playback-btn {
          padding: 9px 18px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .playback-btn-play {
          background-color: #10B981;
          color: white;
        }
        .playback-btn-play:hover { background-color: #059669; transform: translateY(-1px); }

        .playback-btn-pause {
          background-color: #F59E0B;
          color: white;
        }
        .playback-btn-pause:hover { background-color: #D97706; transform: translateY(-1px); }

        .playback-btn-stop {
          background-color: #EF4444;
          color: white;
        }
        .playback-btn-stop:hover { background-color: #DC2626; transform: translateY(-1px); }

        .playback-progress-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .playback-time {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          white-space: nowrap;
          min-width: 80px;
        }

        .playback-progress {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
          cursor: pointer;
          outline: none;
        }

        .playback-progress::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #7B61FF;
          border-radius: 50%;
          cursor: pointer;
        }

        /* Выбор записи для трансляции */
        .playback-picker-card {
          background-color: #fff;
          border-radius: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .playback-picker-header {
          padding: 16px 20px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .playback-picker-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .playback-picker-list {
          max-height: 360px;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .playback-picker-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          transition: all 0.2s;
          gap: 12px;
        }

        .playback-picker-item:hover {
          border-color: #7B61FF;
          background-color: #faf9ff;
          box-shadow: 0 2px 8px rgba(123,97,255,0.08);
        }

        .playback-picker-item-info {
          flex: 1;
          min-width: 0;
        }

        .playback-picker-item-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .playback-picker-item-meta {
          font-size: 11px;
          color: #6B7280;
          margin-top: 2px;
        }

        .type-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
          margin-left: 6px;
        }

        .type-badge-video {
          background-color: #FEE2E2;
          color: #991B1B;
        }

        .type-badge-audio {
          background-color: #DBEAFE;
          color: #1E40AF;
        }

        .btn-broadcast {
          padding: 8px 16px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .btn-broadcast:hover {
          background-color: #6750E0;
          transform: translateY(-1px);
        }

        @media (max-width: 1024px) {
          .main-layout {
            flex-direction: column;
            padding: 16px 20px;
          }
          .sidebar {
            width: 100%;
          }
          .students-grid {
            grid-template-columns: 1fr;
          }
          .recording-header {
            flex-direction: column;
          }
          .recording-actions {
            width: 100%;
          }
        }
      `}</style>

      <div className="header">
        <div className="logo-section">
          <span className="title">ВебРум</span>
        </div>
        <div>
          <span className="session-badge">Сессия ID: {sessionId}</span>
          <span className="teacher-name"> | {teacher?.name}</span>
        </div>
        <div className="button-group">
          <button onClick={finishWebinar} className="btn-danger">
            Завершить вебинар
          </button>
          <button onClick={onExit} className="btn-secondary">
            Выйти
          </button>
        </div>
      </div>

      <div className="main-layout">
        <div className="content-area">
          {/* Блок трансляции записи — показывается поверх остальных когда активна */}
          {isPlaybackBroadcasting && playbackRecording && (
            <div className="playback-broadcast-card">
              <div className="playback-broadcast-header">
                <div className="playback-broadcast-title">
                  <div className="live-dot" />
                  Трансляция записи студентам
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  {studentsForMonitoring.length} студент(ов) смотрят
                </span>
              </div>
              <div className="playback-broadcast-body">
                <div className="playback-recording-info">
                  <div className="playback-recording-name">
                    {playbackRecording.title || playbackRecording.courseTitle || 'Запись вебинара'}
                    <span className={`type-badge ${playbackRecording.type === 'audio' ? 'type-badge-audio' : 'type-badge-video'}`}>
                      {playbackRecording.type === 'audio' ? 'Аудио' : 'Видео'}
                    </span>
                  </div>
                  <div className="playback-recording-meta">
                    {playbackRecording.courseTitle && `Курс: ${playbackRecording.courseTitle} · `}
                    {new Date(playbackRecording.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="playback-controls">
                  {playbackState === 'paused' ? (
                    <button className="playback-btn playback-btn-play" onClick={resumePlaybackBroadcast}>
                      ▶ Продолжить
                    </button>
                  ) : (
                    <button className="playback-btn playback-btn-pause" onClick={pausePlaybackBroadcast}>
                      ⏸ Пауза
                    </button>
                  )}
                  <button className="playback-btn playback-btn-stop" onClick={stopPlaybackBroadcast}>
                    ⏹ Остановить трансляцию
                  </button>
                </div>

                <div className="playback-progress-row">
                  <span className="playback-time">{formatPlaybackTime(playbackCurrentTime)}</span>
                  <input
                    type="range"
                    className="playback-progress"
                    min={0}
                    max={playbackDuration || 100}
                    step={1}
                    value={playbackCurrentTime}
                    onChange={(e) => seekPlaybackBroadcast(Number(e.target.value))}
                  />
                  <span className="playback-time" style={{ textAlign: 'right' }}>
                    {formatPlaybackTime(playbackDuration)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Единый видео-блок преподавателя */}
          {(isVideoEnabled && localVideoStream) || (isTeacherBroadcasting && localStream) ? (
            <div className="video-block">
              <div className="video-header" style={{ backgroundColor: isTeacherBroadcasting ? '#111827' : '#10B981' }}>
                <span>
                  {isPlaybackBroadcasting
                    ? 'Превью трансляции записи'
                    : isTeacherBroadcasting
                      ? 'Трансляция экрана'
                      : 'Веб-камера'}
                  {!isAudioEnabled && ' (звук выключен)'}
                </span>
                {!isPlaybackBroadcasting && (
                  <button
                    onClick={isTeacherBroadcasting ? stopTeacherScreenShare : stopTeacherVideo}
                    className="btn-outline"
                  >
                    Выключить
                  </button>
                )}
              </div>
              <div className="video-container">
                <video
                  ref={teacherVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={!isTeacherBroadcasting && isVideoEnabled ? { transform: 'scaleX(-1)' } : {}}
                />
              </div>
            </div>
          ) : null}

          {/* Видео студента */}
          {activeStudentVideo && studentVideoStreams.get(activeStudentVideo.studentSocketId) && (
            <div className="video-block">
              <div className="video-header" style={{ backgroundColor: '#1F2937' }}>
                <span>Веб-камера студента: {activeStudentVideo.studentName}</span>
                <button onClick={() => setActiveStudentVideo(null)} className="btn-outline">
                  Закрыть
                </button>
              </div>
              <div className="video-container">
                <video
                  ref={studentVideoRef}
                  autoPlay
                  playsInline
                />
              </div>
            </div>
          )}

          {activeStudentScreen && studentScreenStreams.get(activeStudentScreen.studentSocketId) && (
            <div className="video-block">
              <div className="video-header" style={{ backgroundColor: '#1F2937' }}>
                <span>Экран студента: {activeStudentScreen.studentName}</span>
                <button onClick={stopWatchingStudentScreen} className="btn-outline">
                  Остановить
                </button>
              </div>
              <div className="video-container">
                <video
                  ref={studentVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                />
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <div className="video-controls">
                {!isVideoEnabled ? (
                  <button onClick={startTeacherVideo} className="btn-success" disabled={isPlaybackBroadcasting}>
                    Включить камеру
                  </button>
                ) : (
                  <>
                    <button onClick={stopTeacherVideo} className="btn-danger">
                      Выключить камеру
                    </button>
                    <button onClick={toggleTeacherAudio} className={isAudioEnabled ? 'btn-primary' : 'btn-secondary'}>
                      {isAudioEnabled ? 'Выключить звук' : 'Включить звук'}
                    </button>
                  </>
                )}

                {isPlaybackBroadcasting ? null : isTeacherBroadcasting ? (
                  <button onClick={stopTeacherScreenShare} className="btn-danger">
                    Остановить трансляцию экрана
                  </button>
                ) : (
                  <button onClick={startTeacherScreenShare} className="btn-primary">
                    Начать трансляцию экрана
                  </button>
                )}

                {/* Кнопка запуска трансляции записи */}
                {!isPlaybackBroadcasting && !isTeacherBroadcasting && (
                  <button
                    className="btn-primary"
                    onClick={() => setShowPlaybackPicker(v => !v)}
                    style={{ background: '#1a1a2e', borderColor: '#7B61FF' }}
                  >
                     Транслировать запись
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Панель выбора записи */}
          {showPlaybackPicker && !isPlaybackBroadcasting && (
            <div className="playback-picker-card">
              <div className="playback-picker-header">
                <h3>Выберите запись для трансляции</h3>
                <button className="btn-outline" onClick={() => setShowPlaybackPicker(false)}>
                  Закрыть
                </button>
              </div>
              {allRecordings.length === 0 ? (
                <div className="empty-state">
                  <p>Нет доступных записей</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    Записи появятся после завершения вебинаров с включённой записью
                  </p>
                </div>
              ) : (
                <div className="playback-picker-list">
                  {allRecordings.map(rec => (
                    <div key={rec.id} className="playback-picker-item">
                      <div className="playback-picker-item-info">
                        <div className="playback-picker-item-name">
                          {rec.title || rec.courseTitle || 'Запись вебинара'}
                          <span className={`type-badge ${rec.type === 'audio' ? 'type-badge-audio' : 'type-badge-video'}`}>
                            {rec.type === 'audio' ? 'Аудио' : 'Видео'}
                          </span>
                        </div>
                        <div className="playback-picker-item-meta">
                          {rec.courseTitle && `${rec.courseTitle} · `}
                          {new Date(rec.createdAt).toLocaleDateString()}
                          {rec.duration && ` · ${formatTime(rec.duration)}`}
                        </div>
                      </div>
                      <button
                        className="btn-broadcast"
                        onClick={() => {
                          setShowPlaybackPicker(false);
                          startPlaybackBroadcast(rec);
                        }}
                      >
                        ▶ Транслировать
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="tabs-container">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="tab-badge">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'broadcast' && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3>Видеозапись лекции</h3>
                </div>
                <div className="card-body">
                  <VideoRecorder
                    sessionId={sessionId}
                    teacherId={teacher.id}
                    teacherName={teacher.name}
                    localStream={localStream}
                    socketRef={socketRef}
                    onRecordingStarted={() => console.log('Запись видео начата')}
                    onRecordingStopped={() => console.log('Запись видео остановлена')}
                    onRecordingSaved={fetchRecordings}
                    onTranscriptionUpdate={(text) => console.log('Обновление транскрипции видео')}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>Аудиозапись лекции</h3>
                </div>
                <div className="card-body">
                  <AudioRecorder
                    sessionId={sessionId}
                    teacherId={teacher.id}
                    teacherName={teacher.name}
                    socketRef={socketRef}
                    onRecordingSaved={fetchRecordings}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'students' && (
            <div className="card">
              <div className="card-header">
                <h3>Студенты ({studentsForMonitoring.length})</h3>
                {pendingScreenRequests && pendingScreenRequests.length > 0 && (
                  <div className="pending-badge">
                    Ожидание ответа: {pendingScreenRequests.length}
                  </div>
                )}
              </div>
              <div className="card-body">
                {studentsForMonitoring.length === 0 ? (
                  <div className="empty-state">
                    <p>Нет подключенных студентов</p>
                  </div>
                ) : (
                  <div className="students-grid">
                    {studentsForMonitoring.map(renderStudentWithControls)}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recordings' && (
            <div className="card">
              <div className="card-header">
                <h3>Записи вебинара</h3>
              </div>
              <div className="card-body">
                {(recordings?.length === 0 && (!videoRecordings || videoRecordings.length === 0)) ? (
                  <div className="empty-state">
                    <p>Нет записей</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      Записи появятся здесь после того, как вы начнете запись
                    </p>
                  </div>
                ) : (
                  <div className="recordings-list">
                    {recordings?.map(recording => (
                      <div key={recording.id} className="recording-item">
                        <div className="recording-header">
                          <div className="recording-info">
                            <div className="recording-title">
                              Аудиозапись
                              {recording.transcription && (
                                <span className="transcription-badge">Конспект готов</span>
                              )}
                            </div>
                            <div className="recording-meta">
                              {recording.description || 'Без описания'}
                            </div>
                            <div className="recording-meta">
                              {new Date(recording.createdAt).toLocaleString()} | 
                              {recording.duration ? formatTime(recording.duration) : 'Длительность неизвестна'}
                            </div>
                          </div>
                          <div className="recording-actions">
                            <button onClick={() => playRecording(recording.filePath)} className="btn-secondary">
                              Воспроизвести
                            </button>
                            <button onClick={() => deleteRecording(recording.id)} className="btn-secondary">
                              Удалить
                            </button>
                            {!recording.transcription ? (
                              <button
                                onClick={() => transcribeRecording(recording.id)}
                                disabled={transcribing[recording.id]}
                                className="btn-primary"
                              >
                                {transcribing[recording.id] ? 'Обработка...' : 'Распознать речь'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenTranscriptionEditor(recording.id)}
                                className="btn-primary"
                              >
                                Редактировать
                              </button>
                            )}
                          </div>
                        </div>
                        {(recording.transcription || transcriptions[recording.id]) && (
                          <div className="transcription-preview">
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Конспект:</div>
                            <p>{recording.transcription || transcriptions[recording.id]}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {videoRecordings?.map(recording => (
                      <div key={recording.id} className="recording-item">
                        <div className="recording-header">
                          <div className="recording-info">
                            <div className="recording-title">
                              Видеозапись
                              {recording.transcription && (
                                <span className="transcription-badge">Конспект готов</span>
                              )}
                            </div>
                            <div className="recording-meta">
                              {recording.description || 'Без описания'}
                            </div>
                            <div className="recording-meta">
                              {new Date(recording.createdAt).toLocaleString()} | 
                              {recording.duration ? formatTime(recording.duration) : 'Длительность неизвестна'}
                            </div>
                          </div>
                          <div className="recording-actions">
                            <button onClick={() => playVideoRecording(recording.filePath)} className="btn-primary">
                              Смотреть
                            </button>
                            <button onClick={() => deleteRecording(recording.id)} className="btn-secondary">
                              Удалить
                            </button>
                            {!recording.transcription ? (
                              <button
                                onClick={() => transcribeRecording(recording.id)}
                                disabled={transcribing[recording.id]}
                                className="btn-primary"
                              >
                                {transcribing[recording.id] ? 'Обработка...' : 'Распознать речь'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenTranscriptionEditor(recording.id)}
                                className="btn-primary"
                              >
                                Редактировать
                              </button>
                            )}
                          </div>
                        </div>
                        {(recording.transcription || transcriptions[recording.id]) && (
                          <div className="transcription-preview">
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Конспект:</div>
                            <p>{recording.transcription || transcriptions[recording.id]}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar">
          <div className="participants-section">
            <div className="participants-header">
              <h3>Участники ({participants.length})</h3>
            </div>
            <div className="participants-list">
              {participants.map(participant => (
                <div key={`${participant.userType}-${participant.userId}-${participant.socketId}`} className="student-card" style={{ margin: '0', borderRadius: '0', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                  <div className="student-info">
                    <div className="student-status" />
                    <div className="student-details">
                      <div className="student-name">
                        {participant.userName}
                        {participant.userType === 'student' && studentVideoStreams.has(participant.socketId) && (
                          <span style={{ marginLeft: '8px', fontSize: '12px' }}>📹</span>
                        )}
                      </div>
                      <div className="student-id">
                        {participant.userType === 'teacher' ? 'Преподаватель' : 'Студент'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-section">
            <div className="chat-header">
              <h3>Чат вебинара ({messages.length})</h3>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <p>Сообщений пока нет</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>
                    Напишите первое сообщение
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={`msg-${index}-${msg.timestamp}`} className="message-item">
                    <div className="message-header">
                      <span className="message-sender">{msg.senderName}</span>
                      <span className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="message-text">{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Введите сообщение..."
                className="chat-input"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !socketRef.current?.connected}
                className="send-button"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingTranscription && (
        <TranscriptionModal
          recordingId={editingTranscription}
          onClose={handleCloseTranscriptionEditor}
          onSave={handleSaveTranscription}
        />
      )}
    </div>
  );
};

export default WebinarTeacherView;