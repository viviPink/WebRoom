import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

/**
 * Экран выбора вуза — показывается перед входом/регистрацией.
 * Props:
 *   role        — 'teacher' | 'student'
 *   mode        — 'login' | 'register'
 *   onSelect(university) — вызывается когда вуз выбран
 *   onBack      — назад на главную
 */
const UniversitySelector = ({ role, mode, onSelect, onBack }) => {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/universities`);
        if (res.ok) {
          const data = await res.json();
          setUniversities(data);
        } else {
          setError('Не удалось загрузить список вузов');
        }
      } catch {
        setError('Нет соединения с сервером');
      } finally {
        setLoading(false);
      }
    };
    fetchUniversities();
  }, []);

  const roleLabel = role === 'teacher' ? 'Преподаватель' : 'Студент';
  const modeLabel = mode === 'login' ? 'Вход' : 'Регистрация';
  const roleColor = role === 'teacher' ? '#7B61FF' : '#2563EB';

  const filtered = universities.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.short_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="uni-container">
      {/* Header */}
      <div className="uni-header">
        <div className="uni-logo-section">
          <div className="uni-logo" style={{ backgroundColor: roleColor }}></div>
          <span className="uni-title">ВебРум</span>
        </div>
        <button onClick={onBack} className="uni-back-btn">← Назад</button>
      </div>

      {/* Main */}
      <div className="uni-main">
        <div className="uni-left">
          <div className="uni-badge">
            <div className="uni-badge-text">
              <span className="uni-badge-label">{modeLabel} для</span>
              <span className="uni-badge-role">{roleLabel}</span>
            </div>
          </div>
          <h1 className="uni-heading">Выберите ваш вуз</h1>
          <p className="uni-subtext">
            Выберите учебное заведение, к которому вы относитесь
          </p>
        </div>

        <div className="uni-right">
          <div className="uni-form">
            <h2 className="uni-form-title">Учебное заведение</h2>
            <p className="uni-form-sub">Найдите и выберите ваш вуз</p>

            <div className="uni-search-wrap">
              <svg className="uni-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Поиск вуза..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="uni-search-input"
              />
            </div>

            {loading && (
              <div className="uni-loading">Загрузка списка вузов...</div>
            )}

            {error && (
              <div className="uni-error">{error}</div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="uni-empty">Вузы не найдены</div>
            )}

            {!loading && !error && (
              <div className="uni-list">
                {filtered.map(u => (
                  <button
                    key={u.id}
                    className="uni-item"
                    onClick={() => onSelect(u)}
                  >
                    <div className="uni-item-icon" style={{ backgroundColor: roleColor }}>
                      {(u.short_name || u.name).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="uni-item-text">
                      <div className="uni-item-name">{u.name}</div>
                      {u.short_name && (
                        <div className="uni-item-short">{u.short_name}</div>
                      )}
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .uni-container {
          min-height: 100vh;
          background: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .uni-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid #e5e7eb;
        }
        .uni-logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .uni-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
        }
        .uni-title {
          font-size: 24px;
          font-weight: 700;
          color: #000;
        }
        .uni-back-btn {
          background: none;
          border: none;
          font-size: 16px;
          color: #6B7280;
          cursor: pointer;
          padding: 8px 16px;
          transition: color 0.2s;
        }
        .uni-back-btn:hover { color: #7B61FF; }
        .uni-main {
          display: flex;
          min-height: calc(100vh - 88px);
        }
        .uni-left {
          flex: 1;
          background: #f0f5ff;
          padding: 60px;
          display: flex;
          flex-direction: column;
        }
        .uni-badge {
          display: inline-flex;
          align-items: center;
          background: #fff;
          padding: 12px 24px;
          border-radius: 50px;
          margin-bottom: 40px;
          width: fit-content;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .uni-badge-text {
          display: flex;
          flex-direction: column;
        }
        .uni-badge-label {
          font-size: 12px;
          color: #6B7280;
        }
        .uni-badge-role {
          font-size: 16px;
          font-weight: 600;
          color: #000;
        }
        .uni-heading {
          font-size: 48px;
          font-weight: 700;
          color: #000;
          margin: 0 0 16px 0;
        }
        .uni-subtext {
          font-size: 18px;
          color: #6B7280;
          line-height: 1.6;
          margin: 0;
          max-width: 400px;
        }
        .uni-right {
          flex: 1;
          background: #fff;
          padding: 60px;
          display: flex;
          align-items: flex-start;
          padding-top: 60px;
        }
        .uni-form {
          width: 100%;
          max-width: 480px;
        }
        .uni-form-title {
          font-size: 32px;
          font-weight: 700;
          color: #000;
          margin: 0 0 8px 0;
        }
        .uni-form-sub {
          font-size: 16px;
          color: #6B7280;
          margin: 0 0 28px 0;
        }
        .uni-search-wrap {
          position: relative;
          margin-bottom: 16px;
        }
        .uni-search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .uni-search-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .uni-search-input:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123,97,255,0.1);
        }
        .uni-loading, .uni-empty {
          text-align: center;
          padding: 32px;
          color: #9CA3AF;
          font-size: 15px;
        }
        .uni-error {
          padding: 12px 16px;
          background: #FEF2F2;
          color: #DC2626;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .uni-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 420px;
          overflow-y: auto;
        }
        .uni-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: all 0.18s;
          width: 100%;
        }
        .uni-item:hover {
          border-color: #7B61FF;
          background: #faf8ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(123,97,255,0.12);
        }
        .uni-item-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .uni-item-text {
          flex: 1;
        }
        .uni-item-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          line-height: 1.3;
        }
        .uni-item-short {
          font-size: 12px;
          color: #6B7280;
          margin-top: 2px;
        }
        @media (max-width: 968px) {
          .uni-left { display: none; }
          .uni-right { padding: 40px; }
        }
      `}</style>
    </div>
  );
};

export default UniversitySelector;
