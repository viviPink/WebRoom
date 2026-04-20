import React, { useState } from 'react';
import TeacherLogin from '../components/teacher/TeacherLogin';
import TeacherDashboard from '../components/teacher/TeacherDashboard';
import WebinarTeacher from './WebinarPages/WebinarTeacher';

const TeacherPage = ({ onBack }) => {
  const [teacher, setTeacher] = useState(null);
  const [currentWebinar, setCurrentWebinar] = useState(null);

  if (currentWebinar && teacher) {
    return (
      <WebinarTeacher 
        sessionId={currentWebinar}
        teacher={teacher}
        onExit={() => setCurrentWebinar(null)}
      />
    );
  }

  if (!teacher) {
    return <TeacherLogin setTeacher={setTeacher} onBack={onBack} />;
  }

  return (
    <TeacherDashboard 
      teacher={teacher}
      onLogout={() => setTeacher(null)}
      onEnterWebinar={setCurrentWebinar}
    />
  );
};

export default TeacherPage;