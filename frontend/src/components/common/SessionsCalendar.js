
import React, { useState } from 'react';
import { 
  formatToLocalTime, 
  formatToLocalDate, 
  getLocalDateString,
  isToday 
} from '../../utils/dateUtils';

const SessionsCalendar = ({ 
  sessions = [], 
  scheduledSessions = [], 
  onEditSession, 
  onDeleteSession, 
  onStartSession 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 7 : day;
  };

  const getSessionsForDate = (date) => {
    const dateStr = getLocalDateString(date);
    
    const activeForDate = sessions.filter(s => {
      if (!s.startTime) return false;
      const sessionDateStr = getLocalDateString(new Date(s.startTime));
      return sessionDateStr === dateStr;
    });
    
    const scheduledForDate = scheduledSessions.filter(s => {
      if (!s.scheduledStart) return false;
      const sessionDateStr = getLocalDateString(new Date(s.scheduledStart));
      return sessionDateStr === dateStr;
    });
    
    return { active: activeForDate, scheduled: scheduledForDate };
  };

  const styles = {
    container: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    calendarHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '20px',
      gap: '10px',
      flexWrap: 'wrap'
    },
    navButton: {
      padding: '8px 16px',
      fontSize: '18px',
      border: '1px solid #ddd',
      backgroundColor: 'white',
      borderRadius: '4px',
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#f0f0f0'
      }
    },
    monthTitle: {
      margin: 0,
      flex: 1,
      fontSize: '24px',
      color: '#333'
    },
    todayButton: {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#0056b3'
      }
    },
    weekDays: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '5px',
      marginBottom: '10px'
    },
    weekDay: {
      textAlign: 'center',
      fontWeight: 'bold',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      color: '#333'
    },
    daysGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '5px'
    },
    day: {
      minHeight: '120px',
      padding: '8px',
      backgroundColor: '#fff',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      overflow: 'hidden'
    },
    emptyDay: {
      minHeight: '120px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px'
    },
    today: {
      border: '2px solid #007bff',
      backgroundColor: '#f0f7ff'
    },
    selectedDay: {
      backgroundColor: '#e3f2fd'
    },
    dayHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '5px'
    },
    dayNumber: {
      fontWeight: 'bold',
      fontSize: '14px',
      color: '#333'
    },
    sessionCount: {
      backgroundColor: '#007bff',
      color: 'white',
      padding: '2px 6px',
      borderRadius: '10px',
      fontSize: '12px'
    },
    activeSession: {
      marginBottom: '4px',
      padding: '4px',
      backgroundColor: '#d4edda',
      borderRadius: '3px',
      fontSize: '11px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      
    },
    scheduledSession: {
      marginBottom: '4px',
      padding: '4px',
      backgroundColor: '#fff3cd',
      borderRadius: '3px',
      fontSize: '11px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      
    },
    sessionTime: {
      fontSize: '10px',
      color: '#666',
      minWidth: '40px',
      fontWeight: 'bold'
    },
    sessionTitle: {
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: '#333'
    },
    sessionActions: {
      display: 'flex',
      gap: '2px'
    },
    startButton: {
      padding: '2px 4px',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#28a745',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold'
    },
    editButton: {
      padding: '2px 4px',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#007bff',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold'
    },
    deleteButton: {
      padding: '2px 4px',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#dc3545',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold'
    },
    moreIndicator: {
      fontSize: '10px',
      color: '#666',
      textAlign: 'center',
      marginTop: '2px',
      fontStyle: 'italic'
    },
    dayViewHeader: {
      marginBottom: '20px'
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginBottom: '10px',
      ':hover': {
        backgroundColor: '#5a6268'
      }
    },
    dayViewTitle: {
      color: '#333',
      margin: '10px 0',
      fontSize: '20px'
    },
    dayViewContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    noSessions: {
      padding: '40px',
      textAlign: 'center',
      color: '#666',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px'
    },
    dayViewSession: {
      display: 'flex',
      gap: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      alignItems: 'flex-start',
      
    },
    dayViewSessionActive: {
      
    },
    dayViewSessionScheduled: {
      
    },
    dayViewTime: {
      minWidth: '70px',
      fontWeight: 'bold',
      color: '#666',
      fontSize: '16px'
    },
    dayViewInfo: {
      flex: 1
    },
    dayViewSessionTitle: {
      fontWeight: 'bold',
      marginBottom: '4px',
      color: '#333',
      fontSize: '16px'
    },
    dayViewDescription: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '8px'
    },
    dayViewMeta: {
      display: 'flex',
      gap: '10px',
      fontSize: '12px'
    },
    activeBadge: {
      padding: '2px 8px',
      backgroundColor: '#d4edda',
      color: '#155724',
      borderRadius: '12px'
    },
    scheduledBadge: {
      padding: '2px 8px',
      backgroundColor: '#fff3cd',
      color: '#856404',
      borderRadius: '12px'
    },
    dayViewActions: {
      display: 'flex',
      gap: '5px'
    },
    startSessionButton: {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#218838'
      }
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);
    
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    const days = [];
    
    // Пустые дни до начала месяца
    for (let i = 1; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={styles.emptyDay} />);
    }
    
    // Дни месяца
    for (let day = 1; day <= daysCount; day++) {
      const date = new Date(year, month, day);
      const dateStr = getLocalDateString(date);
      const { active, scheduled } = getSessionsForDate(date);
      const isTodayDate = isToday(date);
      
      days.push(
        <div 
          key={day} 
          style={{
            ...styles.day,
            ...(isTodayDate ? styles.today : {}),
            ...(selectedDate === dateStr ? styles.selectedDay : {})
          }}
          onClick={() => {
            setSelectedDate(dateStr);
            setViewMode('day');
          }}
        >
          <div style={styles.dayHeader}>
            <span style={styles.dayNumber}>{day}</span>
            {(active.length > 0 || scheduled.length > 0) && (
              <span style={styles.sessionCount}>
                {active.length + scheduled.length}
              </span>
            )}
          </div>
          
          {/* Активные сессии */}
          {active.slice(0, 2).map(session => (
            <div key={session.id} style={styles.activeSession}>
              <span style={styles.sessionTime}>
                {formatToLocalTime(session.startTime)}
              </span>
              <span style={styles.sessionTitle} title={session.courseTitle}>
                {session.courseTitle || 'Без названия'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartSession(session.id);
                }}
                style={styles.startButton}
                title="Войти в вебинар"
              >
              </button>
            </div>
          ))}
          
          {/* Запланированные сессии */}
          {scheduled.slice(0, 2).map(session => (
            <div key={session.id} style={styles.scheduledSession}>
              <span style={styles.sessionTime}>
                {formatToLocalTime(session.scheduledStart)}
              </span>
              <span style={styles.sessionTitle} title={session.title}>
                {session.title || 'Без названия'}
              </span>
              <div style={styles.sessionActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditSession(session);
                  }}
                  style={styles.editButton}
                  title="Редактировать"
                >
                  редактир
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  style={styles.deleteButton}
                  title="Удалить"
                >
                  удал
                </button>
              </div>
            </div>
          ))}
          
          {active.length + scheduled.length > 2 && (
            <div style={styles.moreIndicator}>
              +{active.length + scheduled.length - 2} ещё
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={styles.calendarHeader}>
          <button 
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))} 
            style={styles.navButton}
          >
            ←
          </button>
          <h2 style={styles.monthTitle}>
            {monthNames[month]} {year}
          </h2>
          <button 
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))} 
            style={styles.navButton}
          >
            →
          </button>
          <button 
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              setSelectedDate(getLocalDateString(today));
              setViewMode('day');
            }} 
            style={styles.todayButton}
          >
            Сегодня
          </button>
        </div>
        
        <div style={styles.weekDays}>
          {dayNames.map(day => (
            <div key={day} style={styles.weekDay}>{day}</div>
          ))}
        </div>
        
        <div style={styles.daysGrid}>
          {days}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const date = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    const { active, scheduled } = getSessionsForDate(date);
    
    const allSessions = [
      ...active.map(s => ({ ...s, type: 'active' })),
      ...scheduled.map(s => ({ ...s, type: 'scheduled' }))
    ].sort((a, b) => {
      const timeA = new Date(a.startTime || a.scheduledStart);
      const timeB = new Date(b.startTime || b.scheduledStart);
      return timeA - timeB;
    });

    return (
      <div>
        <div style={styles.dayViewHeader}>
          <button onClick={() => setViewMode('month')} style={styles.backButton}>
            Назад к календарю
          </button>
          <h2 style={styles.dayViewTitle}>
            {date.toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
        </div>
        
        <div style={styles.dayViewContent}>
          {allSessions.length === 0 ? (
            <div style={styles.noSessions}>
              На этот день нет запланированных сессий
            </div>
          ) : (
            allSessions.map(session => (
              <div 
                key={session.id} 
                style={{
                  ...styles.dayViewSession,
                  ...(session.type === 'active' ? styles.dayViewSessionActive : styles.dayViewSessionScheduled)
                }}
              >
                <div style={styles.dayViewTime}>
                  {formatToLocalTime(session.startTime || session.scheduledStart)}
                </div>
                <div style={styles.dayViewInfo}>
                  <div style={styles.dayViewSessionTitle}>
                    {session.title || session.courseTitle || 'Без названия'}
                  </div>
                  {session.description && (
                    <div style={styles.dayViewDescription}>
                      {session.description}
                    </div>
                  )}
                  <div style={styles.dayViewMeta}>
                    <span style={session.type === 'active' ? styles.activeBadge : styles.scheduledBadge}>
                      {session.type === 'active' ? 'Активна' : 'Запланирована'}
                    </span>
                    <span>{session.courseTitle}</span>
                  </div>
                </div>
                {session.type === 'scheduled' && (
                  <div style={styles.dayViewActions}>
                    <button 
                      onClick={() => onEditSession(session)} 
                      style={styles.editButton}
                      title="Редактировать"
                    >
                    </button>
                    <button 
                      onClick={() => onDeleteSession(session.id)} 
                      style={styles.deleteButton}
                      title="Удалить"
                    >
                    </button>
                  </div>
                )}
                {session.type === 'active' && (
                  <button 
                    onClick={() => onStartSession(session.id)} 
                    style={styles.startSessionButton}
                  >
                    Войти
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {viewMode === 'month' ? renderMonthView() : renderDayView()}
    </div>
  );
};

export default SessionsCalendar;