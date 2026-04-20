
import React from 'react';
import AttendanceReports from '../../../components/common/AttendanceReports';

const ReportsTab = ({ teacher }) => {
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
          margin: 0 0 20px 0;
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

      <h3 className="section-title">Отчёты по посещаемости</h3>
      <div className="description">
        Здесь вы можете просматривать статистику посещаемости студентов,
        фильтровать по группам, предметам и датам, а также экспортировать данные.
      </div>

      <AttendanceReports teacher={teacher} />
    </div>
  );
};

export default ReportsTab;