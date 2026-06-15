import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const MaterialsManager = ({ sessionId, teacherId, courseId, isActive }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [socket, setSocket] = useState(null);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      // Используем относительный URL
      const response = await fetch(`/api/materials/session/${sessionId}`);
      if (!response.ok) throw new Error('Ошибка загрузки материалов');
      const data = await response.json();
      setMaterials(data);
    } catch (err) {
      console.error('Ошибка:', err);
      setError('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('Файл слишком большой. Максимум 100MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Выберите файл');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sessionId', sessionId);
      formData.append('teacherId', teacherId);
      if (courseId) formData.append('courseId', courseId);
      if (description) formData.append('description', description);
      formData.append('originalName', selectedFile.name);

      // Используем относительный URL
      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Ошибка загрузки');

      const result = await response.json();
      setMaterials([result.material, ...materials]);
      setSelectedFile(null);
      setDescription('');
      document.getElementById('file-input').value = '';
    } catch (err) {
      console.error('Ошибка:', err);
      setError('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm('Удалить этот материал?')) return;
    
    try {
      // Используем относительный URL
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Ошибка удаления');
      
      setMaterials(materials.filter(m => m.id !== materialId));
    } catch (err) {
      console.error('Ошибка:', err);
      setError('Ошибка удаления');
    }
  };

  const handleUpdateDescription = async (materialId) => {
    try {
      // Используем относительный URL
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription })
      });
      
      if (!response.ok) throw new Error('Ошибка обновления');
      
      const result = await response.json();
      setMaterials(materials.map(m => 
        m.id === materialId ? result.material : m
      ));
      setEditingMaterial(null);
      setEditDescription('');
    } catch (err) {
      console.error('Ошибка:', err);
      setError('Ошибка обновления');
    }
  };

  const downloadFile = (filePath, originalName) => {
    // Используем относительный URL
    const link = document.createElement('a');
    link.href = filePath;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Неизвестно';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return 'PDF';
    if (fileType?.includes('image')) return 'IMG';
    if (fileType?.includes('video')) return 'VID';
    if (fileType?.includes('audio')) return 'AUD';
    if (fileType?.includes('word') || fileType?.includes('document')) return 'DOC';
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return 'XLS';
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return 'PPT';
    return 'FILE';
  };

  useEffect(() => {
    loadMaterials();
    
    // Подключаем WebSocket к текущему хосту
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected for materials');
    });
    
    newSocket.on('material_added', (data) => {
      if (data.material.sessionId == sessionId) {
        setMaterials(prev => [data.material, ...prev]);
      }
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    setSocket(newSocket);
    
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [sessionId]);

  return (
    <div className="materials-manager">
      <style jsx>{`
        .materials-manager {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .materials-header {
          padding: 16px 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          font-size: 16px;
        }
        .upload-area {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .file-input-wrapper {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .file-input-label {
          padding: 10px 20px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .file-input-label:hover {
          background: #e5e7eb;
        }
        .file-name {
          font-size: 14px;
          color: #374151;
          flex: 1;
        }
        .description-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          margin-bottom: 12px;
          resize: vertical;
        }
        .upload-btn {
          padding: 10px 24px;
          background: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .upload-btn:hover:not(:disabled) {
          background: #6750E0;
          transform: translateY(-1px);
        }
        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .materials-list {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
        }
        .material-item {
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        .material-item:hover {
          border-color: #7B61FF;
          box-shadow: 0 2px 8px rgba(123,97,255,0.1);
        }
        .material-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 10px;
        }
        .material-file {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        .material-icon {
          font-size: 16px;
          font-weight: 600;
          min-width: 40px;
          padding: 5px 8px;
          background: #e5e7eb;
          border-radius: 6px;
          text-align: center;
        }
        .material-details {
          flex: 1;
        }
        .material-name {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          word-break: break-word;
        }
        .material-meta {
          font-size: 11px;
          color: #6B7280;
          margin-top: 4px;
        }
        .material-actions {
          display: flex;
          gap: 8px;
        }
        .material-description {
          font-size: 13px;
          color: #6B7280;
          margin: 10px 0;
          padding: 8px;
          background: white;
          border-radius: 8px;
        }
        .btn-icon {
          padding: 6px 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .btn-download {
          background: #10B981;
          color: white;
        }
        .btn-download:hover {
          background: #059669;
        }
        .btn-edit {
          background: #F59E0B;
          color: white;
        }
        .btn-edit:hover {
          background: #D97706;
        }
        .btn-delete {
          background: #EF4444;
          color: white;
        }
        .btn-delete:hover {
          background: #DC2626;
        }
        .edit-description {
          margin-top: 10px;
          display: flex;
          gap: 8px;
        }
        .edit-description input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6B7280;
        }
        .error-message {
          padding: 12px 16px;
          background: #FEE2E2;
          color: #DC2626;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        .loading-spinner {
          text-align: center;
          padding: 20px;
          color: #6B7280;
        }
      `}</style>

      <div className="materials-header">
        Материалы лекции
      </div>

      {isActive && (
        <div className="upload-area">
          <div className="file-input-wrapper">
            <label className="file-input-label">
              Выбрать файл
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            {selectedFile && (
              <span className="file-name">{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
            )}
          </div>
          
          <textarea
            className="description-input"
            placeholder="Описание материала (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Загрузка...' : 'Загрузить материал'}
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Загрузка материалов...</div>
      ) : materials.length === 0 ? (
        <div className="empty-state">
          <p>Нет загруженных материалов</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            {isActive 
              ? 'Загрузите файлы, чтобы студенты могли их скачать'
              : 'Материалы появятся здесь после загрузки'}
          </p>
        </div>
      ) : (
        <div className="materials-list">
          {materials.map(material => (
            <div key={material.id} className="material-item">
              <div className="material-info">
                <div className="material-file">
                  <span className="material-icon">{getFileIcon(material.fileType)}</span>
                  <div className="material-details">
                    <div className="material-name">{material.originalName}</div>
                    <div className="material-meta">
                      {formatFileSize(material.fileSize)} • 
                      {new Date(material.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="material-actions">
                  <button
                    className="btn-icon btn-download"
                    onClick={() => downloadFile(material.filePath, material.originalName)}
                  >
                    Скачать
                  </button>
                  {isActive && (
                    <>
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => {
                          setEditingMaterial(material.id);
                          setEditDescription(material.description || '');
                        }}
                      >
                        Изменить
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(material.id)}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {material.description && (
                <div className="material-description">{material.description}</div>
              )}
              
              {editingMaterial === material.id && (
                <div className="edit-description">
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Описание материала"
                  />
                  <button
                    className="btn-icon btn-download"
                    onClick={() => handleUpdateDescription(material.id)}
                    style={{ background: '#7B61FF' }}
                  >
                    Сохранить
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => setEditingMaterial(null)}
                    style={{ background: '#f3f4f6', color: '#374151' }}
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialsManager;