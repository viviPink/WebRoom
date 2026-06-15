import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const TeacherGroupsManager = ({ teacher, onUpdate }) => {
  const [groups, setGroups] = useState([]);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);

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

  const loadAllCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/courses`);
      if (!response.ok) throw new Error('Ошибка загрузки курсов');
      const data = await response.json();
      setAllCourses(data);
    } catch (err) {
      console.error('Ошибка загрузки курсов:', err);
    }
  };

  const loadTeacherGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacher.id}/groups-subjects`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setTeacherGroups(data);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Ошибка загрузки групп преподавателя:', err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Введите название группы');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() })
      });

      if (!response.ok) {
        if (response.status === 409) {
          alert('Группа уже существует');
        } else {
          throw new Error('Ошибка создания группы');
        }
        return;
      }

      const newGroup = await response.json();
      setGroups([...groups, newGroup]);
      setNewGroupName('');
      alert('Группа создана');
      await loadGroups();
    } catch (err) {
      console.error('Ошибка создания группы:', err);
      alert('Ошибка создания группы');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      alert('Введите название предмета');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teacher/courses/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacher.id,
          title: newCourseTitle.trim()
        })
      });

      if (!response.ok) throw new Error('Ошибка создания курса');

      const newCourse = await response.json();
      setAllCourses([...allCourses, newCourse]);
      setNewCourseTitle('');
      setShowCreateCourse(false);
      alert('Курс создан');
    } catch (err) {
      console.error('Ошибка создания предмета:', err);
      alert('Ошибка создания курса');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTeacher = async () => {
    if (!selectedGroup) {
      alert('Выберите группу');
      return;
    }
    if (!selectedCourseId) {
      alert('Выберите предмет');
      return;
    }

    const selectedCourse = allCourses.find(c => c.id === parseInt(selectedCourseId));
    if (!selectedCourse) {
      alert('Предмет не найден');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teacher/groups-subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacher.id,
          groupId: parseInt(selectedGroup),
          subjectName: selectedCourse.title
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          alert('Такая связь уже существует');
        } else {
          throw new Error('Ошибка добавления');
        }
        return;
      }

      await loadTeacherGroups();
      setSelectedGroup('');
      setSelectedCourseId('');
      alert('Связь добавлена');
    } catch (err) {
      console.error('Ошибка добавления:', err);
      alert('Ошибка добавления связи');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromTeacher = async (id) => {
    if (!window.confirm('Удалить связь с группой и предметом?')) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/teacher/groups-subjects/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      await loadTeacherGroups();
      alert('Связь удалена');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Ошибка удаления связи');
    } finally {
      setLoading(false);
    }
  };

const handleImportFile = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const fileExtension = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
    alert('Пожалуйста, загрузите файл в формате .xlsx, .xls или .csv');
    event.target.value = '';
    return;
  }
  
  setImportLoading(true);
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('teacherId', teacher.id);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/teacher/groups-subjects/import`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      let message = `Импорт завершён!\n`;
      message += `Добавлено групп: ${result.results.groupsCreated || 0}\n`;
      message += `Добавлено предметов: ${result.results.coursesCreated || 0}\n`;
      message += `Добавлено связей: ${result.results.created}\n`;
      message += `Пропущено (дубликаты): ${result.results.skipped || 0}`;
      
      if (result.results.errors && result.results.errors.length > 0) {
        message += `\nОшибок: ${result.results.errors.length}`;
        if (result.results.errors.length > 0) {
          message += `\n\nПример ошибок:\n${result.results.errors.slice(0, 3).join('\n')}`;
        }
      }
      
      alert(message);
      await loadTeacherGroups();
      await loadAllCourses();
      await loadGroups();
    } else {
      alert('Ошибка импорта: ' + (result.error || 'Неизвестная ошибка'));
    }
  } catch (err) {
    console.error('Ошибка при отправке:', err);
    alert('Ошибка при отправке файла: ' + err.message);
  } finally {
    setImportLoading(false);
    event.target.value = '';
  }
};

  const downloadExampleFile = () => {
    const exampleData = 'Группа,Предмет\nГруппа А,Математика\nГруппа А,Физика\nГруппа Б,Информатика\nГруппа Б,Математика';
    const blob = new Blob([exampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'example_groups_subjects.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadGroups();
    loadAllCourses();
    loadTeacherGroups();
  }, [teacher.id]);

  return (
    <div>
      <style jsx>{`
        .manager-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .panel {
          background-color: #f9fafb;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e5e7eb;
        }
        .panel-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        .input-field {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
        }
        .select-field {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background-color: white;
        }
        .btn-primary {
          padding: 10px 20px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #6750E0;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 8px 16px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-secondary:hover {
          background-color: #e5e7eb;
        }
        .btn-danger {
          padding: 6px 12px;
          background-color: #EF4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
        }
        .btn-danger:hover {
          background-color: #DC2626;
        }
        .items-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background-color: white;
          border-radius: 12px;
          margin-bottom: 8px;
          border: 1px solid #e5e7eb;
        }
        .item-info {
          flex: 1;
        }
        .item-group {
          font-weight: 600;
          color: #111827;
        }
        .item-subject {
          font-size: 14px;
          color: #7B61FF;
          font-weight: 500;
          margin-top: 4px;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6B7280;
        }
        .import-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        .import-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .import-label {
          display: inline-block;
          padding: 10px 20px;
          background-color: #10B981;
          color: white;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .import-label:hover {
          background-color: #059669;
        }
        .import-label.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .download-link {
          display: inline-block;
          padding: 10px 20px;
          background-color: #6366F1;
          color: white;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          border: none;
        }
        .download-link:hover {
          background-color: #4F46E5;
        }
        .file-input {
          display: none;
        }
        .help-text {
          font-size: 12px;
          color: #6B7280;
          margin-top: 8px;
          line-height: 1.5;
        }
        .create-course-area {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #e5e7eb;
        }
        .row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #7B61FF;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .manager-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="manager-container">
        <div className="panel">
          <h4 className="panel-title">Добавить связь группы и предмета</h4>
          
          <div className="form-group">
            <label>1. Создать новую группу (если нужно)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Название группы"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="input-field"
              />
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? '...' : 'Создать'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>2. Выбрать группу</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="select-field"
            >
              <option value="">Выберите группу</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>3. Выбрать предмет</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="select-field"
            >
              <option value="">Выберите предмет</option>
              {allCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            
            <div className="create-course-area">
              <button
                onClick={() => setShowCreateCourse(!showCreateCourse)}
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {showCreateCourse ? 'Отмена' : '+ Создать новый предмет'}
              </button>
              
              {showCreateCourse && (
                <div style={{ marginTop: '12px' }}>
                  <div className="row">
                    <input
                      type="text"
                      placeholder="Название нового предмета"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                      className="input-field"
                    />
                    <button
                      onClick={handleCreateCourse}
                      disabled={loading || !newCourseTitle.trim()}
                      className="btn-primary"
                    >
                      Создать
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToTeacher}
            disabled={loading || !selectedGroup || !selectedCourseId}
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading && <span className="loading-spinner"></span>}
            Добавить связь
          </button>

          <div className="import-section">
            <div className="import-buttons">
              <label className={`import-label ${importLoading ? 'disabled' : ''}`}>
                {importLoading ? 'Загрузка...' : 'Загрузить Excel файл'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportFile}
                  disabled={importLoading}
                  className="file-input"
                />
              </label>
              
              <button onClick={downloadExampleFile} className="download-link">
                Скачать пример файла
              </button>
            </div>
            
            <div className="help-text">
              Формат файла: колонки "Группа" и "Предмет"<br />
              Поддерживаемые форматы: .xlsx, .xls, .csv<br />
              Группы и предметы будут созданы автоматически<br />
              <strong>Пример:</strong> Группа А, Математика
            </div>
          </div>
        </div>

        <div className="panel">
          <h4 className="panel-title">Мои группы и предметы ({teacherGroups.length})</h4>
          
          <div className="items-list">
            {teacherGroups.length === 0 ? (
              <div className="empty-state">
                <p>У вас пока нет назначенных групп и предметов</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Добавьте их слева или загрузите Excel файл
                </p>
              </div>
            ) : (
              teacherGroups.map(item => (
                <div key={item.id} className="list-item">
                  <div className="item-info">
                    <div className="item-group">{item.groupName}</div>
                    <div className="item-subject">{item.subjectName}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveFromTeacher(item.id)}
                    disabled={loading}
                    className="btn-danger"
                  >
                    Удалить
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherGroupsManager;