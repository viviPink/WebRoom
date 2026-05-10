import React, { useState } from 'react';
import AdminLoginView from './AdminLoginView';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://192.168.14.190:3002';

const AdminLogin = ({ setAdmin, onBack }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('Неверный логин или пароль');
        } else if (response.status === 403) {
          setError('У вас нет прав администратора');
        } else {
          setError(data.error || 'Ошибка сервера');
        }
        return;
      }

      if (data.id) {
        setAdmin(data);
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLoginView
      login={login}
      setLogin={setLogin}
      password={password}
      setPassword={setPassword}
      error={error}
      loading={loading}
      handleLogin={handleLogin}
      onBack={onBack}
    />
  );
};

export default AdminLogin;