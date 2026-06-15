import React, { useState, useEffect } from 'react';
import TeacherDashboardView from './TeacherDashboardView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const TeacherDashboard = ({ teacher, onLogout, onEnterWebinar }) => {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]); // МАССИВ для нескольких групп
  const [sessionDescription, setSessionDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);

  const loadCompletedSessionsCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/sessions/completed/count`);
      if (response.ok) {
        const data = await response.json();
        setCompletedSessionsCount(data.count);
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  };

  const loadTeacherGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/groups-subjects`);
      if (!response.ok) throw new Error('Ошибка загрузки групп преподавателя');
      const data = await response.json();
      setTeacherGroups(data);
      return data;
    } catch (err) {
      console.error('Ошибка загрузки групп преподавателя:', err);
      return [];
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/courses`);
      if (!response.ok) throw new Error('Ошибка загрузки предметов');
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error('Ошибка загрузки предметов:', err);
      setError('Ошибка загрузки предметов');
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/sessions/active`);
      if (!response.ok) throw new Error('Ошибка загрузки сессий');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Ошибка загрузки сессий:', err);
      setError('Ошибка загрузки сессий');
    }
  };

  const loadScheduledSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/sessions/scheduled`);
      if (!response.ok) throw new Error('Ошибка загрузки запланированных сессий');
      const data = await response.json();
      setScheduledSessions(data);
    } catch (err) {
      console.error('Ошибка загрузки запланированных сессий:', err);
      setError('Ошибка загрузки запланированных сессий');
    }
  };

  const loadRecordings = async () => {
    try {
      setRecordingsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/audio/teacher/${teacher.id}`);
      if (!response.ok) throw new Error('Ошибка загрузки записей');
      const data = await response.json();
      setRecordings(data);
    } catch (err) {
      console.error('Ошибка загрузки записей:', err);
      setError('Ошибка загрузки записей');
    } finally {
      setRecordingsLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      setError('Введите название предмета');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teacher/courses/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacher.id,
          title: newCourseTitle.trim()
        })
      });
      
      if (!response.ok) throw new Error('Ошибка создания предмета');
      
      const data = await response.json();
      setCourses([...courses, data]);
      setNewCourseTitle('');
      alert('Курс успешно создан');
    } catch (err) {
      console.error('Ошибка создания предмета:', err);
      setError('Ошибка создания предмета');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (selectedGroupsArray, subjectName) => {
    // Проверяем выбранные группы
    if (!selectedCourse) {
      setError('Выберите предмет для создания сессии');
      return;
    }
    
    if (!selectedGroupsArray || selectedGroupsArray.length === 0) {
      setError('Выберите хотя бы одну группу для сессии');
      return;
    }
    
    try {
      setLoading(true);
      
      // subjectName берём из параметра или из выбранного курса
      let finalSubjectName = subjectName;
      if (!finalSubjectName) {
        const selectedCourseObj = courses.find(c => c.id === parseInt(selectedCourse));
        finalSubjectName = selectedCourseObj ? selectedCourseObj.title : '';
      }
      
      const response = await fetch(`${API_BASE_URL}/api/teacher/sessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          courseId: selectedCourse,
          description: sessionDescription.trim() || null,
          groupIds: selectedGroupsArray.map(id => parseInt(id)), // МАССИВ групп
          subjectName: finalSubjectName
        })
      });
      
      if (!response.ok) throw new Error('Ошибка создания сессии');
      
      const data = await response.json();
      await loadSessions();
      
      // Получаем названия групп для сообщения
      const selectedGroupNames = selectedGroupsArray.map(gid => 
        teacherGroups.find(g => g.groupId === gid)?.groupName
      ).filter(Boolean);
      
      alert(`Сессия вебинара создана!\nГруппы: ${selectedGroupNames.join(', ')}\nПредмет: ${finalSubjectName}`);
      
      setSelectedCourse('');
      setSelectedGroups([]); // Очищаем массив групп
      setSessionDescription('');
    } catch (err) {
      console.error('Ошибка создания сессии:', err);
      setError('Ошибка создания сессии');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSession = async (sessionData) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teacher/sessions/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          teacherId: teacher.id,
          groupIds: sessionData.groupIds // Передаем массив групп
        })
      });
      
      if (!response.ok) throw new Error('Ошибка планирования сессии');
      
      const data = await response.json();
      await loadScheduledSessions();
      
      const scheduledDate = new Date(data.scheduledStart);
      const formattedDate = scheduledDate.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      alert(`Сессия запланирована на ${formattedDate}`);
    } catch (err) {
      console.error('Ошибка планирования сессии:', err);
      setError('Ошибка планирования сессии');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSession = async (sessionId) => {
    if (!window.confirm('Завершить сессию вебинара?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/finish`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Ошибка завершения сессии');
      
      await loadSessions();
      await loadCompletedSessionsCount();
      alert('Сессия завершена');
    } catch (err) {
      console.error('Ошибка завершения сессии:', err);
      setError('Ошибка завершения сессии');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScheduledSession = async (sessionId) => {
    if (!window.confirm('Удалить запланированную сессию?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teacher/sessions/scheduled/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Ошибка удаления сессии');
      
      await loadScheduledSessions();
      alert('Запланированная сессия удалена');
    } catch (err) {
      console.error('Ошибка удаления сессии:', err);
      setError('Ошибка удаления сессии');
    } finally {
      setLoading(false);
    }
  };

  const handleEditScheduledSession = async (sessionData) => {
    alert('Функция редактирования будет добавлена позже');
    console.log('Редактирование сессии:', sessionData);
  };

  const handleTranscribeRecording = async (recordingId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}/transcribe`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Ошибка транскрибации');
      const data = await response.json();
      alert(`Транскрипция завершена. Распознано ${data.wordCount || 0} слов.`);
      await loadRecordings();
    } catch (err) {
      console.error('Ошибка транскрибации:', err);
      setError('Ошибка транскрибации');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhanceText = async (recordingId, text, action) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/enhance-transcription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, action, recordingId })
      });
      if (!response.ok) throw new Error('Ошибка улучшения текста');
      const data = await response.json();
      await loadRecordings();
      return data;
    } catch (err) {
      console.error('Ошибка улучшения текста:', err);
      setError('Ошибка улучшения текста');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecordingField = async (recordingId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Ошибка обновления');
      await loadRecordings();
    } catch (err) {
      console.error('Ошибка обновления:', err);
      setError('Ошибка обновления');
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    if (!window.confirm('Удалить эту запись?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Ошибка удаления');
      await loadRecordings();
      alert('Запись удалена');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Ошибка удаления');
    }
  };

  const handleEditRecording = (recording) => {
    console.log('Редактирование записи:', recording);
  };

  // Автоматический запуск запланированных сессий
  useEffect(() => {
    const checkScheduledSessions = () => {
      const now = new Date();
      
      scheduledSessions.forEach(async (session) => {
        if (session.isActive) return;
        
        const scheduledTime = new Date(session.scheduledStart);
        const timeDiff = Math.abs(now - scheduledTime) / 1000 / 60;
        
        if (timeDiff <= 5 && !session.isActive) {
          try {
            console.log(`Автоматический запуск сессии: ${session.title}`);
            
            const response = await fetch(`${API_BASE_URL}/api/teacher/sessions/start-scheduled`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: session.id })
            });
            
            if (response.ok) {
              await loadSessions();
              await loadScheduledSessions();
              
              if (timeDiff <= 1) {
                alert(`Сессия "${session.title}" автоматически запущена!`);
              }
            }
          } catch (err) {
            console.error('Ошибка автоматического запуска сессии:', err);
          }
        }
      });
    };

    const interval = setInterval(checkScheduledSessions, 60000);
    checkScheduledSessions();
    
    return () => clearInterval(interval);
  }, [scheduledSessions]);

  // Загрузка всех данных при монтировании
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadCourses(),
          loadSessions(),
          loadScheduledSessions(),
          loadTeacherGroups(),
          loadRecordings(),
          loadCompletedSessionsCount()
        ]);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
    
    // Интервалы для обновления
    const sessionsInterval = setInterval(loadSessions, 30000);
    const scheduledInterval = setInterval(loadScheduledSessions, 60000);
    
    return () => {
      clearInterval(sessionsInterval);
      clearInterval(scheduledInterval);
    };
  }, [teacher.id]);

  return (
    <TeacherDashboardView
      teacher={teacher}
      onLogout={onLogout}
      onEnterWebinar={onEnterWebinar}
      courses={courses}
      sessions={sessions}
      scheduledSessions={scheduledSessions}
      teacherGroups={teacherGroups}
      recordings={recordings}
      newCourseTitle={newCourseTitle}
      setNewCourseTitle={setNewCourseTitle}
      selectedCourse={selectedCourse}
      setSelectedCourse={setSelectedCourse}
      selectedGroups={selectedGroups}        // НОВОЕ - массив групп
      setSelectedGroups={setSelectedGroups}  // НОВОЕ
      sessionDescription={sessionDescription}
      setSessionDescription={setSessionDescription}
      error={error}
      setError={setError}
      loading={loading}
      recordingsLoading={recordingsLoading}
      completedSessionsCount={completedSessionsCount}
      handleCreateCourse={handleCreateCourse}
      handleCreateSession={handleCreateSession}
      handleScheduleSession={handleScheduleSession}
      handleFinishSession={handleFinishSession}
      handleDeleteScheduledSession={handleDeleteScheduledSession}
      handleEditScheduledSession={handleEditScheduledSession}
      loadSessions={loadSessions}
      loadScheduledSessions={loadScheduledSessions}
      loadCourses={loadCourses}
      loadTeacherGroups={loadTeacherGroups}
      loadRecordings={loadRecordings}
      onEditRecording={handleEditRecording}
      onDeleteRecording={handleDeleteRecording}
      onTranscribeRecording={handleTranscribeRecording}
      onEnhanceText={handleEnhanceText}
      onUpdateRecordingField={handleUpdateRecordingField}
    />
  );
};

export default TeacherDashboard;