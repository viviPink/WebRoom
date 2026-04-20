
import React from 'react';
import { formatToLocalDateTime } from '../../../utils/dateUtils';

const ActiveWebinarsTab = ({ sessions, onEnterWebinar, onFinishSession, loadSessions, loading }) => {
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
          margin: 0 0 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .refresh-button {
          padding: 8px 16px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }
        .refresh-button:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .session-card {
          padding: 24px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        .session-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
        }
        .session-info {
          flex: 1;
        }
        .session-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 12px 0;
        }
        .session-description {
          margin-bottom: 16px;
          padding: 12px;
          background-color: white;
          border-radius: 12px;
          font-size: 14px;
          color: #6B7280;
        }
        .session-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }
        .detail-label {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .detail-value {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
        }
        .status-active {
          color: #10B981;
        }
        .action-buttons {
          display: flex;
          gap: 12px;
          flex-direction: column;
          min-width: 160px;
        }
        .btn-enter {
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
        .btn-enter:hover:not(:disabled) {
          background-color: #6750E0;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(123, 97, 255, 0.3);
        }
        .btn-finish {
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
        .btn-finish:hover {
          background-color: #DC2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          background-color: #f9fafb;
          border-radius: 16px;
          color: #6B7280;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          background-color: #EFF6FF;
          color: #1E40AF;
          border-radius: 20px;
          font-size: 12px;
          margin-right: 8px;
          margin-bottom: 8px;
        }
        .badge-group {
          background-color: #FEF3C7;
          color: #92400E;
        }
        @media (max-width: 768px) {
          .session-header {
            flex-direction: column;
          }
          .action-buttons {
            width: 100%;
          }
          .btn-enter, .btn-finish {
            width: 100%;
          }
        }
      `}</style>

      <div className="section-title">
        Активные вебинары ({sessions.length})
        <button onClick={loadSessions} className="refresh-button" disabled={loading}>
          {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>Нет активных вебинаров</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Перейдите во вкладку "Создание вебинара" чтобы начать новый
          </p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <div className="session-info">
                  <h4 className="session-title">{session.courseTitle}</h4>
                  
                  {session.subjectName && (
                    <div>
                      <span className="badge">{session.subjectName}</span>
                      <span className="badge badge-group">
                        {session.groupName || session.groupId}
                      </span>
                    </div>
                  )}
                  
                  {session.description && (
                    <div className="session-description">
                      <strong>Описание:</strong> {session.description}
                    </div>
                  )}
                  
                  <div className="session-details">
                    <div>
                      <div className="detail-label">ID сессии:</div>
                      <div className="detail-value">{session.id}</div>
                    </div>
                    <div>
                      <div className="detail-label">Начало:</div>
                      <div className="detail-value">
                        {formatToLocalDateTime(session.startTime)}
                      </div>
                    </div>
                    <div>
                      <div className="detail-label">Статус:</div>
                      <div className="detail-value status-active">Активна</div>
                    </div>
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button
                    onClick={() => onEnterWebinar(session.id)}
                    className="btn-enter"
                  >
                    Войти в вебинар
                  </button>
                  <button
                    onClick={() => onFinishSession(session.id)}
                    className="btn-finish"
                  >
                    Завершить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveWebinarsTab;