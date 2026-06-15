import React from 'react';

const TeacherLoginView = ({
  name,
  setName,
  email,
  setEmail,
  error,
  loading,
  handleLogin,
  onBack,
  onRegister,
  university
}) => {
  return (
    <div className="login-container">
      {/* Header */}
      <div className="header">
        <div className="logo-section">
          <div className="logo"></div>
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
              <span className="badge-role">Преподаватель</span>
            </div>
          </div>

          {university && (
            <div className="uni-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B61FF" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>{university.short_name || university.name}</span>
            </div>
          )}

          <h1 className="welcome-title">С возвращением!</h1>
          <p className="welcome-text">
            Войдите в свой профиль, чтобы продолжить работу
          </p>
        </div>

        {/* Right Side */}
        <div className="right-side">
          <div className="form-container">
            <h2 className="form-title">Вход в аккаунт</h2>
            <p className="form-subtitle">Введите свои данные для входа</p>

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
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
               <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                </svg>
                <input
                  type="email"
                  placeholder="Введите пароль"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
            <button
              onClick={handleLogin}
              disabled={!name.trim() || !email.trim() || loading}
              className="submit-button"
            >
              {loading ? 'Вход...' : 'Войти в аккаунт'}
            </button>

            {error && (
              <div className="error-message">{error}</div>
            )}

            {onRegister && (
              <p className="register-link">
                Нет аккаунта?{' '}
                <button onClick={onRegister} className="register-btn">
                  Зарегистрироваться
                </button>
              </p>
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
        .logo {
          width: 48px;
          height: 48px;
          background-color: #7B61FF;
          border-radius: 12px;
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
        .back-button:hover { color: #7B61FF; }
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
          margin-bottom: 16px;
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
        .uni-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ede9ff;
          color: #5b3fd4;
          padding: 8px 16px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 32px;
          width: fit-content;
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
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }
        .submit-button {
          width: 100%;
          padding: 16px;
          background-color: #7B61FF;
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
          background-color: #6750E0;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(123, 97, 255, 0.3);
        }
        .submit-button:disabled {
          opacity: 0.6;
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
        .register-link {
          margin-top: 20px;
          text-align: center;
          font-size: 14px;
          color: #6B7280;
        }
        .register-btn {
          background: none;
          border: none;
          color: #7B61FF;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }
        .register-btn:hover { color: #6750E0; }
        @media (max-width: 968px) {
          .left-side { display: none; }
          .right-side { padding: 40px; }
        }
      `}</style>
    </div>
  );
};

export default TeacherLoginView;
