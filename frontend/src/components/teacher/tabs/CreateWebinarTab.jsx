import React, { useState } from 'react';

const CreateWebinarTab = ({
  teacher,
  courses,
  teacherGroups,
  newCourseTitle,
  setNewCourseTitle,
  selectedCourse,
  setSelectedCourse,
  selectedGroup,
  setSelectedGroup,
  sessionDescription,
  setSessionDescription,
  error,
  setError,
  loading,
  handleCreateCourse,
  handleCreateSession,
  handleScheduleSession,
  loadCourses
}) => {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState(60);
  const [scheduleCourseId, setScheduleCourseId] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]); // МАССИВ для нескольких групп
  const [scheduleGroupIds, setScheduleGroupIds] = useState([]); // МАССИВ для планирования

  const fillScheduleFromCurrent = () => {
    setScheduleDescription(sessionDescription);
    setScheduleCourseId(selectedCourse);
    setScheduleGroupIds([...selectedGroups]); // Копируем массив
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime('10:00');
  };

  const handleOpenScheduleForm = () => {
    if (!selectedCourse) {
      setError('Сначала выберите предмет');
      return;
    }
    if (selectedGroups.length === 0) {
      setError('Сначала выберите хотя бы одну группу');
      return;
    }
    fillScheduleFromCurrent();
    setShowScheduleForm(true);
  };

  const handleCloseScheduleForm = () => {
    setShowScheduleForm(false);
    setScheduleDescription('');
    setScheduleDate('');
    setScheduleTime('');
    setScheduleDuration(60);
    setScheduleCourseId('');
    setScheduleGroupIds([]);
  };

  const handleSubmitSchedule = async () => {
    if (!scheduleCourseId) {
      setError('Выберите предмет');
      return;
    }
    if (scheduleGroupIds.length === 0) {
      setError('Выберите хотя бы одну группу');
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      setError('Укажите дату и время');
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    if (isNaN(scheduledDateTime.getTime())) {
      setError('Неверная дата или время');
      return;
    }

    await handleScheduleSession({
      courseId: scheduleCourseId,
      description: scheduleDescription,
      scheduledStart: scheduledDateTime.toISOString(),
      duration: scheduleDuration,
      groupIds: scheduleGroupIds // Передаем МАССИВ групп
    });

    handleCloseScheduleForm();
  };

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleScheduleGroup = (groupId) => {
    setScheduleGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getAvailableGroupsForCourse = () => {
    if (!selectedCourse) return [];
    
    const selectedCourseObj = courses.find(c => c.id === parseInt(selectedCourse));
    if (!selectedCourseObj) return [];
    
    const connectedGroups = teacherGroups
      .filter(item => item.subjectName === selectedCourseObj.title)
      .map(item => ({
        groupId: item.groupId,
        groupName: item.groupName,
        subjectName: item.subjectName
      }));
    
    return [...new Map(connectedGroups.map(item => [item.groupId, item])).values()];
  };

  const availableGroups = getAvailableGroupsForCourse();
  const selectedCourseObj = courses.find(c => c.id === parseInt(selectedCourse));

  return (
    <>
      <style jsx>{`
        .section {
          background-color: #fff;
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 20px 0;
        }
        .input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .input-field {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
        }
        .input-field:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }
        .textarea-field {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          resize: vertical;
          font-family: inherit;
          transition: all 0.2s;
        }
        .textarea-field:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }
        .select-field {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background-color: white;
          transition: all 0.2s;
          cursor: pointer;
        }
        .select-field:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }
        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .btn-primary {
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
          padding: 12px 24px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: #e5e7eb;
          transform: translateY(-2px);
        }
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-outline {
          padding: 12px 24px;
          background-color: transparent;
          color: #6B7280;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline:hover {
          background-color: #f9fafb;
          border-color: #7B61FF;
          color: #7B61FF;
        }
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .course-card {
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        .course-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .course-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 12px 0;
        }
        .course-select-btn {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        .course-select-btn.selected {
          background-color: #7B61FF;
          color: white;
        }
        .course-select-btn.selected:hover {
          background-color: #6750E0;
          transform: translateY(-1px);
        }
        .course-select-btn:not(.selected) {
          background-color: #f3f4f6;
          color: #374151;
        }
        .course-select-btn:not(.selected):hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }
        .empty-state {
          padding: 40px 20px;
          text-align: center;
          background-color: #f9fafb;
          border-radius: 16px;
          color: #6B7280;
        }
        .warning-message {
          margin-top: 12px;
          padding: 12px;
          background-color: #FEF3C7;
          border-radius: 8px;
          font-size: 13px;
          color: #92400E;
        }
        .label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
        }
        .stat-card {
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
        .schedule-form {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        .schedule-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }
        .schedule-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }
        .info-box {
          background-color: #F3F4F6;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .info-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .info-text {
          font-size: 16px;
          font-weight: 500;
          color: #111827;
        }
        .groups-checkbox-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }
        .group-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f3f4f6;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .group-checkbox:hover {
          background: #e5e7eb;
        }
        .group-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        .group-checkbox span {
          font-size: 14px;
          color: #374151;
        }
        @media (max-width: 768px) {
          .button-group {
            flex-direction: column;
          }
          .btn-primary, .btn-secondary, .btn-outline {
            width: 100%;
          }
          .input-group {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="section">
        <h3 className="section-title">Создать новый предмет</h3>
        <div className="input-group">
          <input
            placeholder="Название предмета"
            value={newCourseTitle}
            onChange={(e) => setNewCourseTitle(e.target.value)}
            className="input-field"
          />
          <button
            onClick={handleCreateCourse}
            disabled={!newCourseTitle.trim() || loading}
            className="btn-primary"
          >
            {loading ? 'Создание...' : 'Создать предмет'}
          </button>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Мои предметы ({courses.length})</h3>
        {courses.length === 0 ? (
          <div className="empty-state">
            <p>У вас пока нет предметов</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Создайте предмет выше, чтобы начать
            </p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map(course => (
              <div key={course.id} className="course-card">
                <h4 className="course-title">{course.title}</h4>
                <button
                  onClick={() => {
                    setSelectedCourse(course.id);
                    setSelectedGroups([]); // Сбрасываем выбранные группы при смене курса
                  }}
                  className={`course-select-btn ${selectedCourse === course.id ? 'selected' : ''}`}
                >
                  {selectedCourse === course.id ? 'Выбран' : 'Выбрать для вебинара'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h3 className="section-title">Создать вебинар</h3>
        
        <div className="info-box">
          <div className="info-title">Выбранный предмет:</div>
          <div className="info-text">
            {selectedCourseObj ? selectedCourseObj.title : 'Не выбран'}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="label">Группы (можно выбрать несколько)</label>
          <div className="groups-checkbox-list">
            {availableGroups.map(group => (
              <label key={group.groupId} className="group-checkbox">
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(group.groupId)}
                  onChange={() => toggleGroup(group.groupId)}
                  disabled={!selectedCourse}
                />
                <span>{group.groupName}</span>
              </label>
            ))}
          </div>
          {selectedCourse && availableGroups.length === 0 && (
            <div className="warning-message">
              Для выбранного предмета нет привязанных групп. 
              Перейдите во вкладку "Группы и предметы" и добавьте связь.
            </div>
          )}
          {selectedGroups.length === 0 && selectedCourse && availableGroups.length > 0 && (
            <div className="warning-message" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
              Выберите хотя бы одну группу для вебинара
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="label">Описание (необязательно)</label>
          <textarea
            placeholder="Дополнительная информация о вебинаре"
            value={sessionDescription}
            onChange={(e) => setSessionDescription(e.target.value)}
            className="textarea-field"
            rows="3"
          />
        </div>

        <div className="button-group">
          <button
            onClick={() => {
              if (selectedGroups.length === 0) {
                setError('Выберите хотя бы одну группу');
                return;
              }
              // Передаем массив групп в handleCreateSession
              const selectedCourseObj = courses.find(c => c.id === parseInt(selectedCourse));
              handleCreateSession(selectedGroups, selectedCourseObj?.title);
            }}
            disabled={!selectedCourse || selectedGroups.length === 0 || loading}
            className="btn-primary"
          >
            {loading ? 'Создание...' : `Начать вебинар для ${selectedGroups.length} групп(ы)`}
          </button>
          <button
            onClick={handleOpenScheduleForm}
            disabled={!selectedCourse || selectedGroups.length === 0}
            className="btn-secondary"
          >
            Запланировать на будущее
          </button>
        </div>

        {showScheduleForm && (
          <div className="schedule-form">
            <h4 className="schedule-title">Планирование вебинара</h4>
            
            <div className="info-box" style={{ marginBottom: '16px' }}>
              <div className="info-title">Курс:</div>
              <div className="info-text">
                {courses.find(c => c.id === parseInt(scheduleCourseId))?.title || '...'}
              </div>
              <div className="info-title" style={{ marginTop: '8px' }}>Выбранные группы:</div>
              <div className="info-text">
                {scheduleGroupIds.map(gid => 
                  teacherGroups.find(g => g.groupId === gid)?.groupName
                ).filter(Boolean).join(', ') || 'Не выбраны'}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="label">Группы</label>
              <div className="groups-checkbox-list">
                {availableGroups.map(group => (
                  <label key={group.groupId} className="group-checkbox">
                    <input
                      type="checkbox"
                      checked={scheduleGroupIds.includes(group.groupId)}
                      onChange={() => toggleScheduleGroup(group.groupId)}
                    />
                    <span>{group.groupName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="label">Дата</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Время</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="label">Длительность</label>
              <select
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(parseInt(e.target.value))}
                className="select-field"
              >
                <option value="30">30 минут</option>
                <option value="45">45 минут</option>
                <option value="60">1 час</option>
                <option value="90">1.5 часа</option>
                <option value="120">2 часа</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="label">Описание</label>
              <textarea
                value={scheduleDescription}
                onChange={(e) => setScheduleDescription(e.target.value)}
                placeholder="Описание вебинара"
                className="textarea-field"
                rows="2"
              />
            </div>

            <div className="schedule-actions">
              <button
                onClick={handleSubmitSchedule}
                disabled={loading || scheduleGroupIds.length === 0}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {loading ? 'Сохранение...' : `Запланировать для ${scheduleGroupIds.length} групп(ы)`}
              </button>
              <button
                onClick={handleCloseScheduleForm}
                className="btn-outline"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h3 className="section-title">Статистика</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Всего предметов</div>
            <div className="stat-value">{courses.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Связей групп и предметов</div>
            <div className="stat-value">{teacherGroups?.length || 0}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateWebinarTab;