
import React, { useState } from 'react';

const ProfileTab = ({ teacher }) => {
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
        : 'https://10.31.119.190:3002';
      
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

  return (
    <div className="section">
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
          margin: 0 0 8px 0;
        }
        .description {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 24px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 12px;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .avatar {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          font-weight: 600;
          color: white;
        }
        .profile-stats {
          flex: 1;
        }
        .stat-badge {
          display: inline-block;
          padding: 8px 16px;
          background-color: #f3f4f6;
          border-radius: 20px;
          font-size: 14px;
          margin-right: 12px;
          margin-bottom: 8px;
        }
        .info-card {
          background-color: #f9fafb;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .info-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-label {
          width: 140px;
          font-weight: 500;
          color: #374151;
        }
        .info-value {
          flex: 1;
          color: #111827;
        }
        .edit-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
        }
        .edit-input:focus {
          outline: none;
          border-color: #1e3c72;
          box-shadow: 0 0 0 3px rgba(30, 60, 114, 0.1);
        }
        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .btn-primary {
          padding: 10px 24px;
          background-color: #1e3c72;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #2a5298;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 10px 24px;
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
        }
        .btn-edit {
          padding: 8px 20px;
          background-color: #1e3c72;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
        }
        .save-message {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
        }
        .save-message.success {
          background-color: #D1FAE5;
          color: #065F46;
        }
        .save-message.error {
          background-color: #FEE2E2;
          color: #DC2626;
        }
        @media (max-width: 768px) {
          .info-row {
            flex-direction: column;
            gap: 8px;
          }
          .info-label {
            width: auto;
          }
          .button-group {
            flex-direction: column;
          }
          .btn-primary, .btn-secondary {
            width: 100%;
          }
        }
      `}</style>

      <h3 className="section-title">Личная информация</h3>
      <div className="description">
        Просмотр и редактирование данных вашего профиля
      </div>

      <div className="profile-header">
        <div className="avatar">
          {teacher?.name?.charAt(0)?.toUpperCase() || 'П'}
        </div>
        <div className="profile-stats">
          <span className="stat-badge">ID: {teacher?.id}</span>
          <span className="stat-badge">
            Зарегистрирован: {teacher?.createdAt 
              ? new Date(teacher.createdAt).toLocaleDateString('ru-RU')
              : '—'}
          </span>
        </div>
      </div>

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
                {saveLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={handleCancel} className="btn-secondary">
                Отмена
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="info-row">
              <div className="info-label">Имя:</div>
              <div className="info-value">{teacher?.name || '—'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Email:</div>
              <div className="info-value">{teacher?.email || '—'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">ID преподавателя:</div>
              <div className="info-value">{teacher?.id}</div>
            </div>
            <button onClick={() => setIsEditing(true)} className="btn-edit">
              Редактировать профиль
            </button>
          </>
        )}
        
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('успешно') ? 'success' : 'error'}`}>
            {saveMessage}
          </div>
        )}
      </div>

      <div className="info-card">
        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          Статистика активности
        </h4>
        <div className="info-row">
          <div className="info-label">Всего курсов:</div>
          <div className="info-value">—</div>
        </div>
        <div className="info-row">
          <div className="info-label">Проведено вебинаров:</div>
          <div className="info-value">—</div>
        </div>
        <div className="info-row">
          <div className="info-label">Групп и предметов:</div>
          <div className="info-value">—</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;