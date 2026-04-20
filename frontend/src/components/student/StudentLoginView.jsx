import React, { useState } from 'react';

const StudentLoginView = ({
  name,
  setName,
  password,
  setPassword,
  error,
  loading,
  handleLogin,
  onBack
}) => {
  const [showPassword, setShowPassword] = useState(false);

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
              <span className="badge-role">Студент</span>
            </div>
          </div>
          
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
                />
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
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              onClick={handleLogin}
              disabled={!name.trim() || !password.trim() || loading}
              className="submit-button"
            >
              {loading ? 'Вход...' : 'Войти в аккаунт'}
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
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .toggle-password {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
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

export default StudentLoginView;