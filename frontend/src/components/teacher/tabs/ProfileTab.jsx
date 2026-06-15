import React, { useState } from 'react';

const ProfileTab = ({ teacher, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(teacher?.name || '');
  const [editedEmail, setEditedEmail] = useState(teacher?.email || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    if (!editedName.trim()) {
      setSaveMessage('Имя не может быть пустым');
      return;
    }
    
    setSaveLoading(true);
    setSaveMessage('');
    
    try {
      const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
        ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
        : 'https://192.168.0.20:3002';
      
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName.trim(),
          email: editedEmail.trim()
        })
      });
      
      if (!response.ok) throw new Error('Ошибка сохранения');
      
      setSaveMessage('Данные успешно обновлены');
      setIsEditing(false);
      
      if (onUpdateProfile) {
        onUpdateProfile({ name: editedName.trim(), email: editedEmail.trim() });
      }
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Ошибка:', err);
      setSaveMessage('Ошибка при сохранении');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedName(teacher?.name || '');
    setEditedEmail(teacher?.email || '');
    setIsEditing(false);
    setSaveMessage('');
  };

  // Статистика (можно заменить на реальные данные из пропсов)
  const stats = {
    totalCourses: teacher?.totalCourses || 0,
    totalWebinars: teacher?.totalWebinars || 0,
    totalGroups: teacher?.totalGroups || 0,
    totalStudents: teacher?.totalStudents || 0
  };

  return (
    <div className="section">
      <div className="section-title">
        <span>Личная информация</span>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn-edit">
            Редактировать
          </button>
        )}
      </div>

      {/* Профиль Header - аватар */}
      <div className="profile-header">
        <div className="avatar">
          {teacher?.name?.charAt(0)?.toUpperCase() || teacher?.full_name?.charAt(0)?.toUpperCase() || 'П'}
        </div>
        <div className="profile-stats">
          <span className="stat-badge">
            ID: {teacher?.id || teacher?.teacherId}
          </span>
          <span className="stat-badge">
            Зарегистрирован: {teacher?.createdAt 
              ? new Date(teacher.createdAt).toLocaleDateString('ru-RU')
              : teacher?.registeredAt
              ? new Date(teacher.registeredAt).toLocaleDateString('ru-RU')
              : '—'}
          </span>
        </div>
      </div>

      {/* Информационная карточка */}
      <div className="info-card">
        {isEditing ? (
          <>
            <div className="info-row">
              <div className="info-label">Имя:</div>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="edit-input"
                placeholder="Введите имя"
              />
            </div>
            <div className="info-row">
              <div className="info-label">Email:</div>
              <input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="edit-input"
                placeholder="Введите email"
              />
            </div>
            <div className="button-group">
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="btn-primary"
              >
                {saveLoading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <button onClick={handleCancel} className="btn-secondary">
                Отмена
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="info-row">
              <div className="info-label">Полное имя:</div>
              <div className="info-value">{teacher?.name || teacher?.full_name || '—'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Email:</div>
              <div className="info-value">{teacher?.email || '—'}</div>
            </div>
            <div className="info-row">
            
              <div className="info-value">{teacher?.id || teacher?.teacherId || '—'}</div>
            </div>
          </>
        )}
        
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('успешно') ? 'success' : 'error'}`}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* Статистика активности - в стиле студенческой статистики */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Всего предметов</div>
          <div className="stat-value">{stats.totalCourses}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Проведено вебинаров</div>
          <div className="stat-value">{stats.totalWebinars}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Групп и предметов</div>
          <div className="stat-value">{stats.totalGroups}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Всего студентов</div>
          <div className="stat-value">{stats.totalStudents}</div>
        </div>
      </div>

      <style jsx>{`
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

        .btn-edit {
          padding: 8px 20px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-edit:hover {
          background-color: #6750E0;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.2);
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
          border-radius: 20px;
          border: 1px solid #e5e7eb;
        }

        .avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #7B61FF 0%, #9B7BFF 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: 600;
          color: white;
          box-shadow: 0 4px 12px rgba(123, 97, 255, 0.3);
        }

        .profile-stats {
          flex: 1;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .stat-badge {
          display: inline-block;
          padding: 6px 14px;
          background-color: #f3f4f6;
          border-radius: 20px;
          font-size: 13px;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .info-card {
          background-color: #f9fafb;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
        }

        .info-row {
          display: flex;
          padding: 14px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          width: 140px;
          font-weight: 500;
          color: #6B7280;
          font-size: 14px;
        }

        .info-value {
          flex: 1;
          color: #111827;
          font-size: 15px;
          font-weight: 500;
        }

        .edit-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background-color: white;
          transition: all 0.2s;
        }

        .edit-input:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .btn-primary {
          flex: 1;
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
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.2);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          flex: 1;
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

        .btn-secondary:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .save-message {
          margin-top: 16px;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          text-align: center;
        }

        .save-message.success {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .save-message.error {
          background-color: #FEE2E2;
          color: #DC2626;
        }

        /* Статистика - в стиле StudentDashboardView */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-top: 8px;
        }

        .stat-item {
          text-align: center;
          padding: 20px 16px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }

        .stat-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: #7B61FF;
        }

        .stat-label {
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        /* Адаптивность */
        @media (max-width: 768px) {
          .section {
            padding: 20px;
          }

          .section-title {
            flex-direction: column;
            align-items: stretch;
          }

          .profile-header {
            flex-direction: column;
            text-align: center;
          }

          .profile-stats {
            justify-content: center;
          }

          .info-row {
            flex-direction: column;
            gap: 6px;
          }

          .info-label {
            width: auto;
          }

          .button-group {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .stat-item {
            padding: 16px 12px;
          }

          .stat-value {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfileTab;