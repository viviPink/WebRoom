import React from 'react';

const AdminLoginView = ({
  login,
  setLogin,
  password,
  setPassword,
  error,
  loading,
  handleLogin,
  onBack
}) => {
  return (
    <div className="login-container">
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
        {/* Left Side */}
        <div className="left-side">
          <div className="role-badge">
            <div className="badge-text">
              <span className="badge-label">вход для</span>
              <span className="badge-role">Администратор</span>
            </div>
          </div>

          <h1 className="welcome-title">Панель управления</h1>
          <p className="welcome-text">
            Войдите как администратор, чтобы управлять системой, пользователями и настройками моделей
          </p>

          <div className="admin-features">
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span>Управление пользователями</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>Настройка AI-моделей</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <span>Назначение ролей и прав</span>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="right-side">
          <div className="form-container">
            <h2 className="form-title">Вход для администратора</h2>
            <p className="form-subtitle">Введите данные для входа в панель управления</p>

            <div className="form-group">
              <label className="form-label">Логин</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  type="text"
                  placeholder="admin"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="input-field"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="input-field"
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={!login.trim() || !password.trim() || loading}
              className="submit-button"
            >
              {loading ? 'Вход...' : 'Войти в панель управления'}
            </button>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .login-container {
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
          color: #374151;
        }
        .main-content {
          display: flex;
          min-height: calc(100vh - 88px);
        }
        .left-side {
          flex: 1;
          background-color: #f3f4f6;
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
          color: #111827;
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
          margin: 0 0 40px 0;
          max-width: 400px;
        }
        .admin-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: #374151;
          background: #fff;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          width: fit-content;
        }
        .feature-icon {
          font-size: 18px;
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
        }
        .input-field {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .input-field:focus {
          outline: none;
          border-color: #374151;
          box-shadow: 0 0 0 3px rgba(55, 65, 81, 0.1);
        }
        .submit-button {
          width: 100%;
          padding: 16px;
          background-color: #111827;
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
          background-color: #1f2937;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.25);
        }
        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error-message {
          margin-top: 16px;
          padding: 12px;
          background-color: #FEE2E2;
          color: #DC2626;
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
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

export default AdminLoginView;