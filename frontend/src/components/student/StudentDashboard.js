import React, { useState, useEffect } from 'react';
import StudentDashboardView from './StudentDashboardView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const StudentDashboard = ({ student, onLogout, onEnterWebinar }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [missedSessions, setMissedSessions] = useState([]);
  const [loadingMissed, setLoadingMissed] = useState(false);
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedRecordingForSummary, setSelectedRecordingForSummary] = useState(null);
  const [selectedRecordingForPlayback, setSelectedRecordingForPlayback] = useState(null);
  const [reviewingSessionId, setReviewingSessionId] = useState(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/sessions/active`);
      if (!response.ok) throw new Error('Ошибка загрузки сессий');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Ошибка загрузки сессий:', err);
      setError('Ошибка загрузки сессий');
    } finally {
      setLoading(false);
    }
  };

  const loadRecordings = async () => {
    try {
      setLoadingRecordings(true);
      const response = await fetch(`${API_BASE_URL}/api/audio/student/${student.id}`);
      if (!response.ok) throw new Error('Ошибка загрузки записей');
      const data = await response.json();
      setRecordings(data);
    } catch (err) {
      console.error('Ошибка загрузки записей:', err);
    } finally {
      setLoadingRecordings(false);
    }
  };

  const loadMissedSessions = async () => {
    try {
      setLoadingMissed(true);
      const response = await fetch(`${API_BASE_URL}/api/student/${student.id}/missed-sessions`);
      if (!response.ok) throw new Error('Ошибка загрузки пропущенных занятий');
      const data = await response.json();
      
      // Убеждаемся, что materials есть у каждой сессии
      const sessionsWithMaterials = data.map(session => ({
        ...session,
        materials: session.materials || []
      }));
      
      setMissedSessions(sessionsWithMaterials);
    } catch (err) {
      console.error('Ошибка загрузки пропущенных занятий:', err);
    } finally {
      setLoadingMissed(false);
    }
  };

  const loadScheduledSessions = async () => {
    try {
      setLoadingScheduled(true);
      const response = await fetch(`${API_BASE_URL}/api/student/${student.id}/scheduled-sessions`);
      if (!response.ok) throw new Error('Ошибка загрузки запланированных занятий');
      const data = await response.json();
      setScheduledSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Ошибка загрузки запланированных занятий:', err);
      setScheduledSessions([]);
    } finally {
      setLoadingScheduled(false);
    }
  };

  const handleJoinSession = async () => {
    if (!selectedSession) {
      setError('Выберите вебинар');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/attendance/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.full_name,
          groupName: student.group,
          sessionId: selectedSession
        })
      });

      if (!response.ok) throw new Error('Ошибка присоединения');
      
      setIsJoined(true);
      onEnterWebinar(selectedSession);
    } catch (err) {
      console.error('Ошибка присоединения:', err);
      setError('Ошибка присоединения к вебинару');
    } finally {
      setLoading(false);
    }
  };

  const playRecording = (recording) => {
    setSelectedRecordingForPlayback(recording);
  };

  const handleClosePlayer = () => {
    setSelectedRecordingForPlayback(null);
  };

  const downloadRecording = (filePath, title) => {
    const downloadUrl = `${API_BASE_URL}${filePath}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${title || 'запись'}_${new Date().toISOString().slice(0, 19)}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadMaterial = (filePath, originalName) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${filePath}`;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openSummaryModal = (recording) => {
    setSelectedRecordingForSummary(recording);
    setSummaryModalOpen(true);
  };

  const closeSummaryModal = () => {
    setSummaryModalOpen(false);
    setSelectedRecordingForSummary(null);
  };

  const handleMarkAsReviewed = async (session) => {
    setReviewingSessionId(session.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/${student.id}/missed/${session.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await loadMissedSessions();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Ошибка при отметке:', err);
      return false;
    } finally {
      setReviewingSessionId(null);
    }
  };

  const handleUnmarkAsReviewed = async (session) => {
    setReviewingSessionId(session.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/${student.id}/missed/${session.id}/review`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await loadMissedSessions();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Ошибка при снятии отметки:', err);
      return false;
    } finally {
      setReviewingSessionId(null);
    }
  };

  useEffect(() => {
    loadSessions();
    loadRecordings();
    loadMissedSessions();
    loadScheduledSessions();
  }, []);

  return (
    <StudentDashboardView
      student={student}
      onLogout={onLogout}
      onEnterWebinar={onEnterWebinar}
      sessions={sessions}
      selectedSession={selectedSession}
      error={error}
      loading={loading}
      isJoined={isJoined}
      recordings={recordings}
      loadingRecordings={loadingRecordings}
      missedSessions={missedSessions}
      loadingMissed={loadingMissed}
      downloadRecording={downloadRecording}
      downloadMaterial={downloadMaterial}
      openSummaryModal={openSummaryModal}
      closeSummaryModal={closeSummaryModal}
      selectedRecordingForSummary={selectedRecordingForSummary}
      summaryModalOpen={summaryModalOpen}
      selectedRecordingForPlayback={selectedRecordingForPlayback}
      handleClosePlayer={handleClosePlayer}
      setSelectedSession={setSelectedSession}
      setError={setError}
      handleJoinSession={handleJoinSession}
      loadSessions={loadSessions}
      loadMissedSessions={loadMissedSessions}
      scheduledSessions={scheduledSessions}
      loadingScheduled={loadingScheduled}
      loadScheduledSessions={loadScheduledSessions}
      playRecording={playRecording}
      onMarkAsReviewed={handleMarkAsReviewed}
      onUnmarkAsReviewed={handleUnmarkAsReviewed}
      reviewingSessionId={reviewingSessionId}
    />
  );
};

export default StudentDashboard;