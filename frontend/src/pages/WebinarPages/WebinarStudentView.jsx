
import React from 'react';

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
  localStream,
  isSharingScreen,
  incomingScreenRequest,
  setIncomingScreenRequest,
  messagesEndRef,
  // ── два отдельных рефа (было одно teacherVideoRef — конфликтовало) ──
  teacherScreenVideoRef,
  teacherCameraVideoRef,
  sendMessage,
  trackActivity,
  startStudentScreenShare,
  stopStudentScreenShare,
  socketRef,
  mentionModalData,
  closeMentionModal,
  localVideoStream,
  isVideoEnabled,
  isAudioEnabled,
  teacherVideoStream,
  isTeacherVideoActive,
  startStudentVideo,
  stopStudentVideo,
  toggleStudentAudio
}) => {
  const checkIfMentioned = (text) => {
    if (!student || !student.full_name) return false;
    const name = student.full_name;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`@${escapedName}`, 'i').test(text);
  };

  const highlightMentions = (text) => {
    const parts = text.split(/(@[\wа-яА-ЯёЁ]+)/gi);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return <strong key={index} style={{ color: '#7B61FF' }}>{part}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      <style>{`
        .webinar-container {
          min-height: 100vh;
          background-color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
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

        .teacher-status {
          padding: 6px 12px;
          background-color: #f3f4f6;
          border-radius: 20px;
          font-size: 12px;
        }

        .teacher-status.online {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .teacher-status.offline {
          background-color: #FEE2E2;
          color: #DC2626;
        }

        .exit-button {
          padding: 10px 20px;
          background-color: #6B7280;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .exit-button:hover {
          background-color: #4B5563;
          transform: translateY(-1px);
        }

        .main-layout {
          display: flex;
          gap: 24px;
          padding: 24px 40px;
          min-height: calc(100vh - 80px);
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .screen-share-area {
          background-color: #000;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .screen-share-header {
          padding: 12px 20px;
          background-color: rgba(0,0,0,0.8);
          color: white;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .screen-share-video {
          width: 100%;
          height: 400px;
          object-fit: contain;
        }

        .info-card {
          background-color: #fff;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .info-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 20px 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat-card {
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .stat-label {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .stat-value.connected {
          color: #10B981;
        }

        .stat-value.disconnected {
          color: #DC2626;
        }

        .stat-value.active {
          color: #F59E0B;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .btn-help {
          flex: 1;
          padding: 12px 24px;
          background-color: #F59E0B;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-help:hover {
          background-color: #D97706;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
        }

        .btn-video {
          flex: 1;
          padding: 12px 24px;
          background-color: #10B981;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-video:hover {
          background-color: #059669;
          transform: translateY(-1px);
        }

        .btn-video-off {
          flex: 1;
          padding: 12px 24px;
          background-color: #EF4444;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-video-off:hover {
          background-color: #DC2626;
          transform: translateY(-1px);
        }

        .btn-audio {
          flex: 1;
          padding: 12px 24px;
          background-color: #3B82F6;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-audio-off {
          flex: 1;
          padding: 12px 24px;
          background-color: #6B7280;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-stop-share {
          width: 100%;
          padding: 12px 24px;
          background-color: #EF4444;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 15px;
          transition: all 0.2s;
        }

        .btn-stop-share:hover {
          background-color: #DC2626;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
        }

        .unmute-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background-color: #FEF3C7;
          border-top: 1px solid #FDE68A;
          font-size: 13px;
          color: #92400E;
          gap: 12px;
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
          white-space: nowrap;
          transition: background 0.2s;
        }

        .unmute-btn:hover { background-color: #D97706; }

        .sidebar {
          width: 380px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .participants-section {
          background-color: #fff;
          border-radius: 24px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          max-height: 300px;
          overflow-y: auto;
        }

        .participants-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .participants-count {
          padding: 2px 8px;
          background-color: #f3f4f6;
          border-radius: 20px;
          font-size: 12px;
          color: #6B7280;
        }

        .participant-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .participant-item:last-child {
          border-bottom: none;
        }

        .participant-avatar {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 12px;
        }

        .participant-avatar.teacher {
          background-color: #7B61FF;
        }

        .participant-avatar.student {
          background-color: #10B981;
        }

        .participant-info {
          flex: 1;
        }

        .participant-name {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .participant-role {
          font-size: 11px;
          color: #6B7280;
        }

        .chat-section {
          background-color: #fff;
          border-radius: 24px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 400px;
        }

        .chat-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 16px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 16px;
          min-height: 300px;
          max-height: 400px;
        }

        .message-item {
          margin-bottom: 16px;
          padding: 12px;
          background-color: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .message-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .message-sender {
          font-weight: 600;
          font-size: 13px;
          color: #7B61FF;
        }

        .message-time {
          font-size: 10px;
          color: #9CA3AF;
        }

        .message-text {
          font-size: 14px;
          color: #374151;
          line-height: 1.4;
        }

        .empty-chat {
          text-align: center;
          padding: 40px 20px;
          color: #9CA3AF;
        }

        .chat-input-area {
          display: flex;
          gap: 12px;
        }

        .chat-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .chat-input:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }

        .send-button {
          padding: 12px 24px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-button:hover:not(:disabled) {
          background-color: #6750E0;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.2);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .request-modal, .mention-modal-overlay {
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
          padding: 32px;
          border-radius: 24px;
          text-align: center;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: slideUp 0.3s ease-out;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .modal-text {
          color: #6B7280;
          margin-bottom: 24px;
        }

        .modal-message-box {
          background-color: #f9fafb;
          padding: 16px;
          border-radius: 12px;
          margin: 16px 0;
          text-align: left;
          border-left: 3px solid #7B61FF;
        }

        .modal-message-box p {
          margin: 0;
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
        }

        .modal-allow {
          padding: 12px 32px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
        }

        .modal-allow:hover {
          background-color: #6750E0;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.2);
        }

        .modal-deny, .modal-close-btn {
          padding: 12px 32px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
        }

        .modal-deny:hover, .modal-close-btn:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 1024px) {
          .main-layout {
            flex-direction: column;
            padding: 20px;
          }
          .sidebar {
            width: 100%;
          }
          .screen-share-video {
            height: 300px;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .header {
            padding: 16px 20px;
            flex-direction: column;
            text-align: center;
          }
          .header-left {
            justify-content: center;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .action-buttons {
            flex-direction: column;
          }
          .chat-messages {
            min-height: 200px;
          }
        }
      `}</style>

      <div className="webinar-container">
        {mentionModalData && (
          <div className="mention-modal-overlay" onClick={closeMentionModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Вас упомянули</h3>
              <p className="modal-text">
                Пользователь <strong>{mentionModalData.senderName}</strong> обратился к вам:
              </p>
              <div className="modal-message-box">
                <p>{highlightMentions(mentionModalData.text)}</p>
              </div>
              <div className="modal-buttons">
                <button onClick={closeMentionModal} className="modal-close-btn">
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="header">
          <div className="header-left">
            <div className="logo-section">
              <span className="title">ВебРум</span>
            </div>
            <span className="session-badge">Сессия ID: {sessionId}</span>
          </div>
          
          <div className="user-info">
            <span className="user-name">{student?.full_name}</span>
            <span className="user-group">({student?.group})</span>
          </div>
          
          <div className={`teacher-status ${teacherPresent ? 'online' : 'offline'}`}>
            Преподаватель: {teacherPresent ? teacherName : 'Не подключен'}
          </div>
          
          <button onClick={onExit} className="exit-button">
            Выйти из вебинара
          </button>
        </div>

        <div className="main-layout">
          <div className="content-area">

            {/* ── Трансляция экрана / записи преподавателя ── */}
            {teacherScreenActive && teacherScreenStream && (
              <div className="screen-share-area">
                <div className="screen-share-header">
                  <span>📺 Трансляция преподавателя: {teacherName}</span>
                </div>
                {/* Отдельный ref — не конфликтует с камерой */}
                <video
                  ref={teacherScreenVideoRef}
                  autoPlay
                  playsInline
                  className="screen-share-video"
                />
                {/* Баннер для случаев когда автовоспроизведение с аудио заблокировано */}
                <div className="unmute-banner" id="unmute-banner" style={{ display: 'none' }}>
                  <span>🔇 Браузер заблокировал звук. Нажмите кнопку чтобы включить.</span>
                  <button
                    className="unmute-btn"
                    onClick={() => {
                      const el = teacherScreenVideoRef.current;
                      if (el) {
                        el.muted = false;
                        el.play().catch(() => {});
                      }
                      document.getElementById('unmute-banner').style.display = 'none';
                    }}
                  >
                    🔊 Включить звук
                  </button>
                </div>
              </div>
            )}

            {/* ── Веб-камера преподавателя ── */}
            {isTeacherVideoActive && teacherVideoStream && (
              <div className="screen-share-area">
                <div className="screen-share-header" style={{ backgroundColor: '#7B61FF' }}>
                  <span>📹 Веб-камера преподавателя: {teacherName}</span>
                </div>
                {/* Отдельный ref — не конфликтует с экраном */}
                <video
                  ref={teacherCameraVideoRef}
                  autoPlay
                  playsInline
                  className="screen-share-video"
                />
              </div>
            )}

            {/* ── Своя камера студента ── */}
            {isVideoEnabled && localVideoStream && (
              <div className="screen-share-area">
                <div className="screen-share-header" style={{ backgroundColor: '#10B981' }}>
                  <span>
                    Ваша веб-камера {!isAudioEnabled && '(звук выключен)'}
                  </span>
                </div>
                <video
                  autoPlay
                  playsInline
                  muted
                  className="screen-share-video"
                  style={{ transform: 'scaleX(-1)' }}
                  ref={el => { if (el) el.srcObject = localVideoStream; }}
                />
              </div>
            )}

            {/* ── Свой экран студента ── */}
            {isSharingScreen && localStream && (
              <div className="screen-share-area">
                <div className="screen-share-header" style={{ backgroundColor: '#F59E0B' }}>
                  <span>Ваш экран (показывается преподавателю)</span>
                </div>
                <video
                  autoPlay
                  playsInline
                  muted
                  className="screen-share-video"
                  ref={el => { if (el) el.srcObject = localStream; }}
                />
              </div>
            )}

            <div className="info-card">
              <h4 className="info-title">
                Информация о подключении
              </h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Статус подключения</div>
                  <div className={`stat-value ${connectionStatus === 'connected' ? 'connected' : 'disconnected'}`}>
                    {connectionStatus === 'connected' ? 'Подключен' : 'Не подключен'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Преподаватель</div>
                  <div className="stat-value">
                    {teacherPresent ? teacherName : 'Не подключен'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Участников</div>
                  <div className="stat-value">{participants.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Сообщений</div>
                  <div className="stat-value">{messages.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Экран преподавателя</div>
                  <div className={`stat-value ${teacherScreenActive ? 'active' : ''}`}>
                    {teacherScreenActive ? 'Показывается' : 'Не активен'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Ваш экран</div>
                  <div className={`stat-value ${isSharingScreen ? 'active' : ''}`}>
                    {isSharingScreen ? 'Показывается' : 'Не активен'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Ваша камера</div>
                  <div className={`stat-value ${isVideoEnabled ? 'active' : ''}`}>
                    {isVideoEnabled ? 'Включена' : 'Выключена'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Ваш звук</div>
                  <div className={`stat-value ${isAudioEnabled ? 'connected' : 'disconnected'}`}>
                    {isAudioEnabled ? 'Включен' : 'Выключен'}
                  </div>
                </div>
              </div>
              
              <div className="action-buttons">
                <button 
                  onClick={() => { 
                    trackActivity('need_help'); 
                    setNewMessage('Нужна помощь: '); 
                  }} 
                  className="btn-help"
                >
                  Нужна помощь
                </button>
                
                {!isVideoEnabled ? (
                  <button onClick={startStudentVideo} className="btn-video">
                    Включить камеру
                  </button>
                ) : (
                  <button onClick={stopStudentVideo} className="btn-video-off">
                    Выключить камеру
                  </button>
                )}
                
                {isVideoEnabled && (
                  <button onClick={toggleStudentAudio} className={isAudioEnabled ? 'btn-audio' : 'btn-audio-off'}>
                    {isAudioEnabled ? 'Выключить звук' : 'Включить звук'}
                  </button>
                )}
              </div>

              {isSharingScreen && (
                <button 
                  onClick={stopStudentScreenShare}
                  className="btn-stop-share"
                >
                  Остановить трансляцию своего экрана
                </button>
              )}
            </div>
          </div>

          <div className="sidebar">
            <div className="participants-section">
              <div className="participants-title">
                Участники
                <span className="participants-count">{participants.length}</span>
              </div>
              <div>
                {participants.map((participant) => (
                  <div key={`${participant.userType}-${participant.userId}-${participant.socketId}`} className="participant-item">
                    <div className={`participant-avatar ${participant.userType === 'teacher' ? 'teacher' : 'student'}`} />
                    <div className="participant-info">
                      <div className="participant-name">{participant.userName}</div>
                      <div className="participant-role">
                        {participant.userType === 'teacher' ? 'Преподаватель' : 'Студент'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chat-section">
              <div className="chat-title">
                Чат вебинара
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
                  messages.map((msg, index) => {
                    const isMentioned = checkIfMentioned(msg.text);
                    return (
                      <div 
                        key={`msg-${index}-${msg.timestamp}`} 
                        className="message-item"
                        style={{
                          backgroundColor: isMentioned ? '#F5F3FF' : 'white',
                          borderLeft: isMentioned ? '4px solid #7B61FF' : '1px solid #e5e7eb',
                          marginBottom: '16px',
                          padding: '12px',
                          borderRadius: '12px'
                        }}
                      >
                        <div className="message-header">
                          <span className="message-sender" style={{ color: msg.senderType === 'teacher' ? '#7B61FF' : '#111827' }}>
                            {msg.senderName}
                            {msg.senderType === 'teacher' && (
                              <span style={{
                                fontSize:'10px', 
                                background:'#7B61FF', 
                                color:'white', 
                                padding:'1px 4px', 
                                borderRadius:'4px', 
                                marginLeft:'5px'
                              }}>
                                Преподаватель
                              </span>
                            )}
                          </span>
                          <span className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="message-text" style={{ marginTop: '4px' }}>
                          {highlightMentions(msg.text)}
                        </div>
                        
                        {isMentioned && (
                          <div style={{
                            fontSize:'11px', 
                            color:'#7B61FF', 
                            marginTop:'6px', 
                            fontWeight:'bold'
                          }}>
                            Вас упомянули в этом сообщении
                          </div>
                        )}
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

        {incomingScreenRequest && (
          <div className="request-modal">
            <div className="modal-content">
              <h3 className="modal-title">Запрос на показ экрана</h3>
              <p className="modal-text">
                Преподаватель {incomingScreenRequest.teacherName} просит показать ваш экран.
              </p>
              <div className="modal-buttons">
                <button
                  onClick={() => startStudentScreenShare(incomingScreenRequest.teacherSocketId)}
                  className="modal-allow"
                >
                  Разрешить
                </button>
                <button
                  onClick={() => setIncomingScreenRequest(null)}
                  className="modal-deny"
                >
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WebinarStudentView;