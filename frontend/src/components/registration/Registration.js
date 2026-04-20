import React, { useState } from 'react';
import RegistrationView from './RegistrationView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.78.167.190:3002';

const SOCKET_URL = API_BASE_URL;



const Registration = ({ setTeacher, setStudent, onBack }) => {
  const [userType, setUserType] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');
  const [password, setPassword] = useState(''); // Добавлено
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Валидация полей в зависимости от типа пользователя
    if (userType === 'teacher') {
      if (!name.trim() || !email.trim()) {
        setError('Заполните все поля');
        return;
      }
    } else {
      if (!name.trim() || !group.trim() || !password.trim()) { // Добавлена проверка пароля
        setError('Заполните все поля');
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = userType === 'teacher'
        ? '/api/teacher/register'
        : '/api/student/register';

      const body = userType === 'teacher'
        ? { name, email }
        : { name, group, password }; // Добавлен password

      console.log('Отправка запроса:', { endpoint, body });

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка сервера');
      }

      const data = await response.json();
      
      if (data.id) {
        if (userType === 'teacher') {
          setTeacher(data);
        } else {
          setStudent(data);
        }
      } else {
        throw new Error('Неверный ответ от сервера');
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setError(err.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegistrationView
      userType={userType}
      setUserType={setUserType}
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      group={group}
      setGroup={setGroup}
      password={password}
      setPassword={setPassword}
      error={error}
      loading={loading}
      handleRegister={handleRegister}
      onBack={onBack}
    />
  );
};

export default Registration;