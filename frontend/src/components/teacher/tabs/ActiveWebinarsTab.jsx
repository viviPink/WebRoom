import React, { useState, useMemo } from 'react';
import { formatToLocalDateTime } from '../../../utils/dateUtils';

const ActiveWebinarsTab = ({ 
  sessions, 
  onEnterWebinar, 
  onFinishSession, 
  loadSessions, 
  loading,
  scheduledSessions = [],
  completedSessionsCount = 0
}) => {
  // Получаем сегодняшнюю дату без времени
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Фильтруем запланированные на сегодня сессии
  const todayScheduled = scheduledSessions.filter(session => {
    const sessionDate = new Date(session.scheduledStart);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });
  
  // Получаем запланированные на ближайшие 7 дней (включая сегодня)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const weekScheduled = scheduledSessions.filter(session => {
    const sessionDate = new Date(session.scheduledStart);
    return sessionDate >= today && sessionDate < nextWeek;
  });
  
  // Общее количество завершенных сессий (передано из родителя или считаем из sessions)
  const totalCompleted = completedSessionsCount || 0;

  // ── Мини-календарь ──────────────────────────────────
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [selectedCalDate, setSelectedCalDate] = useState(null);

  const todayStr = new Date().toDateString();

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [calMonth]);

  const scheduledDates = useMemo(() => {
    const set = new Set();
    (scheduledSessions || []).forEach(s => {
      const d = new Date(s.scheduledStart);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [scheduledSessions]);

  const activeDates = useMemo(() => {
    const set = new Set();
    (sessions || []).forEach(s => {
      const d = new Date(s.startTime);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [sessions]);

  // Получить все сессии для выбранной даты
  const getSessionsForSelectedDate = () => {
    if (!selectedCalDate) return { active: [], scheduled: [] };
    const dateStr = selectedCalDate.toDateString();
    const active = (sessions || []).filter(s => {
      const d = new Date(s.startTime);
      return d.toDateString() === dateStr;
    });
    const scheduled = (scheduledSessions || []).filter(s => {
      const d = new Date(s.scheduledStart);
      return d.toDateString() === dateStr;
    });
    return { active, scheduled };
  };

  const selectedDateSessions = getSessionsForSelectedDate();
  
  return (
    <div className="dashboard-container">
      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .stat-card {
          background-color: #fff;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .stat-value {
          font-size: 36px;
          font-weight: 700;
          color: #7B61FF;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .stat-sub {
          font-size: 12px;
          color: #9CA3AF;
        }
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
          gap: 12px;
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
        .status-scheduled {
          color: #F59E0B;
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
        .scheduled-time {
          font-size: 14px;
          font-weight: 600;
          color: #F59E0B;
          margin-top: 8px;
        }
        .scheduled-item {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        .scheduled-item:last-child {
          border-bottom: none;
        }
        .scheduled-item:hover {
          background-color: #f9fafb;
        }
        .scheduled-title {
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }
        .calendar-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          align-items: start;
        }
        .calendar-panel {
          background: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          padding: 16px;
          position: sticky;
          top: 20px;
        }
        .cal-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .cal-nav-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #6B7280;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .cal-nav-btn:hover {
          background-color: #e5e7eb;
        }
        .cal-month-title {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
        }
        .cal-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          margin-bottom: 4px;
        }
        .cal-weekday {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #9CA3AF;
          padding: 4px 0;
        }
        .cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .cal-day {
          text-align: center;
          padding: 5px 2px;
          border-radius: 8px;
          font-size: 13px;
          position: relative;
          cursor: default;
          transition: all 0.15s;
        }
        .cal-day.clickable {
          cursor: pointer;
        }
        .cal-day.clickable:hover {
          background-color: #EDE9FE;
        }
        .cal-day.today {
          background: #7B61FF;
          color: white;
          font-weight: 700;
        }
        .cal-day.selected {
          background: #6750E0;
          color: white;
          font-weight: 700;
        }
        .cal-dot {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        .cal-legend {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cal-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #6B7280;
        }
        .cal-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .selected-date-panel {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }
        .selected-date-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 10px;
        }
        .selected-date-item {
          padding: 10px 12px;
          background: white;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .selected-date-item-title {
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }
        .selected-date-item-meta {
          color: #6B7280;
          font-size: 12px;
        }
        .selected-date-empty {
          font-size: 13px;
          color: #9CA3AF;
          text-align: center;
          padding: 12px;
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
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .calendar-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Блок статистики */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalCompleted}</div>
          <div className="stat-label">Всего проведено вебинаров</div>
          <div className="stat-sub">за всё время</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todayScheduled.length + sessions.length}</div>
          <div className="stat-label">Сегодня</div>
          <div className="stat-sub">
            {sessions.length} активных, {todayScheduled.length} запланировано
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{weekScheduled.length}</div>
          <div className="stat-label">На этой неделе</div>
          <div className="stat-sub">включая сегодня</div>
        </div>
      </div>

      {/* Двухколоночный layout: контент + календарь */}
      <div className="calendar-layout">
        {/* Левая колонка: запланированные и активные */}
        <div>
          {/* Список запланированных на сегодня */}
          {todayScheduled.length > 0 && (
            <div className="section" style={{ marginBottom: '24px' }}>
              <h3 className="section-title">
                Запланировано на сегодня ({todayScheduled.length})
              </h3>
              <div className="sessions-list">
                {todayScheduled.map(session => (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <div className="session-info">
                        <h4 className="session-title">{session.title}</h4>
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
                            <div className="detail-label">Время начала:</div>
                            <div className="detail-value status-scheduled">
                              {formatToLocalDateTime(session.scheduledStart)}
                            </div>
                          </div>
                          <div>
                            <div className="detail-label">Длительность:</div>
                            <div className="detail-value">{session.duration} минут</div>
                          </div>
                          <div>
                            <div className="detail-label">Курс:</div>
                            <div className="detail-value">{session.courseTitle}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Активные вебинары */}
          <div className="section">
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
                  {todayScheduled.length > 0 
                    ? `Сегодня запланировано ${todayScheduled.length} вебинаров. Они начнутся автоматически в указанное время.`
                    : 'Перейдите во вкладку "Создание вебинара" чтобы начать новый или запланировать'}
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
        </div>

        {/* Правая колонка: мини-календарь */}
        <div className="calendar-panel">
          {/* Навигация по месяцу */}
          <div className="cal-nav">
            <button
              onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })}
              className="cal-nav-btn"
            >‹</button>
            <span className="cal-month-title">
              {calMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })}
              className="cal-nav-btn"
            >›</button>
          </div>

          {/* Дни недели */}
          <div className="cal-weekdays">
            {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
              <div key={d} className="cal-weekday">{d}</div>
            ))}
          </div>

          {/* Ячейки дней */}
          <div className="cal-days-grid">
            {calDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const isDayToday = day.toDateString() === todayStr;
              const hasScheduled = scheduledDates.has(key);
              const hasActive = activeDates.has(key);
              const isClickable = hasScheduled || hasActive;
              const isSelected = selectedCalDate && day.toDateString() === selectedCalDate.toDateString();
              return (
                <div
                  key={key}
                  className={`cal-day${isClickable ? ' clickable' : ''}${isDayToday && !isSelected ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                  onClick={() => {
                    if (isClickable) {
                      setSelectedCalDate(day);
                    }
                  }}
                  title={hasScheduled ? 'Запланировано занятие' : hasActive ? 'Активный вебинар' : ''}
                >
                  {day.getDate()}
                  {(hasScheduled || hasActive) && (
                    <div
                      className="cal-dot"
                      style={{ background: (isDayToday || isSelected) ? 'white' : hasActive ? '#10B981' : '#7B61FF' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Легенда */}
          <div className="cal-legend">
            <div className="cal-legend-item">
              <div className="cal-legend-dot" style={{ background: '#10B981' }} />
              Активный вебинар
            </div>
            <div className="cal-legend-item">
              <div className="cal-legend-dot" style={{ background: '#7B61FF' }} />
              Запланировано
            </div>
          </div>

          {/* Расписание выбранной даты */}
          {selectedCalDate && (
            <div className="selected-date-panel">
              <div className="selected-date-title">
                {selectedCalDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
              </div>
              {selectedDateSessions.active.length === 0 && selectedDateSessions.scheduled.length === 0 ? (
                <div className="selected-date-empty">Нет занятий на эту дату</div>
              ) : (
                <>
                  {selectedDateSessions.active.map(s => (
                    <div key={s.id} className="selected-date-item">
                      <div className="selected-date-item-title">
                        {s.courseTitle || 'Вебинар'}
                      </div>
                      <div className="selected-date-item-meta">
                        Начало: {new Date(s.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        {s.subjectName && ` · ${s.subjectName}`}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ padding: '2px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>Активна</span>
                      </div>
                    </div>
                  ))}
                  {selectedDateSessions.scheduled.map(s => (
                    <div key={s.id} className="selected-date-item">
                      <div className="selected-date-item-title">
                        {s.title || s.courseTitle || 'Занятие'}
                      </div>
                      <div className="selected-date-item-meta">
                        {new Date(s.scheduledStart).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        {s.duration && ` · ${s.duration} мин`}
                        {s.subjectName && ` · ${s.subjectName}`}
                      </div>
                      {s.groupName && (
                        <div className="selected-date-item-meta">Группа: {s.groupName}</div>
                      )}
                      {s.description && (
                        <div className="selected-date-item-meta" style={{ marginTop: '4px', fontStyle: 'italic' }}>{s.description}</div>
                      )}
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ padding: '2px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>Запланировано</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveWebinarsTab;