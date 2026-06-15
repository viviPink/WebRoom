import React, { useState } from 'react';
import TeacherLogin from '../components/teacher/TeacherLogin';
import TeacherDashboard from '../components/teacher/TeacherDashboard';
import WebinarTeacher from './WebinarPages/WebinarTeacher';
import UniversitySelector from '../components/common/UniversitySelector';
import TeacherRegister from '../components/registration/TeacherRegister';

const TeacherPage = ({ onBack }) => {
  const [teacher, setTeacher] = useState(null);
  const [currentWebinar, setCurrentWebinar] = useState(null);
  // 'selectUni-login' | 'selectUni-register' | 'login' | 'register' | null
  const [step, setStep] = useState('selectUni-login');
  const [university, setUniversity] = useState(null);

  if (currentWebinar && teacher) {
    return (
      <WebinarTeacher
        sessionId={currentWebinar}
        teacher={teacher}
        onExit={() => setCurrentWebinar(null)}
      />
    );
  }

  if (teacher) {
    return (
      <TeacherDashboard
        teacher={teacher}
        onLogout={() => {
          setTeacher(null);
          setStep('selectUni-login');
          setUniversity(null);
        }}
        onEnterWebinar={setCurrentWebinar}
      />
    );
  }

  // Шаг 1: выбор вуза для входа
  if (step === 'selectUni-login') {
    return (
      <UniversitySelector
        role="teacher"
        mode="login"
        onSelect={(uni) => {
          setUniversity(uni);
          setStep('login');
        }}
        onBack={onBack}
      />
    );
  }

  // Шаг 1: выбор вуза для регистрации
  if (step === 'selectUni-register') {
    return (
      <UniversitySelector
        role="teacher"
        mode="register"
        onSelect={(uni) => {
          setUniversity(uni);
          setStep('register');
        }}
        onBack={() => setStep('selectUni-login')}
      />
    );
  }

  // Шаг 2: вход
  if (step === 'login') {
    return (
      <TeacherLogin
        setTeacher={setTeacher}
        university={university}
        onBack={() => setStep('selectUni-login')}
        onRegister={() => setStep('selectUni-register')}
      />
    );
  }

  // Шаг 2: регистрация
  if (step === 'register') {
    return (
      <TeacherRegister
        setTeacher={(t) => {
          setTeacher(t);
          setStep(null);
        }}
        university={university}
        onBack={() => setStep('selectUni-register')}
      />
    );
  }

  return null;
};

export default TeacherPage;
