// components/common/PastMaterialsView.jsx
import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const PastMaterialsView = ({ 
  sessionId, 
  userType,
  onPlaybackStart,
  onMaterialSelect,
  teacherName,
  teacherId
}) => {
  const [pastMaterials, setPastMaterials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  const fetchPastMaterials = async () => {
    setLoading(true);
    try {
      // Загружаем все записи по курсу
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/past-materials`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      
      const sessionIds = [...new Set((data.recordings || []).map(r => r.sessionId).filter(Boolean))];
      const materialsMap = {};
      const commentsMap = {};
      
      await Promise.all(sessionIds.map(async (sid) => {
        try {
          const mRes = await fetch(`${API_BASE_URL}/api/materials/session/${sid}`);
          if (mRes.ok) materialsMap[sid] = await mRes.json();
          
          const cRes = await fetch(`${API_BASE_URL}/api/sessions/${sid}/comment`);
          if (cRes.ok) commentsMap[sid] = (await cRes.json()).comment;
        } catch (e) {}
      }));
      
      setPastMaterials({
        ...data,
        recordings: (data.recordings || []).map(rec => ({
          ...rec,
          materials: rec.sessionId ? (materialsMap[rec.sessionId]?.files || []) : [],
          comment: rec.sessionId ? (commentsMap[rec.sessionId] || '') : ''
        }))
      });
    } catch (err) {
      console.error('Ошибка:', err);
      setPastMaterials({ recordings: [], count: 0 });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    fetchPastMaterials();
  }, [sessionId]);

  return (
    <div className="past-materials-container">
      <div className="past-materials-header">
        <h3>Материалы прошлых занятий</h3>
        <button onClick={fetchPastMaterials} className="refresh-btn" disabled={loading}>
          {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>
      
      <div className="past-materials-body">
        {loading ? (
          <div className="loading-state">Загрузка материалов...</div>
        ) : !pastMaterials ? (
          <div className="empty-state">Нажмите "Обновить" для загрузки</div>
        ) : pastMaterials.recordings?.length === 0 ? (
          <div className="empty-state">Нет материалов с прошлых занятий</div>
        ) : (
          <div className="past-materials-list">
            {pastMaterials.recordings.map(rec => (
              <div key={rec.id} className="past-material-item">
                <div className="past-material-info">
                  <div className="past-material-title">
                    {rec.title || rec.courseTitle || 'Запись занятия'}
                    <span className={`type-badge ${rec.type === 'audio' ? 'type-badge-audio' : 'type-badge-video'}`}>
                      {rec.type === 'audio' ? 'Аудио' : 'Видео'}
                    </span>
                  </div>
                  <div className="past-material-meta">
                    {new Date(rec.createdAt).toLocaleDateString('ru-RU')}
                    {rec.duration && ` · ${formatTime(rec.duration)}`}
                    {rec.sessionDate && ` · Занятие от ${new Date(rec.sessionDate).toLocaleDateString('ru-RU')}`}
                  </div>
                  {rec.description && (
                    <div className="past-material-description">{rec.description}</div>
                  )}
                  
                  {rec.materials && rec.materials.length > 0 && (
                    <div className="past-material-preview">
                      <details>
                        <summary>Материалы занятия ({rec.materials.length})</summary>
                        <div className="materials-list">
                          {rec.materials.map((m, i) => (
                            <div key={i} className="material-link">
                              <span className="material-icon">
                                {m.type?.includes('pdf') ? '📄' : 
                                 m.type?.includes('image') ? '🖼️' : 
                                 m.type?.includes('video') ? '🎬' : 
                                 m.type?.includes('audio') ? '🎵' : '📎'}
                              </span>
                              <a href={m.url || `${API_BASE_URL}${m.filePath}`} target="_blank" rel="noreferrer">
                                {m.title || m.name || 'Открыть файл'}
                              </a>
                              {m.fileSize && <span className="file-size">({(m.fileSize / 1024 / 1024).toFixed(1)} MB)</span>}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                  
                  {rec.comment && (
                    <div className="past-material-preview">
                      <details>
                        <summary>Комментарий преподавателя</summary>
                        <p className="comment-text">{rec.comment}</p>
                      </details>
                    </div>
                  )}
                  
                  {rec.transcription && (
                    <div className="past-material-preview">
                      <details>
                        <summary>Конспект занятия</summary>
                        <p className="transcription-text">
                          {rec.transcription.length > 500 ? rec.transcription.substring(0, 500) + '...' : rec.transcription}
                        </p>
                      </details>
                    </div>
                  )}
                </div>
                
                <div className="past-material-actions">
                  {userType === 'teacher' ? (
                    <button 
                      onClick={() => onPlaybackStart?.(rec)} 
                      className="action-btn action-btn-primary"
                    >
                      Транслировать
                    </button>
                  ) : (
                    <button 
                     
                    >
                      
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .past-materials-container {
          background-color: #fff;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        
        .past-materials-header {
          padding: 14px 18px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #fafafa;
        }
        
        .past-materials-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }
        
        .refresh-btn {
          padding: 6px 14px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .refresh-btn:hover:not(:disabled) {
          background-color: #e5e7eb;
        }
        
        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .past-materials-body {
          padding: 18px;
        }
        
        .past-materials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .past-material-item {
          padding: 14px;
          background-color: #f9fafb;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        
        .past-material-item:hover {
          border-color: #7B61FF;
          background-color: #faf9ff;
        }
        
        .past-material-title {
          font-weight: 600;
          font-size: 13px;
          color: #111827;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        
        .past-material-meta {
          font-size: 11px;
          color: #9CA3AF;
          margin-bottom: 6px;
        }
        
        .past-material-description {
          font-size: 12px;
          color: #374151;
          padding: 8px;
          background-color: white;
          border-radius: 8px;
          margin: 6px 0;
        }
        
        .past-material-preview {
          margin-top: 8px;
          font-size: 12px;
        }
        
        .past-material-preview details {
          cursor: pointer;
        }
        
        .past-material-preview summary {
          color: #7B61FF;
          font-weight: 500;
          padding: 4px 0;
        }
        
        .past-material-preview summary:hover {
          color: #6750E0;
        }
        
        .comment-text, .transcription-text {
          margin-top: 8px;
          padding: 8px 12px;
          background-color: #f3f4f6;
          border-radius: 8px;
          line-height: 1.4;
          white-space: pre-wrap;
          font-size: 12px;
          color: #374151;
        }
        
        .materials-list {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          background-color: #f3f4f6;
          border-radius: 8px;
        }
        
        .material-link {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          padding: 4px 8px;
          background-color: white;
          border-radius: 6px;
        }
        
        .material-link a {
          color: #7B61FF;
          text-decoration: none;
          flex: 1;
        }
        
        .material-link a:hover {
          text-decoration: underline;
        }
        
        .material-icon {
          font-size: 14px;
        }
        
        .file-size {
          font-size: 10px;
          color: #9CA3AF;
        }
        
        .past-material-actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          padding: 6px 14px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn-primary {
          background-color: #7B61FF;
          color: white;
        }
        
        .action-btn-primary:hover {
          background-color: #6750E0;
        }
        
        .type-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }
        
        .type-badge-video {
          background-color: #FEE2E2;
          color: #991B1B;
        }
        
        .type-badge-audio {
          background-color: #DBEAFE;
          color: #1E40AF;
        }
        
        .empty-state, .loading-state {
          text-align: center;
          padding: 40px 20px;
          color: #9CA3AF;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default PastMaterialsView;