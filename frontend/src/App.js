import React, { useState } from 'react';
import ModeSelectorPage from './ModeSelectorPage';
import HomePage from './pages/HomePage';
import TeacherPage from './pages/TeacherPage';
import StudentPage from './pages/StudentPage';
import TeacherRegister from './components/registration/TeacherRegister';
import StudentRegister from './components/registration/StudentRegister';
import AdminLogin from './components/admin/AdminLogin';
import AdminPage from './pages/AdminPage';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationRole, setRegistrationRole] = useState(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [admin, setAdmin] = useState(null);

  // Показываем экран выбора режима только если:
  // 1. Зашли через тоннель
  // 2. Ещё не выбрали режим (нет отметки в sessionStorage)
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

  const handleRegister = (role) => {
    setRegistrationRole(role);
    setShowRegistration(true);
  };

  const handleBack = () => {
    setShowRegistration(false);
    setRegistrationRole(null);
  };

  const handleSetTeacher = (teacher) => {
    console.log('Teacher registered:', teacher);
    setUserRole('teacher');
    setShowRegistration(false);
  };

  const handleSetStudent = (student) => {
    console.log('Student registered:', student);
    setUserRole('student');
    setShowRegistration(false);
  };

  if (showRegistration) {
    if (registrationRole === 'teacher') {
      return <TeacherRegister setTeacher={handleSetTeacher} onBack={handleBack} />;
    } else {
      return <StudentRegister setStudent={handleSetStudent} onBack={handleBack} />;
    }
  }

  if (userRole === 'teacher') {
    return <TeacherPage onBack={() => setUserRole(null)} />;
  }

  if (userRole === 'student') {
    return <StudentPage onBack={() => setUserRole(null)} />;
  }

  // Inject admin button into HomePage via wrapper
  return (
    <div style={{ position: 'relative' }}>
      <HomePage setUserRole={setUserRole} onRegister={handleRegister} />
      {/* Hidden admin entry — top-right corner */}
      <AdminGhostButton onClick={() => setShowAdminLogin(true)} />
    </div>
  );
}

/** Invisible admin button that reveals on hover */
const AdminGhostButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Вход для администратора"
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        padding: '7px 14px',
        border: '1px solid',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        // ghost by default, visible on hover
        background: hovered ? '#111827' : 'transparent',
        color: hovered ? '#fff' : 'transparent',
        borderColor: hovered ? '#111827' : 'transparent',
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        userSelect: 'none',
      }}
    >
      Администратор
    </button>
  );
};

export default App;