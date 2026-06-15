import React, { useState, useRef } from 'react';
import StudentMaterials from '../../components/student/StudentMaterials';
import PastMaterialsView from '../../components/common/PastMaterialsView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const WebinarStudentView = ({
  sessionId,
  student,
  onExit,
  messages,
  newMessage,
  setNewMessage,
  participants,
  connectionStatus,
  teacherPresent,
  teacherName,
  teacherScreenActive,
  teacherScreenStream,
  isSharingScreen,
  isMicEnabled,
  incomingScreenRequest,
  setIncomingScreenRequest,
  messagesEndRef,
  teacherScreenVideoRef,
  teacherCameraVideoRef,
  studentScreenPreviewRef,
  sendMessage,
  trackActivity,
  startScreenShare,
  stopScreenShare,
  toggleMicrophone,
  socketRef,
  mentionModalData,
  closeMentionModal,
  sessionComment,
  sessionMaterials,
  materialsLoading,
  loadSessionMaterials,
  playbackActive,
  playbackRecordingInfo
}) => {
  const [activeTab, setActiveTab] = useState('students');
  const [sortBy, setSortBy] = useState('date_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpQuestion, setHelpQuestion] = useState('');
  const audioRef = useRef(null);

  const isScreenShowing = teacherScreenActive && teacherScreenStream;

  const sendHelpRequest = () => {
    if (!socketRef.current?.connected) return;
    const helpText = helpQuestion.trim()
      ? `НУЖНА ПОМОЩЬ: ${helpQuestion.trim()}`
      : `НУЖНА ПОМОЩЬ`;
    socketRef.current.emit('send_message', {
      sessionId,
      message: helpText,
      senderType: 'student',
      senderId: student.id,
      senderName: student.full_name
    });
    setHelpQuestion('');
    setShowHelpModal(false);
    setActiveTab('chat');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return 'FILE';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('image')) return 'IMG';
    if (fileType.includes('video')) return 'VID';
    if (fileType.includes('audio')) return 'AUD';
    if (fileType.includes('word') || fileType.includes('document')) return 'DOC';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'XLS';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'PPT';
    return 'FILE';
  };

  const downloadFile = (filePath, originalName) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${filePath}`;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const playAudio = (material) => {
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

  const openVideo = (material) => {
    setPlayingVideo(material);
  };

  const getSortedMaterials = () => {
    let items = [...(sessionMaterials || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(m =>
        (m.originalName || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'date_asc': return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'name_asc': return items.sort((a, b) => (a.originalName || '').localeCompare(b.originalName || ''));
      case 'name_desc': return items.sort((a, b) => (b.originalName || '').localeCompare(a.originalName || ''));
      case 'type': return items.sort((a, b) => (a.fileType || '').localeCompare(b.fileType || ''));
      default: return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  const tabs = [
    { id: 'students', label: 'Студенты', count: participants.filter(p => p.userType === 'student').length },
    { id: 'materials', label: 'Материалы' },
    { id: 'past', label: 'Прошедшие занятия' }
  ];

  const checkIfMentioned = (text) => {
    if (!student?.full_name) return false;
    const escaped = student.full_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`@${escaped}`, 'i').test(text);
  };

  const highlightMentions = (text) => {
    const parts = text.split(/(@[\wа-яА-ЯёЁ]+)/gi);
    return parts.map((part, i) =>
      part.startsWith('@') ? <strong key={i} style={{ color: '#7B61FF' }}>{part}</strong> : part
    );
  };

  const renderStudentControls = () => (
    <div className="student-controls-bar">
      <button
        onClick={toggleMicrophone}
        className={isMicEnabled ? 'ctrl-btn ctrl-btn-active' : 'ctrl-btn ctrl-btn-mic'}
      >
        {isMicEnabled ? 'Микрофон выключить' : 'Микрофон включить'}
      </button>

      {isSharingScreen && (
        <button onClick={stopScreenShare} className="ctrl-btn ctrl-btn-danger">
          Остановить трансляцию экрана
        </button>
      )}

      <button
        onClick={() => { trackActivity('need_help'); setShowHelpModal(true); }}
        className="ctrl-btn ctrl-btn-help"
      >
        Нужна помощь
      </button>
    </div>
  );

  const renderParticipantsList = () => (
    <div className="card">
      <div className="card-header">
        <h3>Участники ({participants.length})</h3>
      </div>
      <div className="card-body">
        {participants.map(p => (
          <div key={`${p.userType}-${p.userId}-${p.socketId}`} className="participant-row">
            <div className={`participant-dot ${p.userType}`} />
            <span className="participant-name">{p.userName}</span>
            <span className="participant-role">
              {p.userType === 'teacher' ? 'Преподаватель' : 'Студент'}
            </span>
            <button
              onClick={() => { setNewMessage('@' + p.userName + ' '); setActiveTab('chat'); }}
              className="mention-btn"
              title={`Написать ${p.userName}`}
            >
              Написать
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChatSidebar = () => (
    <div className="chat-section">
      <div className="chat-header">
        <h3>Чат ({messages.length})</h3>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">Сообщений пока нет</div>
        ) : (
          messages.map((msg, i) => {
            const isMentioned = checkIfMentioned(msg.text);
            const isHelpRequest = msg.text && msg.text.includes('НУЖНА ПОМОЩЬ');
            return (
              <div
                key={`msg-${i}-${msg.timestamp}`}
                className={`message-item${isMentioned ? ' mentioned' : ''}${isHelpRequest ? ' help-request' : ''}`}
              >
                <div className="message-header">
                  <span className={`message-sender ${msg.senderType === 'teacher' ? 'teacher-sender' : ''}`}>
                    {msg.senderName}
                    {msg.senderType === 'teacher' && (
                      <span className="teacher-badge">Преподаватель</span>
                    )}
                  </span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="message-text">{highlightMentions(msg.text)}</div>
                {isMentioned && <div className="mention-note">Вас упомянули</div>}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Сообщение..."
          className="chat-input"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || !socketRef.current?.connected}
          className="send-button"
        >
          Отправить
        </button>
        <button
          onClick={() => setShowHelpModal(true)}
          className="help-button"
          title="Попросить помощь у преподавателя"
        >
          Нужна помощь
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style jsx>{`
        .webinar-container {
          min-height: 100vh;
          background-color: #f7f7f8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background-color: #fff;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo {
          width: 40px;
          height: 40px;
          background-color: #7B61FF;
          border-radius: 10px;
        }

        .title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .session-badge {
          padding: 4px 10px;
          background-color: #f3f4f6;
          border-radius: 20px;
          font-size: 12px;
          color: #6B7280;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .user-name {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
        }

        .user-group {
          font-size: 13px;
          color: #6B7280;
        }

        .teacher-status {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .teacher-status.online {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .teacher-status.offline {
          background-color: #FEE2E2;
          color: #DC2626;
        }

        .btn-danger {
          padding: 8px 18px;
          background-color: #EF4444;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background-color: #DC2626;
        }

        .btn-secondary {
          padding: 8px 16px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
        }

        .main-layout {
          display: flex;
          gap: 20px;
          padding: 20px 32px;
          min-height: calc(100vh - 65px);
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .sidebar {
          width: 360px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .video-block {
          background-color: #111827;
          border-radius: 20px;
          overflow: hidden;
        }

        .video-header {
          padding: 10px 16px;
          background-color: rgba(0,0,0,0.5);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
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

        .btn-outline {
          padding: 6px 14px;
          background-color: transparent;
          color: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-outline:hover {
          background-color: rgba(255,255,255,0.15);
        }

        .playback-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background-color: #FEF3C7;
          border: 1px solid #FDE68A;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .playback-indicator-icon {
          font-size: 20px;
        }

        .playback-indicator-text {
          font-size: 13px;
          color: #92400E;
        }

        .playback-indicator-text strong {
          font-weight: 600;
        }

        .student-controls-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 12px 16px;
          background-color: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          align-items: center;
        }

        .ctrl-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .ctrl-btn-mic {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .ctrl-btn-mic:hover {
          background: #e5e7eb;
        }

        .ctrl-btn-active {
          background: #7B61FF;
          color: white;
        }

        .ctrl-btn-active:hover {
          background: #6750E0;
        }

        .ctrl-btn-danger {
          background: #EF4444;
          color: white;
        }

        .ctrl-btn-danger:hover {
          background: #DC2626;
        }

        .ctrl-btn-help {
          background: #F59E0B;
          color: white;
          margin-left: auto;
        }

        .ctrl-btn-help:hover {
          background: #D97706;
        }

        .tabs-container {
          display: flex;
          gap: 6px;
          background-color: #fff;
          padding: 6px;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          flex-wrap: wrap;
        }

        .tab-button {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          color: #6B7280;
          white-space: nowrap;
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
          margin-left: 6px;
          padding: 1px 6px;
          background-color: #EF4444;
          color: white;
          font-size: 10px;
          font-weight: 600;
          border-radius: 20px;
        }

        .tab-button.active .tab-badge {
          background-color: white;
          color: #7B61FF;
        }

        .card {
          background-color: #fff;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .card-header {
          padding: 14px 18px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #fafafa;
        }

        .card-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .card-body {
          padding: 18px;
        }

        .participant-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
          color: #374151;
        }

        .participant-row:last-child {
          border-bottom: none;
        }

        .participant-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .participant-dot.teacher {
          background-color: #7B61FF;
        }

        .participant-dot.student {
          background-color: #10B981;
        }

        .participant-name {
          flex: 1;
        }

        .participant-role {
          font-size: 11px;
          color: #9CA3AF;
        }

        .mention-btn {
          margin-left: auto;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 500;
          background-color: #F3F4F6;
          color: #7B61FF;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mention-btn:hover {
          background-color: #7B61FF;
          color: #fff;
          border-color: #7B61FF;
        }

        .chat-section {
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 500px;
        }

        .chat-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          background-color: #fafafa;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .empty-chat {
          text-align: center;
          padding: 20px;
          color: #9CA3AF;
          font-size: 13px;
        }

        .message-item {
          padding: 8px 10px;
          background-color: #f9fafb;
          border-radius: 10px;
        }

        .message-item.mentioned {
          background-color: #F5F3FF;
          border-left: 3px solid #7B61FF;
        }

        .message-item.help-request {
          background-color: #FFFBEB;
          border-left: 3px solid #F59E0B;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }

        .message-sender {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .message-sender.teacher-sender {
          color: #7B61FF;
        }

        .teacher-badge {
          font-size: 10px;
          background: #7B61FF;
          color: white;
          padding: 1px 5px;
          border-radius: 4px;
          margin-left: 5px;
        }

        .message-time {
          font-size: 11px;
          color: #9CA3AF;
        }

        .message-text {
          font-size: 13px;
          color: #111827;
        }

        .mention-note {
          font-size: 11px;
          color: #7B61FF;
          margin-top: 5px;
          font-weight: 500;
        }

        .chat-input-area {
          padding: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
        }

        .chat-input {
          flex: 1;
          padding: 9px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }

        .chat-input:focus {
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123,97,255,0.08);
        }

        .send-button {
          padding: 9px 16px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .help-button {
          padding: 9px 14px;
          background-color: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: #92400E;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .help-button:hover {
          background-color: #FDE68A;
        }

        .help-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          outline: none;
          margin-bottom: 12px;
        }

        .help-textarea:focus {
          border-color: #7B61FF;
        }

        .help-send-btn {
          padding: 10px 20px;
          background-color: #F59E0B;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .help-send-btn:hover {
          background-color: #D97706;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #9CA3AF;
          font-size: 13px;
        }

        .mention-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
        }

        .modal-content {
          background-color: white;
          border-radius: 20px;
          padding: 24px;
          width: 90%;
          max-width: 440px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        }

        .modal-title {
          margin: 0 0 14px 0;
          font-size: 17px;
          font-weight: 600;
          color: #111827;
        }

        .modal-text {
          font-size: 14px;
          color: #374151;
          margin: 0 0 14px 0;
        }

        .modal-message-box {
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 12px;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .modal-allow {
          padding: 10px 24px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }

        .modal-allow:hover {
          background-color: #6750E0;
        }

        .modal-deny {
          padding: 10px 24px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }

        .modal-deny:hover {
          background-color: #e5e7eb;
        }

        .request-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
        }

        .unmute-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background-color: #FEF3C7;
          border-top: 1px solid #FDE68A;
          font-size: 13px;
          color: #92400E;
          gap: 10px;
        }

        .unmute-btn {
          padding: 6px 14px;
          background-color: #F59E0B;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .unmute-btn:hover {
          background-color: #D97706;
        }

        .preview-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background-color: rgba(0,0,0,0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 500;
          z-index: 10;
        }

        @media (max-width: 1100px) {
          .main-layout {
            flex-direction: column;
            padding: 16px 20px;
          }
          .sidebar {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .header {
            padding: 12px 16px;
          }
          .main-layout {
            padding: 12px 16px;
          }
        }
      `}</style>

      <div className="webinar-container">
        {mentionModalData && (
          <div className="mention-modal-overlay" onClick={closeMentionModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Вас упомянули</h3>
              <p className="modal-text">
                <strong>{mentionModalData.senderName}</strong> обратился к вам:
              </p>
              <div className="modal-message-box">
                <p>{highlightMentions(mentionModalData.text)}</p>
              </div>
              <div className="modal-buttons">
                <button onClick={closeMentionModal} className="modal-deny">Закрыть</button>
              </div>
            </div>
          </div>
        )}

        {showHelpModal && (
          <div className="mention-modal-overlay" onClick={() => setShowHelpModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Запрос помощи</h3>
              <p className="modal-text">Опишите ваш вопрос (необязательно):</p>
              <textarea
                className="help-textarea"
                value={helpQuestion}
                onChange={(e) => setHelpQuestion(e.target.value)}
                placeholder="Напишите вопрос преподавателю..."
                rows={3}
              />
              <div className="modal-buttons">
                <button onClick={sendHelpRequest} className="help-send-btn">
                  Отправить запрос
                </button>
                <button onClick={() => setShowHelpModal(false)} className="modal-deny">Отмена</button>
              </div>
            </div>
          </div>
        )}

        <div className="header">
          <div className="logo-section">
            <div className="logo"></div>
            <span className="title">ВебРум</span>
            <span className="session-badge">Сессия {sessionId}</span>
          </div>
          <div className="user-info">
            <span className="user-name">{student?.full_name}</span>
            <span className="user-group">({student?.group})</span>
          </div>
          <div className={`teacher-status ${teacherPresent ? 'online' : 'offline'}`}>
            Преподаватель: {teacherPresent ? teacherName : 'Не подключён'}
          </div>
          <button onClick={onExit} className="btn-secondary">Выйти</button>
        </div>

        <div className="main-layout">
          <div className="content-area">
            {playbackActive && playbackRecordingInfo && (
              <div className="playback-indicator">
                
                <div className="playback-indicator-text">
                  Преподаватель демонстрирует запись: <strong>{playbackRecordingInfo.recordingTitle}</strong>
                </div>
              </div>
            )}

            {isScreenShowing && (
              <div className="video-block">
                <div className="video-header" style={{ backgroundColor: '#1F2937' }}>
                  <span>Трансляция преподавателя: {teacherName}</span>
                </div>
                <div className="video-container" style={{ position: 'relative' }}>
                  <video ref={teacherScreenVideoRef} autoPlay playsInline muted={false} />
                  <button
                    onClick={() => teacherScreenVideoRef.current?.requestFullscreen()}
                    className="btn-outline"
                    style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 10 }}
                  >
                    Полный экран
                  </button>
                </div>
                <div className="unmute-banner" id="unmute-banner" style={{ display: 'none' }}>
                  <span>Браузер заблокировал звук. Нажмите, чтобы включить.</span>
                  <button className="unmute-btn" onClick={() => {
                    const el = teacherScreenVideoRef.current;
                    if (el) { el.muted = false; el.play(); }
                    document.getElementById('unmute-banner').style.display = 'none';
                  }}>Включить звук</button>
                </div>
              </div>
            )}

            {isSharingScreen && studentScreenPreviewRef && (
              <div className="video-block">
                <div className="video-header" style={{ backgroundColor: '#1F2937' }}>
                  <span>Ваш экран (транслируется преподавателю)</span>
                  <button onClick={stopScreenShare} className="btn-outline" style={{ color: '#FCA5A5', borderColor: '#FCA5A5' }}>
                    Остановить трансляцию
                  </button>
                </div>
                <div className="video-container" style={{ position: 'relative' }}>
                  <video ref={studentScreenPreviewRef} autoPlay playsInline muted />
                  <div className="preview-badge">Идёт трансляция</div>
                </div>
              </div>
            )}

            {renderStudentControls()}

            <div className="tabs-container">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                  {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
                </button>
              ))}
            </div>

            {activeTab === 'students' && (
              <div className="card">
                <div className="card-header">
                  <h3>Студенты ({participants.filter(p => p.userType === 'student').length})</h3>
                </div>
                <div className="card-body">
                  {participants.filter(p => p.userType === 'student').length === 0 ? (
                    <div className="empty-state">Нет подключённых студентов</div>
                  ) : (
                    participants.filter(p => p.userType === 'student').map(s => (
                      <div key={s.socketId} className="participant-row">
                        <div className="participant-dot student" />
                        <span className="participant-name">{s.userName}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="card">
                {sessionComment && (
                  <div style={{ padding: '14px 18px', background: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400E' }}>Комментарий преподавателя</div>
                    <div style={{ fontSize: '13px', color: '#78350F', marginTop: '4px' }}>{sessionComment}</div>
                  </div>
                )}

                <div style={{ padding: '12px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>Материалы ({sessionMaterials.length})</span>
                  <input type="text" placeholder="Поиск..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: '20px', fontSize: '13px', width: '160px' }} />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '20px', fontSize: '13px' }}>
                    <option value="date_desc">Сначала новые</option>
                    <option value="date_asc">Сначала старые</option>
                    <option value="name_asc">По имени А→Я</option>
                    <option value="name_desc">По имени Я→А</option>
                    <option value="type">По типу</option>
                  </select>
                  <button onClick={loadSessionMaterials} style={{ padding: '6px 14px', background: '#f3f4f6', borderRadius: '20px', cursor: 'pointer' }}>Обновить</button>
                </div>

                {materialsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>
                ) : getSortedMaterials().length === 0 ? (
                  <div className="empty-state">{searchQuery ? 'Ничего не найдено' : 'Материалов пока нет'}</div>
                ) : (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getSortedMaterials().map(m => {
                      const isAudio = m.fileType?.includes('audio') || m.originalName?.match(/\.(mp3|wav|ogg)$/i);
                      const isVideo = m.fileType?.includes('video') || m.originalName?.match(/\.(mp4|webm)$/i);
                      return (
                        <div key={m.id} style={{ padding: '14px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600' }}>{m.originalName}</div>
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                                {formatFileSize(m.fileSize)} · {new Date(m.createdAt).toLocaleString()}
                              </div>
                              {m.description && <div style={{ fontSize: '12px', marginTop: '6px', padding: '6px', background: 'white', borderRadius: '6px' }}>{m.description}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {isAudio && (
                                <button onClick={() => playAudio(m)} style={{ padding: '6px 14px', background: playingAudio === m.id ? '#7B61FF' : '#DBEAFE', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                  {playingAudio === m.id ? 'Пауза' : 'Слушать'}
                                </button>
                              )}
                              {isVideo && (
                                <button onClick={() => openVideo(m)} style={{ padding: '6px 14px', background: '#FEE2E2', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                  Смотреть
                                </button>
                              )}
                              <button onClick={() => downloadFile(m.filePath, m.originalName)} style={{ padding: '6px 14px', background: '#10B981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                Скачать
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'past' && (
              <PastMaterialsView
                sessionId={sessionId}
                userType="student"
                onMaterialSelect={(recording) => {
                  if (recording.sessionId) {
                    loadSessionMaterials();
                  }
                }}
              />
            )}
          </div>

          <div className="sidebar">
            {renderParticipantsList()}
            {renderChatSidebar()}
          </div>
        </div>

        {incomingScreenRequest && (
          <div className="request-modal">
            <div className="modal-content">
              <h3 className="modal-title">Запрос на показ экрана</h3>
              <p className="modal-text">
                Преподаватель <strong>{incomingScreenRequest.teacherName}</strong> просит показать ваш экран.
              </p>
              <div className="modal-buttons">
                <button onClick={() => startScreenShare(incomingScreenRequest.teacherSocketId)} className="modal-allow">
                  Разрешить
                </button>
                <button onClick={() => setIncomingScreenRequest(null)} className="modal-deny">
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        )}

        {playingVideo && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
            onClick={() => setPlayingVideo(null)}>
            <div style={{ background: '#111827', borderRadius: '16px', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                <span style={{ color: 'white' }}>{playingVideo.originalName}</span>
                <button onClick={() => setPlayingVideo(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <video src={`${API_BASE_URL}${playingVideo.filePath}`} controls autoPlay style={{ maxWidth: '100%', maxHeight: '70vh' }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WebinarStudentView;