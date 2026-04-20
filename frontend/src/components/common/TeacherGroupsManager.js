import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

const SOCKET_URL = API_BASE_URL;



const TeacherGroupsManager = ({ teacher, onUpdate }) => {
  const [groups, setGroups] = useState([]);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

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

  const handleAddToTeacher = async () => {
    if (!selectedGroup) {
      alert('Выберите группу');
      return;
    }
    if (!newSubject.trim()) {
      alert('Введите название предмета');
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
          subjectName: newSubject.trim()
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
      setNewSubject('');
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
    
    setImportLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        
        const response = await fetch(`${API_BASE_URL}/api/teacher/groups-subjects/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId: teacher.id,
            fileData: base64
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(`Импорт завершён\nДобавлено: ${result.results.created}\nПропущено: ${result.results.skipped}`);
          if (result.results.errors.length > 0) {
            console.warn('Ошибки импорта:', result.results.errors);
          }
          await loadTeacherGroups();
        } else {
          alert('Ошибка импорта: ' + result.error);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Ошибка импорта:', err);
      alert('Ошибка при загрузке файла');
    } finally {
      setImportLoading(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    loadGroups();
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
          background-color: #2563EB;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #1D4ED8;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 10px 20px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
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
          color: #6B7280;
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
        .file-input {
          display: none;
        }
        .help-text {
          font-size: 12px;
          color: #6B7280;
          margin-top: 8px;
        }
        @media (max-width: 768px) {
          .manager-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="manager-container">
        <div className="panel">
          <h4 className="panel-title">Добавить группу и предмет</h4>
          
          <div className="form-group">
            <label>Создать новую группу</label>
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
                className="btn-primary"
              >
                Создать
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Выбрать группу</label>
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
            <label>Предмет</label>
            <input
              type="text"
              placeholder="Название предмета"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            onClick={handleAddToTeacher}
            disabled={loading || !selectedGroup || !newSubject.trim()}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            Добавить группу и предмет
          </button>

          <div className="import-section">
            <label className="import-label">
              Загрузить Excel файл
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                disabled={importLoading}
                className="file-input"
              />
            </label>
            {importLoading && <div style={{ marginTop: '8px', fontSize: '14px', color: '#6B7280' }}>Загрузка...</div>}
            <div className="help-text">
              Формат файла: колонки "Группа" и "Предмет". Поддерживаются .xlsx, .xls, .csv
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