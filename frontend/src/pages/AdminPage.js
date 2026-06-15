import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const AdminPage = ({ admin, onBack }) => {
  const isSuper = admin?.is_super === true;
  const [activeTab, setActiveTab] = useState('content');
  const [teachers, setTeachers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [modelConfig, setModelConfig] = useState({ url: '', model: '', temperature: 0.3 });
  const [content, setContent] = useState({ recordings: [], materials: [] });
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentFilter, setContentFilter] = useState('all');
  const [contentSearch, setContentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [newAdmin, setNewAdmin] = useState({ login: '', password: '', name: '', universityId: '' });
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newUni, setNewUni] = useState({ name: '', short_name: '' });
  const [showAddUni, setShowAddUni] = useState(false);
  
  // Массовое удаление
  const [selectedRecordings, setSelectedRecordings] = useState(new Set());
  const [selectedMaterials, setSelectedMaterials] = useState(new Set());
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [selectedAdmins, setSelectedAdmins] = useState(new Set());
  const [selectedUniversities, setSelectedUniversities] = useState(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [batchDeleteType, setBatchDeleteType] = useState(null);
  
  // Редактирование
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState(null);

  const commonTabs = [
    { id: 'content', label: 'Контент' },
    { id: 'model', label: 'Модель AI' },
  ];

  const superTabs = [
    { id: 'teachers', label: 'Преподаватели' },
    { id: 'universities', label: 'Вузы' },
    { id: 'admins', label: 'Администраторы' },
  ];

  const tabs = [...commonTabs, ...(isSuper ? superTabs : [])];

  useEffect(() => {
    fetchContent();
    fetchModelConfig();
    if (isSuper) {
      fetchTeachers();
      fetchAdmins();
      fetchUniversities();
    }
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) setTeachers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/list`, {
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) setAdmins(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchModelConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/model-config`, {
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) setModelConfig(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchContent = async () => {
    setLoadingContent(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/content`, {
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) setContent(await res.json());
    } catch (e) { console.error(e); }
    setLoadingContent(false);
  };

  const fetchUniversities = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/universities`, {
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) setUniversities(await res.json());
    } catch (e) { console.error(e); }
  };

  // Редактирование с двойным кликом
  const handleDoubleClickTeacher = (teacher) => {
    setEditType('teacher');
    setEditingItem(teacher);
    setEditForm({
      name: teacher.name,
      email: teacher.email,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleDoubleClickAdmin = (adminUser) => {
    setEditType('admin');
    setEditingItem(adminUser);
    setEditForm({
      name: adminUser.name,
      email: adminUser.login,
      password: ''
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      showMsg('Заполните имя и email/логин', 'error');
      return;
    }

    setLoading(true);
    try {
      let url = '';
      let body = {};

      if (editType === 'teacher') {
        url = `${API_BASE_URL}/api/admin/teachers/${editingItem.id}`;
        body = {
          name: editForm.name,
          email: editForm.email,
          password: editForm.password || undefined
        };
      } else if (editType === 'admin') {
        url = `${API_BASE_URL}/api/admin/admins/${editingItem.id}`;
        body = {
          name: editForm.name,
          login: editForm.email,
          password: editForm.password || undefined
        };
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': admin.id
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showMsg('Данные обновлены');
        setShowEditModal(false);
        setEditingItem(null);
        if (editType === 'teacher') fetchTeachers();
        if (editType === 'admin') fetchAdmins();
      } else {
        const error = await res.json();
        showMsg(error.error || 'Ошибка при обновлении', 'error');
      }
    } catch (e) {
      showMsg('Ошибка соединения', 'error');
    }
    setLoading(false);
  };

  // Массовое удаление
  const toggleSelectRecording = (id) => {
    const newSelected = new Set(selectedRecordings);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRecordings(newSelected);
  };

  const toggleSelectMaterial = (id) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedMaterials(newSelected);
  };

  const toggleSelectTeacher = (id) => {
    const newSelected = new Set(selectedTeachers);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTeachers(newSelected);
  };

  const toggleSelectAdmin = (id) => {
    const newSelected = new Set(selectedAdmins);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedAdmins(newSelected);
  };

  const toggleSelectUniversity = (id) => {
    const newSelected = new Set(selectedUniversities);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedUniversities(newSelected);
  };

  const selectAllRecordings = () => {
    if (selectedRecordings.size === content.recordings.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(content.recordings.map(r => r.id)));
    }
  };

  const selectAllMaterials = () => {
    if (selectedMaterials.size === content.materials.length) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(new Set(content.materials.map(m => m.id)));
    }
  };

  const selectAllTeachers = () => {
    if (selectedTeachers.size === teachers.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(teachers.map(t => t.id)));
    }
  };

  const selectAllAdmins = () => {
    if (selectedAdmins.size === admins.length) {
      setSelectedAdmins(new Set());
    } else {
      setSelectedAdmins(new Set(admins.map(a => a.id)));
    }
  };

  const selectAllUniversities = () => {
    if (selectedUniversities.size === universities.length) {
      setSelectedUniversities(new Set());
    } else {
      setSelectedUniversities(new Set(universities.map(u => u.id)));
    }
  };

  const batchDeleteRecordings = async () => {
    if (selectedRecordings.size === 0) return;
    setLoading(true);
    let successCount = 0;

    for (const id of selectedRecordings) {
      const res = await fetch(`${API_BASE_URL}/api/admin/recordings/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) successCount++;
    }

    if (successCount > 0) {
      showMsg(`Удалено записей: ${successCount}`);
      fetchContent();
      setSelectedRecordings(new Set());
    }
    setLoading(false);
    setShowBatchDeleteConfirm(false);
  };

  const batchDeleteMaterials = async () => {
    if (selectedMaterials.size === 0) return;
    setLoading(true);
    let successCount = 0;

    for (const id of selectedMaterials) {
      const res = await fetch(`${API_BASE_URL}/api/admin/materials/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) successCount++;
    }

    if (successCount > 0) {
      showMsg(`Удалено материалов: ${successCount}`);
      fetchContent();
      setSelectedMaterials(new Set());
    }
    setLoading(false);
    setShowBatchDeleteConfirm(false);
  };

  const batchDeleteTeachers = async () => {
    if (selectedTeachers.size === 0) return;
    setLoading(true);
    let successCount = 0;

    for (const id of selectedTeachers) {
      const res = await fetch(`${API_BASE_URL}/api/admin/teachers/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) successCount++;
    }

    if (successCount > 0) {
      showMsg(`Удалено преподавателей: ${successCount}`);
      fetchTeachers();
      setSelectedTeachers(new Set());
    }
    setLoading(false);
    setShowBatchDeleteConfirm(false);
  };

  const batchDeleteAdmins = async () => {
    if (selectedAdmins.size === 0) return;
    
    if (selectedAdmins.has(admin.id)) {
      showMsg('Нельзя удалить самого себя', 'error');
      return;
    }

    setLoading(true);
    let successCount = 0;

    for (const id of selectedAdmins) {
      const res = await fetch(`${API_BASE_URL}/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) successCount++;
    }

    if (successCount > 0) {
      showMsg(`Удалено администраторов: ${successCount}`);
      fetchAdmins();
      setSelectedAdmins(new Set());
    }
    setLoading(false);
    setShowBatchDeleteConfirm(false);
  };

  const batchDeleteUniversities = async () => {
    if (selectedUniversities.size === 0) return;
    setLoading(true);
    let successCount = 0;

    for (const id of selectedUniversities) {
      const res = await fetch(`${API_BASE_URL}/api/admin/universities/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': admin.id }
      });
      if (res.ok) successCount++;
    }

    if (successCount > 0) {
      showMsg(`Удалено вузов: ${successCount}`);
      fetchUniversities();
      setSelectedUniversities(new Set());
    }
    setLoading(false);
    setShowBatchDeleteConfirm(false);
  };

  const promoteToAdmin = async (teacherId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': admin.id },
        body: JSON.stringify({ teacherId })
      });
      if (res.ok) {
        showMsg('Преподаватель назначен администратором');
        fetchTeachers();
        fetchAdmins();
      } else {
        showMsg('Ошибка при назначении', 'error');
      }
    } catch (e) { showMsg('Ошибка соединения', 'error'); }
    setLoading(false);
  };

  const demoteAdmin = async (adminId) => {
    if (adminId === admin.id) {
      showMsg('Нельзя снять права с самого себя', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/demote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': admin.id },
        body: JSON.stringify({ adminId })
      });
      if (res.ok) {
        showMsg('Права администратора сняты');
        fetchAdmins();
      } else {
        showMsg('Ошибка при снятии прав', 'error');
      }
    } catch (e) { showMsg('Ошибка соединения', 'error'); }
    setLoading(false);
  };

  const createAdmin = async () => {
    if (!newAdmin.login.trim() || !newAdmin.password.trim() || !newAdmin.name.trim()) {
      showMsg('Заполните все поля', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': admin.id },
        body: JSON.stringify({
          login: newAdmin.login,
          password: newAdmin.password,
          name: newAdmin.name,
          universityId: newAdmin.universityId || null
        })
      });
      if (res.ok) {
        showMsg('Администратор создан');
        setNewAdmin({ login: '', password: '', name: '', universityId: '' });
        setShowAddAdmin(false);
        fetchAdmins();
      } else {
        const d = await res.json();
        showMsg(d.error || 'Ошибка при создании', 'error');
      }
    } catch (e) { showMsg('Ошибка соединения', 'error'); }
    setLoading(false);
  };

  const createUniversity = async () => {
    if (!newUni.name.trim()) { showMsg('Укажите название вуза', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/universities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': admin.id },
        body: JSON.stringify(newUni)
      });
      if (res.ok) {
        showMsg('Вуз добавлен');
        setNewUni({ name: '', short_name: '' });
        setShowAddUni(false);
        fetchUniversities();
      } else {
        const d = await res.json();
        showMsg(d.error || 'Ошибка при создании', 'error');
      }
    } catch (e) { showMsg('Ошибка соединения', 'error'); }
    setLoading(false);
  };

  const saveModelConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/model-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': admin.id },
        body: JSON.stringify(modelConfig)
      });
      if (res.ok) {
        showMsg('Настройки модели сохранены');
      } else {
        showMsg('Ошибка при сохранении', 'error');
      }
    } catch (e) { showMsg('Ошибка соединения', 'error'); }
    setLoading(false);
  };

  const deleteSingleRecording = async (id) => {
    if (!window.confirm('Удалить эту запись?')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/recordings/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-id': admin.id }
    });
    if (res.ok) {
      showMsg('Запись удалена');
      fetchContent();
    } else {
      showMsg('Ошибка при удалении', 'error');
    }
  };

  const deleteSingleMaterial = async (id) => {
    if (!window.confirm('Удалить этот материал?')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/materials/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-id': admin.id }
    });
    if (res.ok) {
      showMsg('Материал удалён');
      fetchContent();
    } else {
      showMsg('Ошибка при удалении', 'error');
    }
  };

  const deleteSingleTeacher = async (id) => {
    if (!window.confirm('Удалить преподавателя?')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/teachers/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-id': admin.id }
    });
    if (res.ok) {
      showMsg('Преподаватель удалён');
      fetchTeachers();
    } else {
      showMsg('Ошибка при удалении', 'error');
    }
  };

  const deleteSingleUniversity = async (id) => {
    if (!window.confirm('Удалить вуз?')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/universities/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-id': admin.id }
    });
    if (res.ok) {
      showMsg('Вуз удалён');
      fetchUniversities();
    } else {
      showMsg('Ошибка при удалении', 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const BatchDeleteModal = () => (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3 style={modalStyles.title}>Подтверждение удаления</h3>
        <p style={modalStyles.message}>
          Вы действительно хотите удалить выбранные элементы? Это действие нельзя отменить.
        </p>
        <div style={modalStyles.buttons}>
          <button onClick={() => setShowBatchDeleteConfirm(false)} style={modalStyles.cancelButton}>
            Отмена
          </button>
          <button onClick={() => {
            if (batchDeleteType === 'recordings') batchDeleteRecordings();
            else if (batchDeleteType === 'materials') batchDeleteMaterials();
            else if (batchDeleteType === 'teachers') batchDeleteTeachers();
            else if (batchDeleteType === 'admins') batchDeleteAdmins();
            else if (batchDeleteType === 'universities') batchDeleteUniversities();
          }} style={modalStyles.confirmButton}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );

  const EditModal = () => (
    <div style={modalStyles.overlay}>
      <div style={{...modalStyles.modal, width: '450px'}}>
        <h3 style={modalStyles.title}>
          Редактирование {editType === 'teacher' ? 'преподавателя' : 'администратора'}
        </h3>
        <div style={modalStyles.form}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>ФИО</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              style={modalStyles.input}
              placeholder="Введите ФИО"
            />
          </div>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>{editType === 'teacher' ? 'Пароль (логин)' : 'Логин'}</label>
            <input
              type="text"
              value={editForm.email}
              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              style={modalStyles.input}
              placeholder={editType === 'teacher' ? 'Введите пароль' : 'Введите логин'}
            />
          </div>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Новый пароль (оставьте пустым, чтобы не менять)</label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({...editForm, password: e.target.value})}
              style={modalStyles.input}
              placeholder="Введите новый пароль"
            />
          </div>
          <div style={modalStyles.hint}>
            Для преподавателя поле "Пароль (логин)" используется как email для входа
          </div>
        </div>
        <div style={modalStyles.buttons}>
          <button onClick={() => setShowEditModal(false)} style={modalStyles.cancelButton}>
            Отмена
          </button>
          <button onClick={saveEdit} disabled={loading} style={modalStyles.confirmButton}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.container}>
      {showBatchDeleteConfirm && <BatchDeleteModal />}
      {showEditModal && <EditModal />}
      
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logoIcon}></div>
          <span style={S.logo}>ВебРум</span>
          <span style={S.headerDivider}>|</span>
          <span style={S.headerRole}>Панель администратора</span>
        </div>
        <div style={S.headerRight}>
          <span style={S.adminName}>{admin.name || admin.login}{isSuper && <span style={S.superBadge}>Главный</span>}</span>
          <button onClick={onBack} style={S.backButton}>Выйти</button>
        </div>
      </div>
      
      <div style={S.layout}>
        <div style={S.sidebar}>
          <div style={S.sidebarTitle}>Навигация</div>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...S.sidebarItem, ...(activeTab === tab.id ? S.sidebarItemActive : {}) }}>
              {tab.label}
            </button>
          ))}
        </div>
        
        <div style={S.content}>
          {message && <div style={{ ...S.toast, background: messageType === 'error' ? '#FEE2E2' : '#D1FAE5', color: messageType === 'error' ? '#DC2626' : '#065F46' }}>{message}</div>}
          
          {/* Контент */}
          {activeTab === 'content' && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>Контент</h2>
                <p style={S.pageSubtitle}>Записи и материалы всех преподавателей</p>
              </div>
              
              <div style={{display:'flex',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}}>
                <input style={{...S.input,flex:1,minWidth:'200px'}} placeholder="Поиск..." value={contentSearch} onChange={e=>setContentSearch(e.target.value)}/>
                <select style={{...S.input,width:'auto'}} value={contentFilter} onChange={e=>setContentFilter(e.target.value)}>
                  <option value="all">Всё</option>
                  <option value="recordings">Записи</option>
                  <option value="materials">Материалы</option>
                </select>
                <button onClick={fetchContent} disabled={loadingContent} style={S.ghostButton}>{loadingContent?'...':'Обновить'}</button>
              </div>
              
              {/* Записи */}
              {(contentFilter==='all'||contentFilter==='recordings') && (
                <div style={{marginBottom:'24px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <h3 style={S.sectionTitle}>
                      Записи ({content.recordings.filter(r=>{const q=contentSearch.toLowerCase();return !q||(r.title||'').toLowerCase().includes(q)||(r.teacherName||'').toLowerCase().includes(q);}).length})
                    </h3>
                    {selectedRecordings.size > 0 && (
                      <button onClick={() => {
                        setBatchDeleteType('recordings');
                        setShowBatchDeleteConfirm(true);
                      }} style={S.dangerButton}>
                        Удалить выбранные ({selectedRecordings.size})
                      </button>
                    )}
                  </div>
                  <div style={S.tableWrapper}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={{...S.th, width: '40px'}}>
                            <input type="checkbox" checked={selectedRecordings.size === content.recordings.length && content.recordings.length > 0} onChange={selectAllRecordings}/>
                          </th>
                          <th style={S.th}>Название</th>
                          <th style={S.th}>Тип</th>
                          <th style={S.th}>Преподаватель</th>
                          <th style={S.th}>Курс</th>
                          <th style={S.th}>Размер</th>
                          <th style={S.th}>Дата</th>
                          <th style={S.th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.recordings.filter(r=>{const q=contentSearch.toLowerCase();return !q||(r.title||'').toLowerCase().includes(q)||(r.teacherName||'').toLowerCase().includes(q);}).map((r,i)=>(
                          <tr key={r.id} style={i%2===0?S.trEven:{}}>
                            <td style={{...S.td, textAlign: 'center'}}>
                              <input type="checkbox" checked={selectedRecordings.has(r.id)} onChange={() => toggleSelectRecording(r.id)}/>
                            </td>
                            <td style={S.td}>{r.title||'Без названия'}</td>
                            <td style={S.td}><span style={r.type==='video'?S.badgeVideo:S.badgeAudio}>{r.type==='video'?'Видео':'Аудио'}</span></td>
                            <td style={S.td}>{r.teacherName||'—'}</td>
                            <td style={S.td}>{r.courseTitle||'—'}</td>
                            <td style={S.td}>{formatFileSize(r.fileSize)}</td>
                            <td style={S.td}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</td>
                            <td style={S.td}>
                              <button onClick={() => deleteSingleRecording(r.id)} disabled={loading} style={S.dangerButtonSmall}>Удалить</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Материалы */}
              {(contentFilter==='all'||contentFilter==='materials') && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <h3 style={S.sectionTitle}>
                      Материалы ({content.materials.filter(m=>{const q=contentSearch.toLowerCase();return !q||(m.originalName||'').toLowerCase().includes(q)||(m.teacherName||'').toLowerCase().includes(q);}).length})
                    </h3>
                    {selectedMaterials.size > 0 && (
                      <button onClick={() => {
                        setBatchDeleteType('materials');
                        setShowBatchDeleteConfirm(true);
                      }} style={S.dangerButton}>
                        Удалить выбранные ({selectedMaterials.size})
                      </button>
                    )}
                  </div>
                  <div style={S.tableWrapper}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={{...S.th, width: '40px'}}>
                            <input type="checkbox" checked={selectedMaterials.size === content.materials.length && content.materials.length > 0} onChange={selectAllMaterials}/>
                          </th>
                          <th style={S.th}>Файл</th>
                          <th style={S.th}>Преподаватель</th>
                          <th style={S.th}>Курс</th>
                          <th style={S.th}>Размер</th>
                          <th style={S.th}>Дата</th>
                          <th style={S.th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.materials.filter(m=>{const q=contentSearch.toLowerCase();return !q||(m.originalName||'').toLowerCase().includes(q)||(m.teacherName||'').toLowerCase().includes(q);}).map((m,i)=>(
                          <tr key={m.id} style={i%2===0?S.trEven:{}}>
                            <td style={{...S.td, textAlign: 'center'}}>
                              <input type="checkbox" checked={selectedMaterials.has(m.id)} onChange={() => toggleSelectMaterial(m.id)}/>
                            </td>
                            <td style={S.td}>{m.originalName}</td>
                            <td style={S.td}>{m.teacherName||'—'}</td>
                            <td style={S.td}>{m.courseTitle||'—'}</td>
                            <td style={S.td}>{formatFileSize(m.fileSize)}</td>
                            <td style={S.td}>{new Date(m.createdAt).toLocaleDateString('ru-RU')}</td>
                            <td style={S.td}>
                              <button onClick={() => deleteSingleMaterial(m.id)} disabled={loading} style={S.dangerButtonSmall}>Удалить</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Преподаватели */}
          {activeTab === 'teachers' && isSuper && (
            <div>
              <div style={S.pageHeader}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <h2 style={S.pageTitle}>Преподаватели</h2>
                    <p style={S.pageSubtitle}>Двойной клик по строке для редактирования ФИО или пароля</p>
                  </div>
                  {selectedTeachers.size > 0 && (
                    <button onClick={() => {
                      setBatchDeleteType('teachers');
                      setShowBatchDeleteConfirm(true);
                    }} style={S.dangerButton}>
                      Удалить выбранных ({selectedTeachers.size})
                    </button>
                  )}
                </div>
              </div>
              <div style={S.tableWrapper}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{...S.th, width: '40px'}}>
                        <input type="checkbox" checked={selectedTeachers.size === teachers.length && teachers.length > 0} onChange={selectAllTeachers}/>
                      </th>
                      <th style={S.th}>ФИО</th>
                      <th style={S.th}>Пароль (логин)</th>
                      <th style={S.th}>Вуз</th>
                      <th style={S.th}>Статус</th>
                      <th style={S.th}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length === 0 ? (
                      <tr><td colSpan={6} style={S.emptyCell}>Нет преподавателей</td></tr>
                    ) : teachers.map((t,i) => (
                      <tr key={t.id} style={i%2===0?S.trEven:{}} onDoubleClick={() => handleDoubleClickTeacher(t)}>
                        <td style={{...S.td, textAlign: 'center'}}>
                          <input type="checkbox" checked={selectedTeachers.has(t.id)} onChange={() => toggleSelectTeacher(t.id)}/>
                          
                            </td>
                        <td style={S.td}>{t.name}</td>
                        <td style={S.td}>{t.email}</td>
                        <td style={S.td}>{t.universityName || <span style={{color:'#9CA3AF'}}>—</span>}</td>
                        <td style={S.td}>
                          <span style={t.is_admin?S.badgeAdmin:S.badgeTeacher}>
                            {t.is_admin?'Администратор':'Преподаватель'}
                          </span>
                        </td>
                        <td style={S.td}>
                          {!t.is_admin && (
                            <button onClick={()=>promoteToAdmin(t.id)} disabled={loading} style={S.purpleButton}>
                              Назначить админом
                            </button>
                          )}
                          <button onClick={() => deleteSingleTeacher(t.id)} disabled={loading} style={{...S.dangerButtonSmall, marginLeft: '8px'}}>
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Администраторы */}
          {activeTab === 'admins' && isSuper && (
            <div>
              <div style={S.pageHeader}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <h2 style={S.pageTitle}>Администраторы</h2>
                    <p style={S.pageSubtitle}>Двойной клик по строке для редактирования имени или логина</p>
                  </div>
                  <button onClick={()=>setShowAddAdmin(!showAddAdmin)} style={S.primaryButton}>
                    {showAddAdmin?'Отмена':'Добавить'}
                  </button>
                </div>
              </div>
              
              {showAddAdmin && (
                <div style={{...S.card,marginBottom:'24px'}}>
                  <h3 style={S.cardTitle}>Новый администратор</h3>
                  <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                    <div style={{...S.formGroup,flex:1,minWidth:'160px'}}>
                      <label style={S.label}>Имя</label>
                      <input style={S.input} placeholder="Иванов Иван" value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin,name:e.target.value})}/>
                    </div>
                    <div style={{...S.formGroup,flex:1,minWidth:'160px'}}>
                      <label style={S.label}>Логин</label>
                      <input style={S.input} placeholder="admin2" value={newAdmin.login} onChange={e=>setNewAdmin({...newAdmin,login:e.target.value})}/>
                    </div>
                    <div style={{...S.formGroup,flex:1,minWidth:'160px'}}>
                      <label style={S.label}>Пароль</label>
                      <input style={S.input} type="password" placeholder="********" value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin,password:e.target.value})}/>
                    </div>
                    <div style={{...S.formGroup,flex:'0 0 100%'}}>
                      <label style={S.label}>Вуз</label>
                      <select style={S.input} value={newAdmin.universityId} onChange={e=>setNewAdmin({...newAdmin,universityId:e.target.value})}>
                        <option value="">— Не привязан (суперадмин) —</option>
                        {universities.map(u=><option key={u.id} value={u.id}>{u.name}{u.short_name?` (${u.short_name})`:''}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
                    <button onClick={createAdmin} disabled={loading} style={S.primaryButton}>Создать</button>
                    <button onClick={()=>setShowAddAdmin(false)} style={S.ghostButton}>Отмена</button>
                  </div>
                </div>
              )}
              
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                {selectedAdmins.size > 0 && (
                  <button onClick={() => {
                    setBatchDeleteType('admins');
                    setShowBatchDeleteConfirm(true);
                  }} style={S.dangerButton}>
                    Удалить выбранных ({selectedAdmins.size})
                  </button>
                )}
              </div>
              
              <div style={S.tableWrapper}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{...S.th, width: '40px'}}>
                        <input type="checkbox" checked={selectedAdmins.size === admins.length && admins.length > 0} onChange={selectAllAdmins}/>
                      </th>
                      <th style={S.th}>Имя</th>
                      <th style={S.th}>Логин</th>
                      <th style={S.th}>Вуз</th>
                      <th style={S.th}>Роль</th>
                      <th style={S.th}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a,i)=>(
                      <tr key={a.id} style={i%2===0?S.trEven:{}} onDoubleClick={() => handleDoubleClickAdmin(a)}>
                        <td style={{...S.td, textAlign: 'center'}}>
                          <input type="checkbox" checked={selectedAdmins.has(a.id)} onChange={() => toggleSelectAdmin(a.id)} disabled={a.id === admin.id || a.is_super}/>
                          
                            </td>
                        <td style={S.td}>{a.name}</td>
                        <td style={S.td}>{a.login}</td>
                        <td style={S.td}>{universities.find(u=>u.id===a.universityId)?.short_name||universities.find(u=>u.id===a.universityId)?.name||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                        <td style={S.td}><span style={a.is_super?S.badgeSuper:S.badgeAdmin}>{a.is_super?'Главный':'Администратор'}</span></td>
                        <td style={S.td}>
                          {a.id === admin.id ? (
                            <span style={S.selfBadge}>Это вы</span>
                          ) : a.is_super ? (
                            <span style={S.selfBadge}>Главный</span>
                          ) : (
                            <>
                              <button onClick={()=>demoteAdmin(a.id)} disabled={loading} style={S.purpleButtonSmall}>
                                Снять права
                              </button>
                              <button onClick={() => deleteSingleTeacher(a.id)} style={{...S.dangerButtonSmall, marginLeft: '8px'}}>
                                Удалить
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Вузы */}
          {activeTab === 'universities' && isSuper && (
            <div>
              <div style={S.pageHeader}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <h2 style={S.pageTitle}>Вузы</h2>
                    <p style={S.pageSubtitle}>Управление учебными заведениями</p>
                  </div>
                  <button onClick={()=>setShowAddUni(!showAddUni)} style={S.primaryButton}>
                    {showAddUni?'Отмена':'Добавить вуз'}
                  </button>
                </div>
              </div>
              
              {showAddUni && (
                <div style={{...S.card,marginBottom:'24px'}}>
                  <h3 style={S.cardTitle}>Новый вуз</h3>
                  <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                    <div style={{...S.formGroup,flex:2,minWidth:'240px'}}>
                      <label style={S.label}>Полное название</label>
                      <input style={S.input} placeholder="Забайкальский государственный университет" value={newUni.name} onChange={e=>setNewUni({...newUni,name:e.target.value})}/>
                    </div>
                    <div style={{...S.formGroup,flex:1,minWidth:'120px'}}>
                      <label style={S.label}>Аббревиатура</label>
                      <input style={S.input} placeholder="ЗабГУ" value={newUni.short_name} onChange={e=>setNewUni({...newUni,short_name:e.target.value})}/>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
                    <button onClick={createUniversity} disabled={loading} style={S.primaryButton}>Добавить</button>
                    <button onClick={()=>setShowAddUni(false)} style={S.ghostButton}>Отмена</button>
                  </div>
                </div>
              )}
              
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                {selectedUniversities.size > 0 && (
                  <button onClick={() => {
                    setBatchDeleteType('universities');
                    setShowBatchDeleteConfirm(true);
                  }} style={S.dangerButton}>
                    Удалить выбранные ({selectedUniversities.size})
                  </button>
                )}
              </div>
              
              <div style={S.tableWrapper}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{...S.th, width: '40px'}}>
                        <input type="checkbox" checked={selectedUniversities.size === universities.length && universities.length > 0} onChange={selectAllUniversities}/>
                      </th>
                      <th style={S.th}>Вуз</th>
                      <th style={S.th}>Аббревиатура</th>
                      <th style={S.th}>Преподаватели</th>
                      <th style={S.th}>Студенты</th>
                      <th style={S.th}>Добавлен</th>
                      <th style={S.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {universities.length===0 ? (
                      <tr><td colSpan={7} style={S.emptyCell}>Нет вузов</td></tr>
                    ) : universities.map((u,i)=>(
                      <tr key={u.id} style={i%2===0?S.trEven:{}}>
                        <td style={{...S.td, textAlign: 'center'}}>
                          <input type="checkbox" checked={selectedUniversities.has(u.id)} onChange={() => toggleSelectUniversity(u.id)}/>
                          
                            </td>
                        <td style={S.td}><strong>{u.name}</strong></td>
                        <td style={S.td}>{u.short_name||'—'}</td>
                        <td style={S.td}><span style={{...S.badgeTeacher,fontWeight:600}}>{u.teacher_count||0}</span></td>
                        <td style={S.td}><span style={{...S.badgeAdmin,fontWeight:600}}>{u.student_count||0}</span></td>
                        <td style={S.td}>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                        <td style={S.td}>
                          <button onClick={()=>deleteSingleUniversity(u.id)} disabled={loading} style={S.dangerButtonSmall}>Удалить</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Модель AI */}
          {activeTab === 'model' && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>Модель AI</h2>
                <p style={S.pageSubtitle}>Параметры LM Studio для обработки транскрипций</p>
              </div>
              <div style={S.card}>
                <div style={S.formGroup}>
                  <label style={S.label}>URL LM Studio</label>
                  <input style={S.input} placeholder="http://192.168.0.20:1234" value={modelConfig.url} onChange={e=>setModelConfig({...modelConfig,url:e.target.value})}/>
                  <span style={S.hint}>Адрес сервера LM Studio</span>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Название модели</label>
                  <input style={S.input} placeholder="qwen2.5-7b-instruct-1m" value={modelConfig.model} onChange={e=>setModelConfig({...modelConfig,model:e.target.value})}/>
                  <span style={S.hint}>Точное название модели в LM Studio</span>
                </div>
                <button onClick={saveModelConfig} disabled={loading} style={S.primaryButton}>
                  {loading?'Сохранение...':'Сохранить настройки'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '400px',
    maxWidth: '90%'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827'
  },
  message: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  form: {
    marginBottom: '24px'
  },
  field: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  hint: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginTop: '8px',
    fontStyle: 'italic'
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: '#7B61FF',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

const S = {
  container: { minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', background: '#fff', borderBottom: '1px solid #E5E7EB' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoIcon: { width: '48px', height: '48px', backgroundColor: '#7B61FF', borderRadius: '12px' },
  logo: { fontSize: '20px', fontWeight: '700', color: '#111827' },
  headerDivider: { color: '#D1D5DB', fontSize: '20px' },
  headerRole: { fontSize: '14px', color: '#6B7280', fontWeight: '500' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  adminName: { fontSize: '14px', color: '#374151', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
  superBadge: { padding: '2px 8px', background: '#111827', color: '#fff', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginLeft: '6px' },
  backButton: { background: 'none', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', color: '#6B7280', cursor: 'pointer' },
  layout: { display: 'flex', minHeight: 'calc(100vh - 65px)' },
  sidebar: { width: '220px', background: '#fff', borderRight: '1px solid #E5E7EB', padding: '24px 12px', flexShrink: 0 },
  sidebarTitle: { fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: '8px' },
  sidebarItem: { display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px', border: 'none', borderRadius: '8px', background: 'none', fontSize: '14px', color: '#374151', cursor: 'pointer', textAlign: 'left', marginBottom: '2px' },
  sidebarItemActive: { background: '#F3F4F6', fontWeight: '600', color: '#111827' },
  content: { flex: 1, padding: '32px 40px', maxWidth: '1100px' },
  pageHeader: { marginBottom: '24px' },
  pageTitle: { fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' },
  pageSubtitle: { fontSize: '14px', color: '#6B7280', margin: 0 },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' },
  tableWrapper: { background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: '8px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' },
  trEven: { background: '#FAFAFA' },
  emptyCell: { padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' },
  badgeAdmin: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#F3F4F6', color: '#374151', fontSize: '12px', fontWeight: '500' },
  badgeTeacher: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#EFF6FF', color: '#1D4ED8', fontSize: '12px', fontWeight: '500' },
  badgeSuper: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#111827', color: '#fff', fontSize: '12px', fontWeight: '600' },
  badgeVideo: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#FEE2E2', color: '#991B1B', fontSize: '12px' },
  badgeAudio: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#DBEAFE', color: '#1E40AF', fontSize: '12px' },
  selfBadge: { padding: '3px 10px', borderRadius: '20px', background: '#F3F4F6', color: '#9CA3AF', fontSize: '12px' },
  purpleButton: { padding: '6px 14px', background: '#7B61FF', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  purpleButtonSmall: { padding: '6px 12px', background: '#7B61FF', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  dangerButton: { padding: '6px 14px', background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  dangerButtonSmall: { padding: '6px 12px', background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  primaryButton: { padding: '10px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  ghostButton: { padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' },
  card: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', marginBottom: '24px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  hint: { fontSize: '12px', color: '#9CA3AF' },
  input: { padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  toast: { padding: '12px 16px', borderRadius: '10px', border: '1px solid', fontSize: '14px', fontWeight: '500', marginBottom: '20px' },
};

export default AdminPage;