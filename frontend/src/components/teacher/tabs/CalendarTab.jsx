
import React from 'react';
import SessionsCalendar from '../../../components/common/SessionsCalendar';

const CalendarTab = ({ 
  sessions, 
  scheduledSessions, 
  onEditSession, 
  onDeleteSession, 
  onStartSession,
  loadScheduledSessions 
}) => {
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
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        .refresh-button {
          padding: 8px 16px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .refresh-button:hover {
          background-color: #e5e7eb;
        }
        @media (max-width: 768px) {
          .calendar-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="calendar-header">
        <h3 className="section-title">Расписание вебинаров</h3>
        <button onClick={loadScheduledSessions} className="refresh-button">
          Обновить
        </button>
      </div>

      <SessionsCalendar
        sessions={sessions}
        scheduledSessions={scheduledSessions}
        onEditSession={onEditSession}
        onDeleteSession={onDeleteSession}
        onStartSession={onStartSession}
      />
    </div>
  );
};

export default CalendarTab;