
import React, { useState, useEffect } from 'react';
import RecordingCard from '../../../components/common/RecordingCard';
import TeacherVideoPlayer from '../../../components/TeacherVideoPlayer';

const RecordingsTab = ({ 
  recordings, 
  loading, 
  onLoad, 
  onEdit, 
  onDelete, 
  onTranscribe,
  onEnhanceText,
  onUpdateField
}) => {
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] =useState('all');
  const [selectedRecordingForPlayback, setSelectedRecordingForPlayback] = useState(null);

  useEffect(() => {
    onLoad();
  }, []);

  const handlePlayRecording = (recording) => {
    setSelectedRecordingForPlayback(recording);
  };

  const handleClosePlayer = () => {
    setSelectedRecordingForPlayback(null);
  };

  const filteredRecordings = recordings.filter(rec => {
    if (filterType !== 'all' && rec.type !== filterType) return false;
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      return (
        (rec.title && rec.title.toLowerCase().includes(searchLower)) ||
        (rec.courseTitle && rec.courseTitle.toLowerCase().includes(searchLower)) ||
        (rec.description && rec.description.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

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
        .filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .search-input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
        }
        .search-input:focus {
          outline: none;
          border-color: #1e3c72;
          box-shadow: 0 0 0 3px rgba(30, 60, 114, 0.1);
        }
        .type-filter {
          padding: 10px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background-color: white;
          cursor: pointer;
        }
        .refresh-button {
          padding: 10px 20px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .refresh-button:hover:not(:disabled) {
          background-color: #e5e7eb;
        }
        .recordings-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          background-color: #f9fafb;
          border-radius: 16px;
          color: #6B7280;
        }
        .loading-state {
          padding: 40px;
          text-align: center;
          color: #6B7280;
        }
        .btn-play {
          padding: 8px 16px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
          width: 100%;
        }
        .btn-play:hover {
          background-color: #6750E0;
          transform: translateY(-1px);
        }
        .recording-card-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .recording-card {
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        .recording-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .recording-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 12px 0;
        }
        .recording-detail {
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 6px;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          background-color: #e5e7eb;
          border-radius: 12px;
          font-size: 11px;
          color: #374151;
          margin-left: 8px;
        }
        .badge.audio {
          background-color: #DBEAFE;
          color: #1E40AF;
        }
        .badge.video {
          background-color: #FEE2E2;
          color: #991B1B;
        }
      `}</style>

      <h3 className="section-title">Записи лекций</h3>
      <div className="description">
        Здесь хранятся все аудио- и видеозаписи проведённых вебинаров.
        Вы можете просматривать записи, просматривать транскрипцию, создавать конспекты с помощью ИИ,
        а также редактировать и удалять записи.
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Поиск по названию или курсу..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="search-input"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="type-filter"
        >
          <option value="all">Все типы</option>
          <option value="audio">Аудио</option>
          <option value="video">Видео</option>
        </select>
        <button onClick={onLoad} disabled={loading} className="refresh-button">
          {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Загрузка записей...</p>
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="empty-state">
          <p>Нет записей лекций</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Записи появятся здесь после завершения вебинаров с включённой записью
          </p>
        </div>
      ) : (
        <div className="recordings-list">
          {filteredRecordings.map(recording => (
            <div key={recording.id} className="recording-card">
              <div className="recording-title">
                {recording.title || recording.courseTitle || 'Запись вебинара'}
                <span className={`badge ${recording.type || 'video'}`}>
                  {recording.type === 'audio' ? 'Аудио' : 'Видео'}
                </span>
              </div>
              <div className="recording-detail">
                Курс: {recording.courseTitle || 'Неизвестно'}
              </div>
              <div className="recording-detail">
                Преподаватель: {recording.teacherName || 'Неизвестно'}
              </div>
              <div className="recording-detail">
                Дата: {new Date(recording.createdAt).toLocaleDateString()}
              </div>
              {recording.duration && (
                <div className="recording-detail">
                  Длительность: {Math.floor(recording.duration / 60)}:{String(recording.duration % 60).padStart(2, '0')}
                </div>
              )}
              
              <button 
                className="btn-play"
                onClick={() => handlePlayRecording(recording)}
              >
                Смотреть запись
              </button>
              
              <RecordingCard
                recording={recording}
                onEdit={() => onEdit(recording)}
                onDelete={() => onDelete(recording.id)}
                onTranscribe={() => onTranscribe(recording.id)}
                onEnhanceText={(action) => onEnhanceText(recording.id, recording.transcription, action)}
              />
            </div>
          ))}
        </div>
      )}

      {selectedRecordingForPlayback && (
        <TeacherVideoPlayer
          recording={selectedRecordingForPlayback}
          onClose={handleClosePlayer}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateField={onUpdateField}
        />
      )}
    </div>
  );
};

export default RecordingsTab;