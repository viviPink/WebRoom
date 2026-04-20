
import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

const SOCKET_URL = API_BASE_URL;



const AttendanceReports = ({ teacher }) => {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'sessionDate', direction: 'desc' });
  const [activeStatTab, setActiveStatTab] = useState('overall');
  
  const [filters, setFilters] = useState({
    courseId: '',
    sessionId: '',
    group: '',
    studentName: '',
    studentId: '',
    dateFrom: '',
    dateTo: '',
    subjectName: ''
  });
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    averageAttendance: 0,
    uniqueGroups: 0,
    uniqueSubjects: 0,
    attendanceByGroup: []
  });

  useEffect(() => {
    loadCourses();
    loadGroups();
  }, []);

  useEffect(() => {
    if (filters.courseId) {
      loadSessionsByCourse(filters.courseId);
    } else {
      setSessions([]);
    }
  }, [filters.courseId]);

  const loadCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/courses`);
      if (!response.ok) throw new Error('Ошибка загрузки курсов');
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error('Ошибка загрузки курсов:', err);
      setError('Не удалось загрузить курсы');
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`);
      if (!response.ok) throw new Error('Ошибка загрузки групп');
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      console.error('Ошибка загрузки групп:', err);
    }
  };

  const loadSessionsByCourse = async (courseId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/sessions`);
      if (!response.ok) throw new Error('Ошибка загрузки сессий');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Ошибка загрузки сессий:', err);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.sessionId) params.append('sessionId', filters.sessionId);
      if (filters.group) params.append('group', filters.group);
      if (filters.studentName) params.append('studentName', filters.studentName);
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.subjectName) params.append('subjectName', filters.subjectName);

      const response = await fetch(
        `${API_BASE_URL}/api/teacher/${teacher.id}/attendance/report?${params}`
      );
      
      if (!response.ok) throw new Error('Ошибка загрузки данных');
      
      const data = await response.json();
      setAttendanceData(data.attendance);
      setStats(data.stats);
    } catch (err) {
      console.error('Ошибка загрузки посещаемости:', err);
      setError('Не удалось загрузить данные о посещаемости');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.group) params.append('groupId', filters.group);
      if (filters.subjectName) params.append('subjectName', filters.subjectName);
      
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/${teacher.id}/attendance/group-stats?${params}`
      );
      
      if (!response.ok) throw new Error('Ошибка загрузки статистики');
      
      const data = await response.json();
      setStats(prev => ({ ...prev, attendanceByGroup: data }));
    } catch (err) {
      console.error('Ошибка загрузки статистики по группам:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      courseId: '',
      sessionId: '',
      group: '',
      studentName: '',
      studentId: '',
      dateFrom: '',
      dateTo: '',
      subjectName: ''
    });
    setSessions([]);
    setTimeout(() => loadAttendanceData(), 100);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    let sortableItems = [...attendanceData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'sessionDate' || sortConfig.key === 'joinTime') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [attendanceData, sortConfig]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const exportToCSV = () => {
    const headers = ['Студент', 'Группа', 'Курс', 'Предмет', 'Дата лекции', 'Время входа', 'Статус'];
    const csvData = attendanceData.map(item => [
      item.studentName,
      item.groupName || item.group,
      item.courseTitle,
      item.subject || '-',
      formatShortDate(item.sessionDate),
      formatDate(item.joinTime),
      item.status || 'Присутствовал'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const headers = ['Студент', 'Группа', 'Курс', 'Предмет', 'Дата лекции', 'Время входа', 'Статус'];
    const rows = attendanceData.map(item => [
      item.studentName,
      item.groupName || item.group,
      item.courseTitle,
      item.subject || '-',
      formatShortDate(item.sessionDate),
      formatDate(item.joinTime),
      item.status || 'Присутствовал'
    ]);

    let html = '<table border="1">';
    html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    rows.forEach(row => {
      html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    html += '</table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAttendancePercentage = (attended, total) => {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
  };

  const getAverageAttendanceByGroup = () => {
    if (!stats.attendanceByGroup || stats.attendanceByGroup.length === 0) return [];
    
    const groupMap = new Map();
    stats.attendanceByGroup.forEach(item => {
      if (!groupMap.has(item.groupName)) {
        groupMap.set(item.groupName, {
          groupName: item.groupName,
          totalStudents: item.totalStudents,
          totalAttended: 0,
          totalSessions: 0,
          subjects: []
        });
      }
      const group = groupMap.get(item.groupName);
      group.totalAttended += item.attendedStudents || 0;
      group.totalSessions += item.sessionsCount || 0;
      if (item.subjectName) {
        group.subjects.push({
          subject: item.subjectName,
          attendancePercentage: item.attendancePercentage,
          attendedStudents: item.attendedStudents,
          totalStudents: item.totalStudents
        });
      }
    });
    
    return Array.from(groupMap.values()).map(group => ({
      ...group,
      averagePercentage: group.totalStudents > 0 
        ? Math.round((group.totalAttended / (group.totalStudents * (group.totalSessions || 1))) * 100)
        : 0
    }));
  };

  const renderStatsCards = () => {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '30px' 
      }}>
        <div style={{ border: '1px solid #e5e7eb', padding: '20px', borderRadius: '12px', background: 'white' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563EB' }}>{stats.totalStudents}</div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>Всего студентов</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', padding: '20px', borderRadius: '12px', background: 'white' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563EB' }}>{stats.totalSessions}</div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>Всего лекций</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', padding: '20px', borderRadius: '12px', background: 'white' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10B981' }}>{stats.averageAttendance}%</div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>Средняя посещаемость</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', padding: '20px', borderRadius: '12px', background: 'white' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#F59E0B' }}>{stats.uniqueGroups}</div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>Групп</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', padding: '20px', borderRadius: '12px', background: 'white' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8B5CF6' }}>{stats.uniqueSubjects}</div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>Предметов</div>
        </div>
      </div>
    );
  };

  const renderAttendanceByGroup = () => {
    const groupStats = getAverageAttendanceByGroup();
    
    if (groupStats.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          Нет данных о группах
        </div>
      );
    }
    
    return (
      <div>
        {groupStats.map(group => (
          <div key={group.groupName} style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px', 
            padding: '20px',
            marginBottom: '20px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{group.groupName}</h4>
              <div style={{ 
                padding: '8px 16px', 
                borderRadius: '20px', 
                background: group.averagePercentage >= 75 ? '#D1FAE5' : group.averagePercentage >= 50 ? '#FEF3C7' : '#FEE2E2',
                color: group.averagePercentage >= 75 ? '#065F46' : group.averagePercentage >= 50 ? '#92400E' : '#991B1B'
              }}>
                Посещаемость: {group.averagePercentage}%
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                height: '8px', 
                background: '#E5E7EB', 
                borderRadius: '4px', 
                overflow: 'hidden' 
              }}>
                <div style={{ 
                  width: `${group.averagePercentage}%`, 
                  height: '100%', 
                  background: group.averagePercentage >= 75 ? '#10B981' : group.averagePercentage >= 50 ? '#F59E0B' : '#EF4444',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              {group.subjects.map(subject => (
                <div key={subject.subject} style={{ 
                  padding: '12px', 
                  background: '#F9FAFB', 
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '8px' }}>{subject.subject}</div>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>
                    Посетило: {subject.attendedStudents || 0} / {subject.totalStudents}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ 
                      height: '4px', 
                      background: '#E5E7EB', 
                      borderRadius: '2px', 
                      overflow: 'hidden' 
                    }}>
                      <div style={{ 
                        width: `${subject.attendancePercentage}%`, 
                        height: '100%', 
                        background: subject.attendancePercentage >= 75 ? '#10B981' : subject.attendancePercentage >= 50 ? '#F59E0B' : '#EF4444'
                      }} />
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', textAlign: 'right', color: '#6B7280' }}>
                      {subject.attendancePercentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAttendanceBySubject = () => {
    const subjectMap = new Map();
    
    stats.attendanceByGroup?.forEach(item => {
      if (item.subjectName) {
        if (!subjectMap.has(item.subjectName)) {
          subjectMap.set(item.subjectName, {
            subject: item.subjectName,
            totalAttended: 0,
            totalStudents: 0,
            groups: []
          });
        }
        const subject = subjectMap.get(item.subjectName);
        subject.totalAttended += item.attendedStudents || 0;
        subject.totalStudents += item.totalStudents;
        subject.groups.push({
          groupName: item.groupName,
          attendancePercentage: item.attendancePercentage
        });
      }
    });
    
    const subjects = Array.from(subjectMap.values());
    
    if (subjects.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          Нет данных о предметах
        </div>
      );
    }
    
    return (
      <div style={{ display: 'grid', gap: '20px' }}>
        {subjects.map(subject => (
          <div key={subject.subject} style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px', 
            padding: '20px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{subject.subject}</h4>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Посетило: {subject.totalAttended} / {subject.totalStudents}
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                height: '8px', 
                background: '#E5E7EB', 
                borderRadius: '4px', 
                overflow: 'hidden' 
              }}>
                <div style={{ 
                  width: `${getAttendancePercentage(subject.totalAttended, subject.totalStudents)}%`, 
                  height: '100%', 
                  background: '#2563EB',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
              {subject.groups.map(group => (
                <div key={group.groupName} style={{ 
                  padding: '8px 12px', 
                  background: '#F3F4F6', 
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  {group.groupName}: {group.attendancePercentage}%
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        borderBottom: '2px solid #e5e7eb', 
        paddingBottom: '16px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#111827' }}>
          Отчёты по посещаемости
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={exportToCSV}
            disabled={attendanceData.length === 0}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: attendanceData.length === 0 ? '#E5E7EB' : '#10B981', 
              color: attendanceData.length === 0 ? '#9CA3AF' : 'white', 
              border: 'none',
              borderRadius: '8px',
              cursor: attendanceData.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Экспорт CSV
          </button>
          <button
            onClick={exportToExcel}
            disabled={attendanceData.length === 0}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: attendanceData.length === 0 ? '#E5E7EB' : '#10B981', 
              color: attendanceData.length === 0 ? '#9CA3AF' : 'white', 
              border: 'none',
              borderRadius: '8px',
              cursor: attendanceData.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Экспорт Excel
          </button>
          <button
            onClick={loadAttendanceData}
            disabled={loading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: loading ? '#E5E7EB' : '#2563EB', 
              color: loading ? '#9CA3AF' : 'white', 
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setActiveStatTab('overall')}
          style={{
            padding: '8px 20px',
            border: 'none',
            background: activeStatTab === 'overall' ? '#2563EB' : 'transparent',
            color: activeStatTab === 'overall' ? 'white' : '#6B7280',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          Общая статистика
        </button>
        <button
          onClick={() => {
            setActiveStatTab('byGroup');
            loadGroupStats();
          }}
          style={{
            padding: '8px 20px',
            border: 'none',
            background: activeStatTab === 'byGroup' ? '#2563EB' : 'transparent',
            color: activeStatTab === 'byGroup' ? 'white' : '#6B7280',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          По группам
        </button>
        <button
          onClick={() => {
            setActiveStatTab('bySubject');
            loadGroupStats();
          }}
          style={{
            padding: '8px 20px',
            border: 'none',
            background: activeStatTab === 'bySubject' ? '#2563EB' : 'transparent',
            color: activeStatTab === 'bySubject' ? 'white' : '#6B7280',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          По предметам
        </button>
      </div>

      {activeStatTab === 'overall' && renderStatsCards()}
      
      {activeStatTab === 'byGroup' && (
        <div className="animate-fadeIn" style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
            Посещаемость по группам
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка статистики...</div>
          ) : (
            renderAttendanceByGroup()
          )}
        </div>
      )}
      
      {activeStatTab === 'bySubject' && (
        <div className="animate-fadeIn" style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
            Посещаемость по предметам
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка статистики...</div>
          ) : (
            renderAttendanceBySubject()
          )}
        </div>
      )}

      <div style={{ 
        border: '1px solid #e5e7eb', 
        padding: '24px', 
        marginBottom: '30px', 
        borderRadius: '16px',
        background: 'white'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>
          Фильтры
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '16px' 
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Курс:
            </label>
            <select 
              name="courseId" 
              value={filters.courseId} 
              onChange={handleFilterChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="">Все курсы</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Лекция:
            </label>
            <select 
              name="sessionId" 
              value={filters.sessionId} 
              onChange={handleFilterChange}
              disabled={!filters.courseId}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px',
                background: !filters.courseId ? '#F9FAFB' : 'white'
              }}
            >
              <option value="">Все лекции</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.title || `Лекция ${formatShortDate(session.startTime)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Группа:
            </label>
            <select
              name="group"
              value={filters.group}
              onChange={handleFilterChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="">Все группы</option>
              {groups.map(group => (
                <option key={group.id} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Предмет:
            </label>
            <input
              type="text"
              name="subjectName"
              value={filters.subjectName}
              onChange={handleFilterChange}
              placeholder="Название предмета"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              ФИО студента:
            </label>
            <input
              type="text"
              name="studentName"
              value={filters.studentName}
              onChange={handleFilterChange}
              placeholder="Введите ФИО"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              ID студента:
            </label>
            <input
              type="text"
              name="studentId"
              value={filters.studentId}
              onChange={handleFilterChange}
              placeholder="ID студента"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Дата с:
            </label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
              Дата по:
            </label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
          <button 
            onClick={loadAttendanceData}
            disabled={loading}
            style={{ 
              padding: '10px 24px', 
              backgroundColor: loading ? '#E5E7EB' : '#2563EB', 
              color: loading ? '#9CA3AF' : 'white', 
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            Применить фильтры
          </button>
          <button 
            onClick={resetFilters}
            style={{ 
              padding: '10px 24px', 
              backgroundColor: '#F3F4F6', 
              color: '#374151', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Сбросить
          </button>
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Детальная информация
        </h3>
        {loading && <div style={{ padding: '40px', textAlign: 'center' }}>Загрузка данных...</div>}
        {error && <div style={{ padding: '20px', textAlign: 'center', color: '#DC2626', background: '#FEF2F2', borderRadius: '12px' }}>{error}</div>}
        
        {!loading && attendanceData.length === 0 ? (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            border: '1px solid #e5e7eb', 
            borderRadius: '16px',
            background: '#F9FAFB'
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Нет данных для отображения</p>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>Используйте фильтры для поиска</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #e5e7eb' }}>
                  <th onClick={() => requestSort('studentName')} style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Студент {sortConfig.key === 'studentName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('groupName')} style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Группа {sortConfig.key === 'groupName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('courseTitle')} style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Курс {sortConfig.key === 'courseTitle' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('subject')} style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Предмет {sortConfig.key === 'subject' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('sessionDate')} style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Дата лекции {sortConfig.key === 'sessionDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('joinTime')} style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Время входа {sortConfig.key === 'joinTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ padding: '14px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{item.studentName}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        {item.groupName || item.group}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{item.courseTitle}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {item.subject && (
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          {item.subject}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{formatShortDate(item.sessionDate)}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{formatDate(item.joinTime)}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#D1FAE5',
                        color: '#065F46',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {item.status || 'Присутствовал'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {attendanceData.length > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
            Всего записей: {attendanceData.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReports;