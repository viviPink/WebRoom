import React, { useState } from 'react';
import StudentLogin from '../components/student/StudentLogin';
import StudentDashboard from '../components/student/StudentDashboard';
import WebinarStudent from './WebinarPages/WebinarStudent';
import UniversitySelector from '../components/common/UniversitySelector';
import StudentRegister from '../components/registration/StudentRegister';

const StudentPage = ({ onBack }) => {
  const [student, setStudent] = useState(null);
  const [currentWebinar, setCurrentWebinar] = useState(null);
  // 'selectUni-login' | 'selectUni-register' | 'login' | 'register'
  const [step, setStep] = useState('selectUni-login');
  const [university, setUniversity] = useState(null);

  if (currentWebinar && student) {
    return (
      <WebinarStudent
        sessionId={currentWebinar}
        student={student}
        onExit={() => setCurrentWebinar(null)}
      />
    );
  }

  if (student) {
    return (
      <StudentDashboard
        student={student}
        onLogout={() => {
          setStudent(null);
          setStep('selectUni-login');
          setUniversity(null);
        }}
        onEnterWebinar={setCurrentWebinar}
      />
    );
  }

  if (step === 'selectUni-login') {
    return (
      <UniversitySelector
        role="student"
        mode="login"
        onSelect={(uni) => {
          setUniversity(uni);
          setStep('login');
        }}
        onBack={onBack}
      />
    );
  }

  if (step === 'selectUni-register') {
    return (
      <UniversitySelector
        role="student"
        mode="register"
        onSelect={(uni) => {
          setUniversity(uni);
          setStep('register');
        }}
        onBack={() => setStep('selectUni-login')}
      />
    );
  }

  if (step === 'login') {
    return (
      <StudentLogin
        setStudent={setStudent}
        university={university}
        onBack={() => setStep('selectUni-login')}
        onRegister={() => setStep('selectUni-register')}
      />
    );
  }

  if (step === 'register') {
    return (
      <StudentRegister
        setStudent={(s) => {
          setStudent(s);
          setStep(null);
        }}
        university={university}
        onBack={() => setStep('selectUni-register')}
      />
    );
  }

  return null;
};

export default StudentPage;
