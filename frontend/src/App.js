import React, { useState } from 'react';
import ModeSelectorPage from './ModeSelectorPage';
import HomePage from './pages/HomePage';
import TeacherPage from './pages/TeacherPage';
import StudentPage from './pages/StudentPage';
import AdminLogin from './components/admin/AdminLogin';
import AdminPage from './pages/AdminPage';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [admin, setAdmin] = useState(null);

  const isTunnel = window.location.hostname.includes('tunnel4.com');
  const modeChosen = sessionStorage.getItem('modeChosen') === 'true';

  if (isTunnel && !modeChosen) {
    return <ModeSelectorPage onContinue={() => {
      sessionStorage.setItem('modeChosen', 'true');
      window.location.reload();
    }} />;
  }

  // Admin flow
  if (showAdminLogin) {
    return (
      <AdminLogin
        setAdmin={(a) => {
          setAdmin(a);
          setShowAdminLogin(false);
        }}
        onBack={() => setShowAdminLogin(false)}
      />
    );
  }

  if (admin) {
    return <AdminPage admin={admin} onBack={() => setAdmin(null)} />;
  }

  // Teacher flow — выбор вуза встроен внутрь TeacherPage
  if (userRole === 'teacher') {
    return <TeacherPage onBack={() => setUserRole(null)} />;
  }

  // Student flow — выбор вуза встроен внутрь StudentPage
  if (userRole === 'student') {
    return <StudentPage onBack={() => setUserRole(null)} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <HomePage setUserRole={setUserRole} />
      <AdminGhostButton onClick={() => setShowAdminLogin(true)} />
    </div>
  );
}

const AdminGhostButton = ({ onClick }) => (
  <button
    onClick={onClick}
    title="Вход для администратора"
    style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
      padding: '7px 16px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background 0.2s, box-shadow 0.2s',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#7B61FF',
      color: '#fff',
      boxShadow: '0 2px 8px rgba(123,97,255,0.25)',
      userSelect: 'none',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = '#6750E0'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = '#7B61FF'; }}
  >
    Администратор
  </button>
);

export default App;
