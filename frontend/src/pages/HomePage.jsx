import React from 'react';

const HomePage = ({ setUserRole }) => {
  return (
    <div className="container">
      <div className="header">
        <div className="logo"></div>
        <span className="title">ВебРум</span>
      </div>

      <div className="content">
        <h1 className="heading">Выберите свою роль</h1>
        <p className="subheading">Вебинары в офлайн формате</p>

        <div className="cards">
          {/* Карточка преподавателя */}
          <div className="card card-teacher">
            <div className="card-icon card-icon-teacher"></div>
            <div className="decorative-circle circle-top"></div>
            <h3 className="card-title">Преподаватель</h3>
            <p className="card-desc">Проводите вебинары, управляйте курсами и материалами</p>
            <div className="buttons-container">
              <button
                className="btn btn-login btn-teacher"
                onClick={() => setUserRole('teacher')}
              >
                Войти
              </button>
            </div>
          </div>

          {/* Карточка студента */}
          <div className="card card-student">
            <div className="card-icon card-icon-student"></div>
            <div className="decorative-circle circle-bottom"></div>
            <h3 className="card-title">Студент</h3>
            <p className="card-desc">Участвуйте в вебинарах и получайте учебные материалы</p>
            <div className="buttons-container">
              <button
                className="btn btn-login btn-student"
                onClick={() => setUserRole('student')}
              >
                Войти
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
          min-height: 380px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          text-align: left;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .card-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .card-icon-teacher { background-color: #7B61FF; }
        .card-icon-student { background-color: #2563EB; }
        .decorative-circle {
          position: absolute;
          width: 200px;
          height: 200px;
          background-color: #d1d5db;
          border-radius: 50%;
          opacity: 0.4;
        }
        .circle-top  { top: -40px; right: -40px; }
        .circle-bottom { bottom: -40px; right: -40px; }
        .card-title {
          font-size: 28px;
          font-weight: 700;
          color: #000;
          margin: 0 0 12px 0;
        }
        .card-desc {
          font-size: 15px;
          color: #6B7280;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }
        .buttons-container {
          margin-top: auto;
        }
        .btn {
          width: 100%;
          padding: 15px 24px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-teacher {
          background-color: #7B61FF;
          color: white;
        }
        .btn-teacher:hover {
          background-color: #6750E0;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(123, 97, 255, 0.35);
        }
        .btn-student {
          background-color: #2563EB;
          color: white;
        }
        .btn-student:hover {
          background-color: #1D4ED8;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.35);
        }
      `}</style>
    </div>
  );
};

export default HomePage;
