
import React, { useState } from 'react';
import ActiveWebinarsTab from './tabs/ActiveWebinarsTab';
import CreateWebinarTab from './tabs/CreateWebinarTab';
import GroupsSubjectsTab from './tabs/GroupsSubjectsTab';
import CalendarTab from './tabs/CalendarTab';
import ReportsTab from './tabs/ReportsTab';
import RecordingsTab from './tabs/RecordingsTab';
import ProfileTab from './tabs/ProfileTab';


const TeacherDashboardView = ({
  teacher,
  onLogout,
  onEnterWebinar,
  courses,
  sessions,
  scheduledSessions,
  teacherGroups,
  recordings,
  newCourseTitle,
  setNewCourseTitle,
  selectedCourse,
  setSelectedCourse,
  selectedGroup,
  setSelectedGroup,
  selectedSubject,
  setSelectedSubject,
  sessionDescription,
  setSessionDescription,
  error,
  setError,
  loading,
  recordingsLoading,
  handleCreateCourse,
  handleCreateSession,
  handleScheduleSession,
  handleFinishSession,
  handleDeleteScheduledSession,
  handleEditScheduledSession,
  loadSessions,
  loadScheduledSessions,
  loadCourses,
  loadTeacherGroups,
  loadRecordings,
  onEditRecording,
  onDeleteRecording,
  onTranscribeRecording,
  onEnhanceText,
  onUpdateRecordingField
}) => {
  const [activeTab, setActiveTab] = useState('active');

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

        .teacher-info {
          color: #6B7280;
          font-size: 14px;
          margin: 0;
        }

        .teacher-info strong {
          color: #111827;
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
        }

        .tab-button.active {
          background-color: #7B61FF;
          color: white;
        }

        .tab-button:not(.active):hover {
          background-color: #f3f4f6;
          color: #111827;
        }

        .main-content {
          padding: 0 40px 40px 40px;
        }

        @media (max-width: 768px) {
          .header {
            padding: 16px 20px;
            flex-direction: column;
            gap: 12px;
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
        }
      `}</style>

      <div className="header">
        <div className="logo-section">
          <span className="title">ВебРум</span>
        </div>
        <div>
          <p className="teacher-info">
            <strong>{teacher?.name || 'Преподаватель'}</strong> (ID: {teacher?.id})
          </p>
        </div>
        <button onClick={onLogout} className="back-button">
          Выйти
        </button>
      </div>

      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('active')}
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
        >
          Активные вебинары
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
        >
          Создание вебинара
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
        >
          Группы и предметы
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
        >
          Календарь
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
        >
          Отчёты
        </button>
        <button
          onClick={() => setActiveTab('recordings')}
          className={`tab-button ${activeTab === 'recordings' ? 'active' : ''}`}
        >
          Записи лекций
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
        >
          Личная информация
        </button>
      </div>

      <div className="main-content">
        {activeTab === 'active' && (
          <ActiveWebinarsTab
            sessions={sessions}
            onEnterWebinar={onEnterWebinar}
            onFinishSession={handleFinishSession}
            loadSessions={loadSessions}
            loading={loading}
          />
        )}

        {activeTab === 'create' && (
          <CreateWebinarTab
            teacher={teacher}
            courses={courses}
            teacherGroups={teacherGroups}
            newCourseTitle={newCourseTitle}
            setNewCourseTitle={setNewCourseTitle}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            sessionDescription={sessionDescription}
            setSessionDescription={setSessionDescription}
            error={error}
            setError={setError}
            loading={loading}
            handleCreateCourse={handleCreateCourse}
            handleCreateSession={handleCreateSession}
            handleScheduleSession={handleScheduleSession}
            loadCourses={loadCourses}
          />
        )}

        {activeTab === 'groups' && (
          <GroupsSubjectsTab
            teacher={teacher}
            onUpdate={loadTeacherGroups}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            sessions={sessions}
            scheduledSessions={scheduledSessions}
            onEditSession={handleEditScheduledSession}
            onDeleteSession={handleDeleteScheduledSession}
            onStartSession={onEnterWebinar}
            loadScheduledSessions={loadScheduledSessions}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab teacher={teacher} />
        )}

        {activeTab === 'recordings' && (
          <RecordingsTab
            recordings={recordings}
            loading={recordingsLoading}
            onLoad={loadRecordings}
            onEdit={onEditRecording}
            onDelete={onDeleteRecording}
            onTranscribe={onTranscribeRecording}
            onEnhanceText={onEnhanceText}
            onUpdateField={onUpdateRecordingField}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab teacher={teacher} />
        )}
      </div>

      {error && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 20px',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          borderRadius: '12px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboardView;