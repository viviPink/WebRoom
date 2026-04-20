import React, { useState } from 'react';
import StudentLogin from '../components/student/StudentLogin';
import StudentDashboard from '../components/student/StudentDashboard';
import WebinarStudent from './WebinarPages/WebinarStudent';

const StudentPage = ({ onBack }) => {
  const [student, setStudent] = useState(null);
  const [currentWebinar, setCurrentWebinar] = useState(null);

  if (currentWebinar && student) {
    return (
      <WebinarStudent 
        sessionId={currentWebinar}
        student={student}
        onExit={() => setCurrentWebinar(null)}
      />
    );
  }

  if (!student) {
    return <StudentLogin setStudent={setStudent} onBack={onBack} />;
  }

  return (
    <StudentDashboard 
      student={student}
      onLogout={() => setStudent(null)}
      onEnterWebinar={setCurrentWebinar}
    />
  );
};

export default StudentPage;