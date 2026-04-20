import React from 'react';

const HomePage = ({ setUserRole, onRegister }) => {
  const handleLogin = (role) => {
    setUserRole(role);
  };

  const handleRegister = (role) => {
    if (onRegister) {
      onRegister(role);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="logo"></div>
        <span className="title">ВебРум</span>
      </div>

      <div className="content">
        <h1 className="heading">Выберите свою роль</h1>
        <p className="subheading">
          Вебинары в офлайн формате
        </p>

        <div className="cards">
          {/* Карточка преподавателя */}
          <div className="card">
            <div className="card-icon"></div>
            <div className="decorative-circle circle-top"></div>
            <h3 className="card-title">Преподаватель</h3>
            <div className="buttons-container">
              <button 
                className="btn btn-login"
                onClick={() => handleLogin('teacher')}
              >
                Вход
              </button>
              <button 
                className="btn btn-register"
                onClick={() => handleRegister('teacher')}
              >
                Регистрация
              </button>
            </div>
          </div>

          {/* Карточка студента */}
          <div className="card">
            <div className="card-icon"></div>
            <div className="decorative-circle circle-bottom"></div>
            <h3 className="card-title">Студент</h3>
            <div className="buttons-container">
              <button 
                className="btn btn-login"
                onClick={() => handleLogin('student')}
              >
                Вход
              </button>
              <button 
                className="btn btn-register"
                onClick={() => handleRegister('student')}
              >
                Регистрация
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .container {
          min-height: 100vh;
          background-color: #f0f5ff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .header {
          background-color: #fff;
          padding: 20px 40px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #e5e7eb;
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
        .content {
          padding: 60px 40px;
          text-align: center;
          max-width: 1400px;
          margin: 0 auto;
        }
        .heading {
          font-size: 48px;
          font-weight: 700;
          margin: 0 0 16px 0;
          color: #000;
        }
        .subheading {
          font-size: 20px;
          color: #6B7280;
          margin: 0 0 60px 0;
        }
        .cards {
          display: flex;
          gap: 40px;
          justify-content: center;
          align-items: stretch;
          flex-wrap: wrap;
        }
        .card {
          background-color: #fff;
          border-radius: 24px;
          padding: 40px;
          width: 400px;
          min-height: 350px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          text-align: left;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .card-icon {
          width: 64px;
          height: 64px;
          background-color: #7B61FF;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .decorative-circle {
          position: absolute;
          width: 200px;
          height: 200px;
          background-color: #d1d5db;
          border-radius: 50%;
          opacity: 0.6;
        }
        .circle-top {
          top: -40px;
          right: -40px;
        }
        .circle-bottom {
          bottom: -40px;
          right: -40px;
        }
        .card-title {
          font-size: 28px;
          font-weight: 700;
          color: #000;
          margin: 0 0 32px 0;
        }
        .buttons-container {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }
        .btn {
          flex: 1;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-login {
          background-color: #7B61FF;
          color: white;
        }
        .btn-login:hover {
          background-color: #6750E0;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(123, 97, 255, 0.3);
        }
        .btn-register {
          background-color: #e5e7eb;
          color: #374151;
        }
        .btn-register:hover {
          background-color: #d1d5db;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default HomePage;