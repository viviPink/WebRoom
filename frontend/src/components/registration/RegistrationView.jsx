import React from 'react';

const RegistrationView = ({
  userType,
  setUserType,
  name,
  setName,
  email,
  setEmail,
  group,
  setGroup,
  password,
  setPassword,
  error,
  loading,
  handleRegister,
  onBack
}) => {
  const containerStyle = userType === 'teacher' 
    ? { backgroundColor: '#e8d2b9' }
    : { backgroundColor: '#f8f9fa' };

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'sans-serif',
      maxWidth: userType === 'teacher' ? '600px' : '500px',
      margin: '0 auto',
      minHeight: '100vh',
      ...containerStyle
    }}>
      <button
        onClick={onBack}
        style={{
          marginBottom: '20px',
          padding: '8px 16px',
          backgroundColor: userType === 'teacher' ? '#93918b' : '#6c757d',
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        Назад
      </button>

      <div style={{
        backgroundColor: 'white',
        padding: '30px'
      }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
          Регистрация
        </h2>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setUserType('student')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: userType === 'student' ? '#b5bbb7' : '#e9ecef',
              color: userType === 'student' ? 'white' : '#333',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Студент
          </button>
          <button
            type="button"
            onClick={() => setUserType('teacher')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: userType === 'teacher' ? '#0a0909' : '#e9ecef',
              color: userType === 'teacher' ? 'white' : '#333',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Преподаватель
          </button>
        </div>

        {userType === 'teacher' ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                ФИО:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                style={{ width: '100%', padding: '12px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@university.ru"
                style={{ width: '100%', padding: '12px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                ФИО:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                style={{ width: '100%', padding: '12px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Группа:
              </label>
              <input
                type="text"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="ИС-21"
                style={{ width: '100%', padding: '12px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Пароль:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                style={{ width: '100%', padding: '12px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: userType === 'teacher' ? '#0a0909' : '#b5bbb7',
            color: 'white',
            fontSize: '16px',
            marginBottom: '15px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Загрузка...' : 'Зарегистрироваться'}
        </button>
      </div>
    </div>
  );
};

export default RegistrationView;