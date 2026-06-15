import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const ReportsTab = ({ teacher }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    averageAttendance: 0,
    uniqueGroups: 0,
    uniqueCourses: 0  // переименовано с uniqueSubjects
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    courseId: '',     // это и есть предмет/курс
    group: '',
    studentName: '',
    dateFrom: '',
    dateTo: ''
  });
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [semester, setSemester] = useState('');

  // Загрузка курсов (они же предметы)
  const loadCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/courses`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки курсов:', err);
    }
  };

  // Загрузка групп преподавателя
  const loadGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/groups-subjects`);
      if (response.ok) {
        const data = await response.json();
        const uniqueGroups = [...new Map(data.map(item => [item.groupId, item])).values()];
        setGroups(uniqueGroups);
      }
    } catch (err) {
      console.error('Ошибка загрузки групп:', err);
    }
  };

  // Загрузка отчёта
  const loadAttendanceReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/attendance/report?${params}`);
      if (!response.ok) throw new Error('Ошибка загрузки отчёта');
      
      const data = await response.json();
      setAttendanceData(data.attendance || []);
      setStats({
        totalStudents: data.stats?.totalStudents || 0,
        totalSessions: data.stats?.totalSessions || 0,
        averageAttendance: data.stats?.averageAttendance || 0,
        uniqueGroups: data.stats?.uniqueGroups || 0,
        uniqueCourses: data.stats?.uniqueSubjects || data.stats?.uniqueCourses || 0
      });
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  // Установка текущего семестра
  const setCurrentSemester = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    let startDate, endDate;
    
    if (month >= 0 && month <= 5) { // весенний семестр (январь-июнь)
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 5, 30);
      setSemester('current');
    } else { // осенний семестр (сентябрь-декабрь)
      startDate = new Date(year, 8, 1);
      endDate = new Date(year + 1, 0, 1);
      setSemester('current');
    }
    
    setFilters(prev => ({
      ...prev,
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0]
    }));
  };

  // Установка прошлого семестра
  const setPreviousSemester = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    let startDate, endDate;
    
    if (month >= 0 && month <= 5) {
      startDate = new Date(year - 1, 8, 1);
      endDate = new Date(year, 0, 1);
      setSemester('previous');
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 5, 30);
      setSemester('previous');
    }
    
    setFilters(prev => ({
      ...prev,
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0]
    }));
  };

  const clearSemester = () => {
    setSemester('');
    setFilters(prev => ({
      ...prev,
      dateFrom: '',
      dateTo: ''
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'dateFrom' || key === 'dateTo') {
      setSemester('');
    }
  };

  const applyFilters = () => {
    loadAttendanceReport();
  };

  const resetFilters = () => {
    setFilters({
      courseId: '',
      group: '',
      studentName: '',
      dateFrom: '',
      dateTo: ''
    });
    setSemester('');
    setTimeout(() => loadAttendanceReport(), 100);
  };

  // Экспорт в CSV
  const exportToCSV = () => {
    const headers = [
      'Дата', 'Курс/Предмет', 'Группа', 'Студент', 
      'Статус', 'Ознакомлен', 'Время присоединения'
    ];
    
    const rows = attendanceData.map(record => [
      new Date(record.sessionDate).toLocaleDateString('ru-RU'),
      record.courseTitle || record.subject || '',
      record.groupName || record.group || '',
      record.studentName || '',
      record.status === 'Присутствовал' ? 'Присутствовал' : 'Пропустил',
      record.hasReviewed ? 'Да' : 'Нет',
      record.joinTime ? new Date(record.joinTime).toLocaleString('ru-RU') : '-'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSessionExpand = (sessionKey) => {
    if (expandedSession === sessionKey) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionKey);
    }
  };

  // Группировка по сессиям
  const groupBySession = () => {
    const grouped = {};
    attendanceData.forEach(record => {
      const key = `${record.sessionId}`;
      if (!grouped[key]) {
        grouped[key] = {
          sessionId: record.sessionId,
          sessionDate: record.sessionDate,
          courseTitle: record.courseTitle,
          subject: record.subject,
          groupName: record.groupName,
          students: []
        };
      }
      const existingStudent = grouped[key].students.find(s => s.studentId === record.studentId);
      if (!existingStudent) {
        grouped[key].students.push(record);
      }
    });
    return Object.values(grouped);
  };

  const groupedSessions = groupBySession();

  useEffect(() => {
    loadCourses();
    loadGroups();
    loadAttendanceReport();
  }, []);

  return (
    <div className="reports-container">
      <style jsx>{`
        .reports-container {
          background-color: #fff;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .reports-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .reports-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .export-btn {
          padding: 10px 20px;
          background-color: #10B981;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }

        .semester-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .semester-btn {
          padding: 10px 20px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .semester-btn:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .semester-btn.active {
          background-color: #7B61FF;
          border-color: #7B61FF;
          color: white;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .filter-input, .filter-select {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
          background-color: white;
        }

        .filter-input:focus, .filter-select:focus {
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }

        .filter-buttons {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .apply-btn, .reset-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apply-btn {
          background-color: #7B61FF;
          color: white;
        }

        .apply-btn:hover {
          background-color: #6750E0;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(123, 97, 255, 0.2);
        }

        .reset-btn {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .reset-btn:hover {
          background-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          text-align: center;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .stat-label {
          font-size: 13px;
          color: #6B7280;
          margin-top: 4px;
        }

        .sessions-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .sessions-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .sessions-subtitle {
          font-size: 14px;
          color: #6B7280;
          margin: 4px 0 0 0;
        }

        .sessions-count {
          font-size: 14px;
          color: #6B7280;
          background-color: #f3f4f6;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .session-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .session-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background-color: #f9fafb;
          cursor: pointer;
          transition: all 0.2s;
          flex-wrap: wrap;
          gap: 12px;
        }

        .session-header:hover {
          background-color: #f3f4f6;
        }

        .session-info {
          flex: 1;
        }

        .session-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .session-meta {
          font-size: 13px;
          color: #6B7280;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .session-stats {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .stat-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .stat-badge.total {
          background-color: #f3f4f6;
          color: #374151;
        }

        .stat-badge.present {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .stat-badge.missed {
          background-color: #FEE2E2;
          color: #991B1B;
        }

        .stat-badge.reviewed {
          background-color: #DBEAFE;
          color: #1E40AF;
        }

        .expand-icon {
          font-size: 18px;
          color: #6B7280;
          transition: transform 0.2s;
        }

        .students-table {
          border-top: 1px solid #e5e7eb;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 12px 16px;
          background-color: #f9fafb;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 12px 16px;
          font-size: 14px;
          color: #111827;
          border-bottom: 1px solid #f3f4f6;
        }

        tr:hover td {
          background-color: #f9fafb;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.present {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .status-badge.missed {
          background-color: #FEE2E2;
          color: #991B1B;
        }

        .reviewed-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .reviewed-badge.yes {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .reviewed-badge.no {
          background-color: #FEE2E2;
          color: #991B1B;
        }

        .reviewed-badge.na {
          background-color: #f3f4f6;
          color: #6B7280;
        }

        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6B7280;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          color: #6B7280;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          .filter-buttons {
            flex-direction: column;
          }
          .apply-btn, .reset-btn {
            width: 100%;
          }
          .session-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .session-stats {
            flex-wrap: wrap;
          }
          .reports-header {
            flex-direction: column;
            align-items: stretch;
          }
          .export-btn {
            width: 100%;
          }
          .semester-buttons {
            flex-direction: column;
          }
          .semester-btn {
            width: 100%;
          }
          th, td {
            padding: 8px 12px;
            font-size: 12px;
          }
          .sessions-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="reports-header">
        <h3 className="reports-title">Отчёт по посещаемости</h3>
        <button className="export-btn" onClick={exportToCSV}>
          Экспорт в CSV
        </button>
      </div>

      <div className="semester-buttons">
        <button 
          className={`semester-btn ${semester === 'current' ? 'active' : ''}`}
          onClick={setCurrentSemester}
        >
          Текущий семестр
        </button>
        <button 
          className={`semester-btn ${semester === 'previous' ? 'active' : ''}`}
          onClick={setPreviousSemester}
        >
          Прошлый семестр
        </button>
        {(filters.dateFrom || filters.dateTo) && (
          <button className="semester-btn" onClick={clearSemester}>
            Очистить даты
          </button>
        )}
      </div>

      <div className="filters-grid">
        <div className="filter-group">
          <label className="filter-label">Курс / Предмет</label>
          <select 
            className="filter-select"
            value={filters.courseId}
            onChange={(e) => handleFilterChange('courseId', e.target.value)}
          >
            <option value="">Все курсы</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Группа</label>
          <select 
            className="filter-select"
            value={filters.group}
            onChange={(e) => handleFilterChange('group', e.target.value)}
          >
            <option value="">Все группы</option>
            {groups.map(group => (
              <option key={group.groupId} value={group.groupName}>
                {group.groupName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Студент</label>
          <input 
            type="text"
            className="filter-input"
            placeholder="Имя студента"
            value={filters.studentName}
            onChange={(e) => handleFilterChange('studentName', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Дата от</label>
          <input 
            type="date"
            className="filter-input"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Дата до</label>
          <input 
            type="date"
            className="filter-input"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button className="apply-btn" onClick={applyFilters}>
            Применить фильтры
          </button>
          <button className="reset-btn" onClick={resetFilters}>
            Сбросить
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalStudents || 0}</div>
          <div className="stat-label">Всего студентов</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalSessions || 0}</div>
          <div className="stat-label">Всего вебинаров</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.averageAttendance || 0}%</div>
          <div className="stat-label">Средняя посещаемость</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uniqueGroups || 0}</div>
          <div className="stat-label">Групп</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uniqueCourses || 0}</div>
          <div className="stat-label">Курсов / Предметов</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Загрузка отчёта...</div>
      ) : groupedSessions.length === 0 ? (
        <div className="empty-state">
          <p>Нет данных по посещаемости</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Попробуйте изменить фильтры или дождитесь проведения вебинаров
          </p>
        </div>
      ) : (
        <>
          <div className="sessions-header">
            <div>
              <h4 className="sessions-title">Прошедшие вебинары</h4>
              <p className="sessions-subtitle">
                Список завершённых занятий с детальной статистикой посещаемости
              </p>
            </div>
            <div className="sessions-count">
              Всего вебинаров: {groupedSessions.length}
            </div>
          </div>

          <div className="sessions-list">
            {groupedSessions.map(session => {
              const totalStudents = session.students.length;
              const presentCount = session.students.filter(s => s.status === 'Присутствовал').length;
              const missedCount = totalStudents - presentCount;
              const reviewedCount = session.students.filter(s => s.hasReviewed === true).length;
              const isExpanded = expandedSession === session.sessionId;

              return (
                <div key={session.sessionId} className="session-card">
                  <div className="session-header" onClick={() => toggleSessionExpand(session.sessionId)}>
                    <div className="session-info">
                      <div className="session-title">{session.courseTitle || session.subject}</div>
                      <div className="session-meta">
                        <span>{new Date(session.sessionDate).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                        {session.groupName && <span>{session.groupName}</span>}
                      </div>
                    </div>
                    <div className="session-stats">
                      <span className="stat-badge total">Всего: {totalStudents}</span>
                      <span className="stat-badge present">Присутствовало: {presentCount}</span>
                      <span className="stat-badge missed">Пропустило: {missedCount}</span>
                      <span className="stat-badge reviewed">Ознакомилось: {reviewedCount}</span>
                      <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="students-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Студент</th>
                            <th>Группа</th>
                            <th>Статус</th>
                            <th>Ознакомлен с материалом</th>
                            <th>Время присоединения</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.students.map((student, idx) => (
                            <tr key={idx}>
                              <td>
                                <strong>{student.studentName}</strong>
                              </td>
                              <td>{student.groupName || student.group || '-'}</td>
                              <td>
                                <span className={`status-badge ${student.status === 'Присутствовал' ? 'present' : 'missed'}`}>
                                  {student.status === 'Присутствовал' ? 'Присутствовал' : 'Пропустил'}
                                </span>
                              </td>
                              <td>
                                {student.status === 'Пропустил' ? (
                                  <span className={`reviewed-badge ${student.hasReviewed ? 'yes' : 'no'}`}>
                                    {student.hasReviewed ? 'Ознакомлен' : 'Не ознакомлен'}
                                  </span>
                                ) : (
                                  <span className="reviewed-badge na">—</span>
                                )}
                              </td>
                              <td style={{ fontSize: '13px', color: '#6B7280' }}>
                                {student.joinTime ? new Date(student.joinTime).toLocaleTimeString('ru-RU') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsTab;