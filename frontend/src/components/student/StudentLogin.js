import React, { useState } from 'react';
import StudentLoginView from './StudentLoginView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const StudentLogin = ({ setStudent, onBack, onRegister, university }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          password,
          universityId: university?.id || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError('Неверное имя или пароль');
        } else {
          setError(data.error || 'Ошибка сервера');
        }
        return;
      }

      if (data.id) {
        setStudent(data);
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentLoginView
      name={name}
      setName={setName}
      password={password}
      setPassword={setPassword}
      error={error}
      loading={loading}
      handleLogin={handleLogin}
      onBack={onBack}
      onRegister={onRegister}
      university={university}
    />
  );
};

export default StudentLogin;
