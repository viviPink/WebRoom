import React, { useState } from 'react';
import TeacherLoginView from './TeacherLoginView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.121.104.190:3002';



const TeacherLogin = ({ setTeacher, onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Заполните все поля');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Преподаватель с таким именем и email не найден');
        } else {
          setError(data.error || 'Ошибка сервера');
        }
        return;
      }
      
      if (data.id) {
        setTeacher(data);
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeacherLoginView
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      error={error}
      loading={loading}
      handleLogin={handleLogin}
      onBack={onBack}
    />
  );
};

export default TeacherLogin;