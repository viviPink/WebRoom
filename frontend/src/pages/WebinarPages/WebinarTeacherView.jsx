import React, { useState, useRef, useEffect } from 'react';
import Participants from '../../components/common/Participants';
import Chat from '../../components/common/Chat';
import AudioRecorder from '../../components/webinar/AudioRecorder';
import VideoRecorder from '../../components/webinar/VideoRecorder';
import TranscriptionTab from '../../components/common/TranscriptionTab';
import MaterialsManager from '../../components/teacher/MaterialsManager';
import PastMaterialsView from '../../components/common/PastMaterialsView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

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
  studentScreenVideoRef,
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
  handleTranscriptionUpdate,
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
  activeStudentVideo,
  startTeacherVideo,
  stopTeacherVideo,
  toggleTeacherAudio,
  setActiveStudentVideo,
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
  pastMaterials,
  showPastMaterials,
  setShowPastMaterials,
  loadingMaterials,
  fetchPastMaterials,
  sessionInfo,
  generateAISummary,
  kickStudent,
  studentAudioStreams = new Map(),
  activeStudentAudio,
  setActiveStudentAudio,
  playbackVideoRef,
}) => {
  const [activeTab, setActiveTab] = useState('broadcast');
  const [showPlaybackPicker, setShowPlaybackPicker] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [selectedRecordingForAI, setSelectedRecordingForAI] = useState(null);
  const [aiSummaryContent, setAiSummaryContent] = useState('');
  const [selectedAIAction, setSelectedAIAction] = useState('summary');
  const [showTranscriptionEditor, setShowTranscriptionEditor] = useState(false);
  const [selectedRecordingForEdit, setSelectedRecordingForEdit] = useState(null);

  const [lectureComment, setLectureComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);

  const audioRecorderRef = useRef(null);
  
  const isScreenMode = isTeacherBroadcasting || activeStudentScreen;

  const tabs = [
    { id: 'broadcast', label: 'Трансляция' },
    { id: 'students', label: 'Студенты', count: studentsForMonitoring?.length || 0 },
    { id: 'recordings', label: 'Записи', count: (recordings?.length || 0) + (videoRecordings?.length || 0) },
    { id: 'materials', label: 'Материалы' },
    { id: 'past', label: 'Прошлые занятия' }
  ];

  const handleSaveRecordingMetadata = async (recording, newTitle, newDescription) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/audio/${recording.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDescription })
      });
      if (response.ok) {
        fetchRecordings();
        setEditingMetadata(null);
      }
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const openTranscriptionEditor = (recording) => {
    setSelectedRecordingForEdit(recording);
    setShowTranscriptionEditor(true);
  };

  const closeTranscriptionEditor = () => {
    setShowTranscriptionEditor(false);
    setSelectedRecordingForEdit(null);
    fetchRecordings();
  };

  const handleSaveLectureComment = async () => {
    if (!lectureComment.trim()) return;
    setSavingComment(true);
    try {
      await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: lectureComment, teacherId: teacher.id })
      });
      setCommentSaved(true);
      setTimeout(() => setCommentSaved(false), 3000);
    } catch (err) {
      console.error('Ошибка сохранения комментария:', err);
    } finally {
      setSavingComment(false);
    }
  };

  const renderStudentWithControls = (student) => (
    <div key={`student-${student.userId}-${student.socketId}`} className="student-card">
      <div className="student-info">
        <div className="student-status" />
        <div className="student-details">
          <div className="student-name">{student.userName}</div>
          
          {studentAudioStreams && studentAudioStreams.has(student.socketId) && (
            <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>
              Микрофон включён
            </div>
          )}
        </div>
      </div>
      <div className="student-actions">
        <button
          onClick={() => { setNewMessage('@' + student.userName + ' '); setActiveTab('chat'); }}
          className="btn-secondary btn-sm"
        >
          Написать
        </button>
        <button
          onClick={() => requestStudentScreen(student.socketId, student.userName)}
          disabled={activeStudentScreen?.studentSocketId === student.socketId}
          className={`btn-primary btn-sm ${activeStudentScreen?.studentSocketId === student.socketId ? 'disabled' : ''}`}
        >
          {activeStudentScreen?.studentSocketId === student.socketId ? 'Экран запрошен' : 'Запросить экран'}
        </button>
        <button
          onClick={() => kickStudent(student.socketId, student.userName)}
          className="btn-danger btn-sm"
        >
          Выгнать
        </button>
      </div>
    </div>
  );

  const formatPlaybackTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderBroadcastControls = () => (
    <div className="broadcast-controls-bar">
      {isPlaybackBroadcasting ? null : isTeacherBroadcasting ? (
        <button onClick={stopTeacherScreenShare} className="ctrl-btn ctrl-btn-danger">
          Стоп экран
        </button>
      ) : (
        <button onClick={startTeacherScreenShare} className="ctrl-btn ctrl-btn-primary">
          Экран
        </button>
      )}

      {isVideoEnabled ? (
        <>
          <button onClick={stopTeacherVideo} className="ctrl-btn ctrl-btn-danger">
            Камера выкл.
          </button>
          <button onClick={toggleTeacherAudio} className={isAudioEnabled ? 'ctrl-btn ctrl-btn-muted' : 'ctrl-btn ctrl-btn-primary'}>
            {isAudioEnabled ? 'Звук вкл.' : 'Звук выкл.'}
          </button>
        </>
      ) : (
        <button onClick={startTeacherVideo} className="ctrl-btn ctrl-btn-secondary" disabled={isPlaybackBroadcasting}>
          Камера
        </button>
      )}
    </div>
  );

  return (
    <div className="webinar-container">
      {showTranscriptionEditor && selectedRecordingForEdit && (
        <TranscriptionTab
          recordingId={selectedRecordingForEdit.id}
          onClose={closeTranscriptionEditor}
          onSave={handleSaveTranscription}
        />
      )}

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
          padding: 12px 32px;
          background-color: #fff;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .logo-section { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .logo { width: 36px; height: 36px; background-color: #7B61FF; border-radius: 10px; }
        .title { font-size: 18px; font-weight: 700; color: #111827; }
        .session-badge {
          padding: 3px 10px;
          background-color: #f3f4f6;
          border-radius: 20px;
          font-size: 12px;
          color: #6B7280;
        }
        .teacher-name { color: #374151; font-size: 13px; font-weight: 500; }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          justify-content: center;
          flex-wrap: wrap;
        }

        .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }

        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: ${connectionStatus === 'connected' ? '#10B981' : '#EF4444'};
          margin-right: 6px;
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
        .btn-danger:hover { background-color: #DC2626; }

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
        .btn-secondary:hover { background-color: #e5e7eb; }

        .btn-primary {
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
        .btn-primary:hover:not(:disabled) { background-color: #6750E0; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

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
        .btn-outline:hover { background-color: rgba(255,255,255,0.15); }

        .btn-sm { padding: 6px 12px; font-size: 12px; }
        .btn-sm.btn-primary { border-radius: 8px; }
        .btn-sm.btn-secondary { border-radius: 8px; }
        .btn-sm.btn-danger { border-radius: 8px; }

        .broadcast-controls-bar {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ctrl-btn {
          padding: 7px 14px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .ctrl-btn-primary { background: #7B61FF; color: white; }
        .ctrl-btn-primary:hover:not(:disabled) { background: #6750E0; }
        .ctrl-btn-danger { background: #EF4444; color: white; }
        .ctrl-btn-danger:hover { background: #DC2626; }
        .ctrl-btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .ctrl-btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
        .ctrl-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ctrl-btn-muted { background: #6B7280; color: white; }
        .ctrl-btn-muted:hover { background: #4B5563; }

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
        .tab-button.active { background-color: #7B61FF; color: white; }
        .tab-button:not(.active):hover { background-color: #f3f4f6; color: #111827; }
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
        .tab-button.active .tab-badge { background-color: white; color: #7B61FF; }

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

        .video-overlay-controls {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          gap: 8px;
          z-index: 10;
        }

        .playback-controls-bar {
          padding: 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          background-color: #1a1a2e;
          flex-wrap: wrap;
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

        .card-body { padding: 18px; }

        .students-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .student-card {
          padding: 14px;
          background-color: #f9fafb;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
        }
        .student-info { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .student-status { width: 8px; height: 8px; background-color: #10B981; border-radius: 50%; flex-shrink: 0; }
        .student-details { flex: 1; }
        .student-name { font-size: 13px; font-weight: 600; color: #111827; }
        .student-id { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
        .student-actions { display: flex; gap: 6px; flex-wrap: wrap; }

        .recordings-list { display: flex; flex-direction: column; gap: 12px; }

        .recording-item {
          padding: 14px;
          background-color: #f9fafb;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
        }
        .recording-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .recording-info { flex: 1; }
        .recording-title {
          font-weight: 600;
          font-size: 13px;
          color: #111827;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .recording-meta { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
        .recording-actions { display: flex; gap: 6px; flex-wrap: wrap; }

        .transcription-badge {
          padding: 1px 8px;
          background-color: #10B981;
          color: white;
          font-size: 10px;
          border-radius: 20px;
          font-weight: 500;
        }

        .transcription-preview {
          margin-top: 10px;
          padding: 10px 12px;
          background-color: #f3f4f6;
          border-radius: 10px;
          max-height: 100px;
          overflow-y: auto;
        }
        .transcription-preview p {
          margin: 0;
          font-size: 12px;
          color: #374151;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .participants-section {
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .participants-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          background-color: #fafafa;
        }
        .participants-header h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
        }
        .participants-list { overflow-y: auto; max-height: 220px; }

        .participant-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
          color: #374151;
        }
        .participant-row:last-child { border-bottom: none; }
        .participant-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .participant-dot.teacher { background-color: #7B61FF; }
        .participant-dot.student { background-color: #10B981; }
        .participant-role { font-size: 11px; color: #9CA3AF; margin-left: auto; }

        .chat-section {
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .chat-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          background-color: #fafafa;
        }
        .chat-header h3 { margin: 0; font-size: 13px; font-weight: 600; color: #6B7280; }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 180px;
          max-height: 360px;
        }
        .empty-chat { text-align: center; padding: 20px; color: #9CA3AF; font-size: 13px; }
        .message-item { padding: 8px 10px; background-color: #f9fafb; border-radius: 10px; }
        .message-item.help-request { background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 3px solid #F59E0B; }
        .message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
        .message-sender { font-size: 12px; font-weight: 600; color: #7B61FF; }
        .message-time { font-size: 11px; color: #9CA3AF; }
        .message-text { font-size: 13px; color: #111827; }
        .chat-input-area { padding: 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; }
        .chat-input {
          flex: 1;
          padding: 9px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }
        .chat-input:focus { border-color: #7B61FF; box-shadow: 0 0 0 3px rgba(123,97,255,0.08); }
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
        .send-button:disabled { opacity: 0.5; cursor: not-allowed; }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #9CA3AF;
          font-size: 13px;
        }

        .pending-badge {
          padding: 3px 10px;
          background-color: #FEF3C7;
          color: #92400E;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .playback-picker-card {
          background-color: #fff;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .playback-picker-header {
          padding: 12px 18px;
          background-color: #fafafa;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .playback-picker-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: #111827; }
        .playback-picker-list {
          max-height: 320px;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .playback-picker-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.2s;
          gap: 10px;
        }
        .playback-picker-item:hover { border-color: #7B61FF; background-color: #faf9ff; }
        .playback-picker-item-info { flex: 1; min-width: 0; }
        .playback-picker-item-name {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .playback-picker-item-meta { font-size: 11px; color: #6B7280; margin-top: 2px; }

        .type-badge {
          display: inline-block;
          padding: 1px 7px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          margin-left: 6px;
        }
        .type-badge-video { background-color: #FEE2E2; color: #991B1B; }
        .type-badge-audio { background-color: #DBEAFE; color: #1E40AF; }

        .btn-broadcast {
          padding: 7px 14px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .btn-broadcast:hover { background-color: #6750E0; }

        .materials-comment-block {
          padding: 16px 18px;
          background-color: #fafafa;
          border-top: 1px solid #e5e7eb;
        }
        .materials-comment-block label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .materials-comment-textarea {
          width: 100%;
          min-height: 90px;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          background-color: #fff;
          color: #111827;
        }
        .materials-comment-textarea:focus { border-color: #7B61FF; box-shadow: 0 0 0 3px rgba(123,97,255,0.08); }
        .materials-comment-actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .comment-saved-label { font-size: 12px; color: #10B981; font-weight: 500; }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: white;
          border-radius: 20px;
          padding: 24px;
          width: 90%;
          max-width: 480px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        }
        .modal-content h3 { margin: 0 0 18px 0; font-size: 18px; color: #111827; }
        .modal-field { margin-bottom: 14px; }
        .modal-field label { display: block; margin-bottom: 6px; font-weight: 500; color: #374151; font-size: 13px; }
        .modal-field input, .modal-field textarea {
          width: 100%;
          padding: 9px 11px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
        }
        .modal-field textarea { resize: vertical; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

        @media (max-width: 1100px) {
          .main-layout { flex-direction: column; padding: 16px 20px; }
          .sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; }
          .participants-section, .chat-section { flex: 1; min-width: 280px; }
        }
        @media (max-width: 640px) {
          .header { padding: 12px 16px; }
          .main-layout { padding: 12px 16px; }
          .students-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="header">
        <div className="logo-section">
          <div className="logo"></div>
          <span className="title">ВебРум</span>
          <span className="session-badge">Сессия {sessionId}</span>
          {sessionInfo?.courseTitle && (
            <span className="session-badge" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
              {sessionInfo.courseTitle}
            </span>
          )}
        </div>
        <div className="header-controls">
          {renderBroadcastControls()}
        </div>
        <div className="header-right">
          <div>
            <span className="status-dot" />
            <span className="teacher-name">{teacher?.name}</span>
          </div>
          <button onClick={finishWebinar} className="btn-danger">
            Завершить
          </button>
          <button onClick={onExit} className="btn-secondary">
            Выйти
          </button>
        </div>
      </div>

      <div className="main-layout">
        <div className="content-area">
          {((isVideoEnabled && localVideoStream) || (isTeacherBroadcasting && localStream)) && !isPlaybackBroadcasting && (
            <div className="video-block">
              <div className="video-header" style={{ backgroundColor: isTeacherBroadcasting ? '#1F2937' : '#065F46' }}>
                <span>
                  {isTeacherBroadcasting ? 'Трансляция экрана' : 'Веб-камера'}
                  {!isAudioEnabled && ' — звук выкл.'}
                </span>
                {isTeacherBroadcasting && !isPlaybackBroadcasting && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={toggleTeacherAudio} className="btn-outline">
                      {isAudioEnabled ? 'Звук вкл.' : 'Звук выкл.'}
                    </button>
                    <button onClick={stopTeacherScreenShare} className="btn-outline" style={{ color: '#FCA5A5', borderColor: '#FCA5A5' }}>
                      Стоп трансляция
                    </button>
                  </div>
                )}
                {!isTeacherBroadcasting && isVideoEnabled && (
                  <button onClick={stopTeacherVideo} className="btn-outline">Выключить камеру</button>
                )}
              </div>
              <div className="video-container" style={{ position: 'relative' }}>
                <video
                  ref={teacherVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={!isTeacherBroadcasting && isVideoEnabled ? { transform: 'scaleX(-1)' } : {}}
                />
                <button
                  onClick={() => { if (teacherVideoRef.current) { teacherVideoRef.current.requestFullscreen?.() || teacherVideoRef.current.webkitRequestFullscreen?.(); } }}
                  className="btn-outline"
                  style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 10 }}
                >
                  Полный экран
                </button>
              </div>
            </div>
          )}

          {isPlaybackBroadcasting && playbackRecording && (
            <div className="video-block">
              <div className="video-header" style={{ backgroundColor: '#7B61FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="live-dot" />
                  <span>Трансляция записи студентам: {playbackRecording.title || playbackRecording.courseTitle || 'Запись'}</span>
                </div>
                <button onClick={stopPlaybackBroadcast} className="btn-outline" style={{ color: '#FCA5A5', borderColor: '#FCA5A5' }}>
                  Остановить трансляцию
                </button>
              </div>
              <div className="video-container" style={{ position: 'relative' }}>
                <video
                  ref={playbackVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  controls
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <button
                  onClick={() => { if (playbackVideoRef.current) { playbackVideoRef.current.requestFullscreen?.(); } }}
                  className="btn-outline"
                  style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 10 }}
                >
                  Полный экран
                </button>
              </div>
              <div className="playback-controls-bar">
                {playbackState === 'paused' ? (
                  <button onClick={resumePlaybackBroadcast} className="ctrl-btn ctrl-btn-primary">Продолжить</button>
                ) : (
                  <button onClick={pausePlaybackBroadcast} className="ctrl-btn ctrl-btn-primary">Пауза</button>
                )}
                <button onClick={stopPlaybackBroadcast} className="ctrl-btn ctrl-btn-danger">Остановить</button>
              </div>
            </div>
          )}

          {activeStudentScreen && (
            <div className="video-block">
              <div className="video-header" style={{ backgroundColor: '#1F2937' }}>
                <span>Экран студента: {activeStudentScreen.studentName}</span>
                <button onClick={stopWatchingStudentScreen} className="btn-outline">Остановить</button>
              </div>
              <div className="video-container">
                <video ref={studentScreenVideoRef} autoPlay playsInline muted={false} />
              </div>
              {studentAudioStreams && studentAudioStreams.has(activeStudentScreen.studentSocketId) && (
                <div className="unmute-banner" style={{ backgroundColor: '#1F2937', color: 'white', padding: '8px 16px' }}>
                  <span>Студент говорит</span>
                </div>
              )}
            </div>
          )}

          {activeStudentVideo && (
            <div className="video-block">
              <div className="video-header" style={{ backgroundColor: '#1F2937' }}>
                <span>Камера студента: {activeStudentVideo.studentName}</span>
                <button onClick={() => setActiveStudentVideo(null)} className="btn-outline">Закрыть</button>
              </div>
              <div className="video-container">
                <video ref={studentVideoRef} autoPlay playsInline />
              </div>
            </div>
          )}

          {showPlaybackPicker && (
            <div className="playback-picker-card">
              <div className="playback-picker-header">
                <h3>Выберите запись для трансляции</h3>
                <button onClick={() => setShowPlaybackPicker(false)} className="btn-secondary btn-sm">Закрыть</button>
              </div>
              {[...(videoRecordings || []), ...(recordings || [])].length === 0 ? (
                <div className="empty-state">Нет доступных записей</div>
              ) : (
                <div className="playback-picker-list">
                  {[...(videoRecordings || []), ...(recordings || [])].map(rec => (
                    <div key={rec.id} className="playback-picker-item">
                      <div className="playback-picker-item-info">
                        <div className="playback-picker-item-name">
                          {rec.title || rec.courseTitle || 'Запись вебинара'}
                          <span className={`type-badge ${rec.type === 'audio' ? 'type-badge-audio' : 'type-badge-video'}`}>
                            {rec.type === 'audio' ? 'Аудио' : 'Видео'}
                          </span>
                        </div>
                        <div className="playback-picker-item-meta">
                          {new Date(rec.createdAt).toLocaleDateString()}
                          {rec.duration && ` · ${formatTime(rec.duration)}`}
                        </div>
                      </div>
                      <button
                        className="btn-broadcast"
                        onClick={() => { setShowPlaybackPicker(false); startPlaybackBroadcast(rec); }}
                      >
                        Транслировать
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
                {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
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
                    studentScreenStream={null}
                    activeVideoSource={'local'}
                    socketRef={socketRef}
                    audioRecorderRef={audioRecorderRef}
                    onRecordingStarted={() => {}}
                    onRecordingStopped={() => {}}
                    onRecordingSaved={fetchRecordings}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>Аудиозапись лекции</h3>
                </div>
                <div className="card-body">
                  <AudioRecorder
                    ref={audioRecorderRef}
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
                <h3>Студенты ({studentsForMonitoring?.length || 0})</h3>
                {pendingScreenRequests?.length > 0 && (
                  <div className="pending-badge">Ожидание: {pendingScreenRequests.length}</div>
                )}
              </div>
              <div className="card-body">
                {!studentsForMonitoring || studentsForMonitoring.length === 0 ? (
                  <div className="empty-state">Нет подключённых студентов</div>
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
                <button onClick={fetchRecordings} className="btn-secondary btn-sm">Обновить</button>
              </div>
              <div className="card-body">
                {(!recordings || recordings.length === 0) && (!videoRecordings || videoRecordings.length === 0) ? (
                  <div className="empty-state">
                    <p>Нет записей</p>
                    <p style={{ fontSize: '12px', marginTop: '6px' }}>Записи появятся после начала записи</p>
                  </div>
                ) : (
                  <div className="recordings-list">
                    {recordings?.map(recording => (
                      <div key={recording.id} className="recording-item">
                        <div className="recording-header">
                          <div className="recording-info">
                            <div className="recording-title">
                              Аудио: {recording.title || 'Без названия'}
                              {recording.transcription && <span className="transcription-badge">Конспект</span>}
                            </div>
                            <div className="recording-meta">{recording.description || 'Без описания'}</div>
                            <div className="recording-meta">
                              {new Date(recording.createdAt).toLocaleString()} {recording.duration ? '· ' + formatTime(recording.duration) : ''}
                            </div>
                          </div>
                          <div className="recording-actions">
                            <button onClick={() => playRecording(recording.filePath)} className="btn-secondary btn-sm">Слушать</button>
                            <button onClick={() => deleteRecording(recording.id)} className="btn-secondary btn-sm">Удалить</button>
                            {!recording.transcription ? (
                              <button
                                onClick={() => transcribeRecording(recording.id)}
                                disabled={transcribing[recording.id]}
                                className="btn-primary btn-sm"
                              >
                                {transcribing[recording.id] ? 'Обработка...' : 'Распознать'}
                              </button>
                            ) : (
                              <button onClick={() => openTranscriptionEditor(recording)} className="btn-primary btn-sm">Редактировать</button>
                            )}
                          </div>
                        </div>
                        {(recording.transcription || transcriptions?.[recording.id]) && (
                          <div className="transcription-preview">
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
                              Видео: {recording.title || 'Без названия'}
                              {recording.transcription && <span className="transcription-badge">Конспект</span>}
                            </div>
                            <div className="recording-meta">{recording.description || 'Без описания'}</div>
                            <div className="recording-meta">
                              {new Date(recording.createdAt).toLocaleString()} {recording.duration ? '· ' + formatTime(recording.duration) : ''}
                            </div>
                          </div>
                          <div className="recording-actions">
                            <button onClick={() => playVideoRecording(recording.filePath)} className="btn-primary btn-sm">Смотреть</button>
                            <button onClick={() => deleteRecording(recording.id)} className="btn-secondary btn-sm">Удалить</button>
                            {!recording.transcription ? (
                              <button
                                onClick={() => transcribeRecording(recording.id)}
                                disabled={transcribing[recording.id]}
                                className="btn-primary btn-sm"
                              >
                                {transcribing[recording.id] ? 'Обработка...' : 'Распознать'}
                              </button>
                            ) : (
                              <button onClick={() => openTranscriptionEditor(recording)} className="btn-primary btn-sm">Редактировать</button>
                            )}
                          </div>
                        </div>
                        {(recording.transcription || transcriptions?.[recording.id]) && (
                          <div className="transcription-preview">
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

          {activeTab === 'materials' && (
            <div className="card">
              <MaterialsManager
                sessionId={sessionId}
                teacherId={teacher.id}
                courseId={sessionInfo?.courseId}
                isActive={true}
              />
              <div className="materials-comment-block">
                <label>Комментарий к лекции</label>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', marginTop: 0 }}>
                  Оставьте заметку, ссылку или текст — студенты увидят это вместе с материалами.
                </p>
                <textarea
                  className="materials-comment-textarea"
                  placeholder="Например: https://docs.google.com/... или «Прочитайте главу 3 перед следующим занятием»"
                  value={lectureComment}
                  onChange={(e) => setLectureComment(e.target.value)}
                />
                <div className="materials-comment-actions">
                  <button
                    onClick={handleSaveLectureComment}
                    disabled={savingComment || !lectureComment.trim()}
                    className="btn-primary btn-sm"
                  >
                    {savingComment ? 'Сохранение...' : 'Сохранить комментарий'}
                  </button>
                  {commentSaved && <span className="comment-saved-label">Сохранено</span>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'past' && (
            <PastMaterialsView
              sessionId={sessionId}
              userType="teacher"
              onPlaybackStart={(recording) => {
                startPlaybackBroadcast(recording);
                setShowPlaybackPicker(false);
              }}
            />
          )}
        </div>

        <div className="sidebar">
          <div className="participants-section">
            <div className="participants-header">
              <h3>Участники ({participants?.length || 0})</h3>
            </div>
            <div className="participants-list">
              {participants && participants.map(p => (
                <div key={`${p.userType}-${p.userId}-${p.socketId}`} className="participant-row">
                  <div className={`participant-dot ${p.userType}`} />
                  <span style={{ fontSize: '13px', color: '#111827' }}>{p.userName}</span>
                  {p.userType === 'student' && studentAudioStreams && studentAudioStreams.has(p.socketId) && (
                    <span style={{ fontSize: '10px', color: '#10B981', marginLeft: '4px' }}>🎤</span>
                  )}
                  <span className="participant-role">{p.userType === 'teacher' ? 'Преподаватель' : 'Студент'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-section">
            <div className="chat-header">
              <h3>Чат ({messages?.length || 0})</h3>
            </div>
            <div className="chat-messages">
              {!messages || messages.length === 0 ? (
                <div className="empty-chat">Сообщений пока нет</div>
              ) : (
                messages.map((msg, i) => {
                  const isHelpRequest = msg.text && msg.text.includes('НУЖНА ПОМОЩЬ');
                  return (
                    <div key={`msg-${i}-${msg.timestamp}`} className={`message-item${isHelpRequest ? ' help-request' : ''}`}>
                      <div className="message-header">
                        <span className="message-sender">{msg.senderName}</span>
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="message-text">{msg.text}</div>
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
            </div>
          </div>
        </div>
      </div>

      {editingMetadata && (
        <div className="modal-overlay" onClick={() => setEditingMetadata(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Редактировать запись</h3>
            <div className="modal-field">
              <label>Название</label>
              <input
                type="text"
                defaultValue={editingMetadata.title || ''}
                id="recording-title-input"
              />
            </div>
            <div className="modal-field">
              <label>Описание</label>
              <textarea
                defaultValue={editingMetadata.description || ''}
                rows={3}
                id="recording-description-input"
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  handleSaveRecordingMetadata(
                    editingMetadata,
                    document.getElementById('recording-title-input').value,
                    document.getElementById('recording-description-input').value
                  );
                }}
                className="btn-primary"
              >
                Сохранить
              </button>
              <button onClick={() => setEditingMetadata(null)} className="btn-secondary">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebinarTeacherView;