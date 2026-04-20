import React, { useState } from 'react';
import ScheduleSessionModal from '../../../components/common/ScheduleSessionModal';

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
  selectedSubject,
  setSelectedSubject,
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
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  return (
    <>
      <div className="section">
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
          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
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
          .course-id {
            font-size: 12px;
            color: #6B7280;
            text-align: center;
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
          @media (max-width: 768px) {
            .form-row {
              grid-template-columns: 1fr;
            }
            .button-group {
              flex-direction: column;
            }
            .btn-primary, .btn-secondary {
              width: 100%;
            }
            .input-group {
              flex-direction: column;
            }
          }
        `}</style>

        <div className="section">
          <h3 className="section-title">Создать новый курс</h3>
          <div className="input-group">
            <input
              placeholder="Название курса"
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
              className="input-field"
            />
            <button
              onClick={handleCreateCourse}
              disabled={!newCourseTitle.trim() || loading}
              className="btn-primary"
            >
              {loading ? 'Создание...' : 'Создать курс'}
            </button>
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">Мои курсы ({courses.length})</h3>
          {courses.length === 0 ? (
            <div className="empty-state">
              <p>У вас пока нет курсов</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Создайте курс выше, чтобы начать
              </p>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map(course => (
                <div key={course.id} className="course-card">
                  <h4 className="course-title">{course.title}</h4>
                  <button
                    onClick={() => setSelectedCourse(course.id)}
                    className={`course-select-btn ${selectedCourse === course.id ? 'selected' : ''}`}
                  >
                    {selectedCourse === course.id ? '✓ Выбран' : 'Выбрать для сессии'}
                  </button>
                  <div className="course-id">ID: {course.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <h3 className="section-title">Создать вебинар</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedGroup('');
                setSelectedSubject('');
                setError('');
              }}
              className="select-field"
            >
              <option value="">Выберите курс для вебинара</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div>
              <label className="label">Группа</label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setSelectedSubject('');
                }}
                className="select-field"
                disabled={!selectedCourse}
              >
                <option value="">Выберите группу</option>
                {teacherGroups && teacherGroups.length > 0 ? (
                  [...new Map(teacherGroups.map(item => [item.groupId, item])).values()].map(group => (
                    <option key={group.groupId} value={group.groupId}>
                      {group.groupName}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Нет назначенных групп</option>
                )}
              </select>
            </div>

            <div>
              <label className="label">Предмет</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="select-field"
                disabled={!selectedGroup}
              >
                <option value="">Выберите предмет</option>
                {teacherGroups && teacherGroups.length > 0 && selectedGroup && (
                  teacherGroups
                    .filter(g => g.groupId === parseInt(selectedGroup))
                    .map(group => (
                      <option key={group.id} value={group.subjectName}>
                        {group.subjectName}
                      </option>
                    ))
                )}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <textarea
              placeholder="Описание вебинара (необязательно)"
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              className="textarea-field"
              rows="3"
            />
          </div>

          <div className="button-group">
            <button
              onClick={handleCreateSession}
              disabled={!selectedCourse || !selectedGroup || !selectedSubject || loading}
              className="btn-primary"
            >
              {loading ? 'Создание...' : 'Начать сейчас'}
            </button>
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              disabled={courses.length === 0}
              className="btn-secondary"
            >
              Запланировать
            </button>
          </div>

          {selectedCourse && (!selectedGroup || !selectedSubject) && (
            <div className="warning-message">
              Для создания вебинара необходимо выбрать группу и предмет. 
              
            </div>
          )}
        </div>

        <div className="section">
          <h3 className="section-title">Статистика</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Всего курсов</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>{courses.length}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Групп и предметов</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>{teacherGroups?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        courses={courses}
        onSchedule={handleScheduleSession}
      />
    </>
  );
};

export default CreateWebinarTab;