import React, { useState } from 'react';
import ModeSelectorPage from './ModeSelectorPage';
import HomePage from './pages/HomePage';
import TeacherPage from './pages/TeacherPage';
import StudentPage from './pages/StudentPage';
import TeacherRegister from './components/registration/TeacherRegister';
import StudentRegister from './components/registration/StudentRegister';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationRole, setRegistrationRole] = useState(null);

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

  return <HomePage setUserRole={setUserRole} onRegister={handleRegister} />;
}

export default App;