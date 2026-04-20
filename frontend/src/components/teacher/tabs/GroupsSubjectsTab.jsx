import React from 'react';
import TeacherGroupsManager from '../../../components/common/TeacherGroupsManager';

const GroupsSubjectsTab = ({ teacher, onUpdate }) => {
  return (
    <div className="section">
      <style jsx>{`
        .section {
          background-color: #fff;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }
        .description {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 24px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 12px;
        }
      `}</style>

      <h3 className="section-title">Группы и предметы</h3>
      <div className="description">
      
        <br />
        <strong></strong> 
      </div>

      <TeacherGroupsManager 
        teacher={teacher} 
        onUpdate={onUpdate}
      />
    </div>
  );
};

export default GroupsSubjectsTab;