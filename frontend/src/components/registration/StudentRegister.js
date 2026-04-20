import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

const SOCKET_URL = API_BASE_URL;


const StudentRegister = ({ setStudent, onBack }) => {
  const [name, setName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(''); // ID группы
  const [groups, setGroups] = useState([]); // Список групп
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);


  // Загружаем список групп при загрузке компонента
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/groups`);
        if (response.ok) {
          const data = await response.json();
          setGroups(data);
        } else {
          console.error('Ошибка загрузки групп');
        }
      } catch (err) {
        console.error('Ошибка загрузки групп:', err);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !selectedGroupId || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    if (!consent) {
      setError('Необходимо согласие на обработку персональных данных');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Находим название группы по ID
      const selectedGroup = groups.find(g => g.id === parseInt(selectedGroupId));
      
      const response = await fetch(`${API_BASE_URL}/api/student/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          groupId: selectedGroupId,  // Отправляем ID группы
          groupName: selectedGroup?.name, // И название группы
          password 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('Студент с таким именем уже зарегистрирован в этой группе');
        } else {
          setError(data.error || 'Ошибка сервера');
        }
        return;
      }

      if (data.id) {
        setStudent(data);
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      {/* Header */}
      <div className="header">
        <div className="logo-section">
          <span className="title">ВебРум</span>
        </div>
        <button onClick={onBack} className="back-button">
          ← Назад
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="left-side">
          <div className="role-badge">
            <div className="badge-text">
              <span className="badge-label">регистрация для</span>
              <span className="badge-role">Студент</span>
            </div>
          </div>
          
          <h1 className="welcome-title">Добро пожаловать!</h1>
          <p className="welcome-text">
            Создайте аккаунт, чтобы участвовать в вебинарах
          </p>
        </div>

        <div className="right-side">
          <div className="form-container">
            <h2 className="form-title">Регистрация</h2>
            <p className="form-subtitle">Введите свои данные для регистрации</p>
            
            <div className="form-group">
              <label className="form-label">ФИО</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Группа</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="input-field"
                  style={{ appearance: 'auto', paddingRight: '16px' }}
                  disabled={loadingGroups}
                >
                  <option value="">{loadingGroups ? 'Загрузка групп...' : 'Выберите группу'}</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                </svg>
                <input
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="consent-group">
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="consent-checkbox"
                />
                <span className="consent-text">
                  Я даю согласие на обработку моих персональных данных в соответствии с 
                  <button 
                    type="button" 
                    className="consent-link"
                    onClick={() => window.open('/privacy-policy', '_blank')}
                  >
                    Политикой обработки персональных данных
                  </button>
                </span>
              </label>
            </div>

            <button 
              onClick={handleRegister}
              disabled={!name.trim() || !selectedGroupId || !password.trim() || !consent || loading}
              className="submit-button"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
            
            {error && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .register-container {
          min-height: 100vh;
          background-color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid #e5e7eb;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #000;
        }
        .back-button {
          background: none;
          border: none;
          font-size: 16px;
          color: #6B7280;
          cursor: pointer;
          padding: 8px 16px;
          transition: color 0.2s;
        }
        .back-button:hover {
          color: #2563EB;
        }
        .main-content {
          display: flex;
          min-height: calc(100vh - 88px);
        }
        .left-side {
          flex: 1;
          background-color: #f0f5ff;
          padding: 60px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background-color: #fff;
          padding: 12px 24px;
          border-radius: 50px;
          margin-bottom: 40px;
          width: fit-content;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .badge-text {
          display: flex;
          flex-direction: column;
        }
        .badge-label {
          font-size: 12px;
          color: #6B7280;
        }
        .badge-role {
          font-size: 16px;
          font-weight: 600;
          color: #000;
        }
        .welcome-title {
          font-size: 48px;
          font-weight: 700;
          color: #000;
          margin: 0 0 16px 0;
        }
        .welcome-text {
          font-size: 18px;
          color: #6B7280;
          line-height: 1.6;
          margin: 0;
          max-width: 400px;
        }
        .right-side {
          flex: 1;
          background-color: #fff;
          padding: 60px;
          display: flex;
          align-items: center;
        }
        .form-container {
          width: 100%;
          max-width: 480px;
        }
        .form-title {
          font-size: 32px;
          font-weight: 700;
          color: #000;
          margin: 0 0 8px 0;
        }
        .form-subtitle {
          font-size: 16px;
          color: #6B7280;
          margin: 0 0 32px 0;
        }
        .form-group {
          margin-bottom: 24px;
        }
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 16px;
          pointer-events: none;
          z-index: 1;
        }
        .input-field {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.2s;
          box-sizing: border-box;
          background-color: white;
        }
        select.input-field {
          cursor: pointer;
          appearance: auto;
          padding-right: 40px;
        }
        .input-field:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .consent-group {
          margin: 20px 0 16px;
        }
        .consent-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }
        .consent-checkbox {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .consent-text {
          font-size: 13px;
          line-height: 1.4;
          color: #6B7280;
        }
        .consent-link {
          background: none;
          border: none;
          color: #2563EB;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          font-size: 13px;
        }
        .consent-link:hover {
          color: #1D4ED8;
        }
        .submit-button {
          width: 100%;
          padding: 16px;
          background-color: #2563EB;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }
        .submit-button:hover:not(:disabled) {
          background-color: #1D4ED8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-message {
          margin-top: 16px;
          padding: 12px 16px;
          background-color: #FEF2F2;
          color: #DC2626;
          border-radius: 12px;
          text-align: center;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #FEE2E2;
        }
        @media (max-width: 968px) {
          .left-side {
            display: none;
          }
          .right-side {
            padding: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentRegister;