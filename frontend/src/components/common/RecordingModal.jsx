import React, { useState } from 'react';

const RecordingModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  recordingTitle, 
  setRecordingTitle, 
  recordingDescription, 
  setRecordingDescription, 
  recordingDuration, 
  formatTime,
  uploading = false 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '10px', 
        width: '500px', 
        maxWidth: '90%', 
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)' 
      }}>
        <h3 style={{ marginTop: 0, color: '#333', marginBottom: '20px' }}>Сохранить аудиозапись</h3>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            Название записи:
          </label>
          <input 
            type="text" 
            value={recordingTitle} 
            onChange={(e) => setRecordingTitle(e.target.value)} 
            placeholder="Введите название записи" 
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              fontSize: '14px' 
            }} 
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            Описание (необязательно):
          </label>
          <textarea 
            value={recordingDescription} 
            onChange={(e) => setRecordingDescription(e.target.value)} 
            placeholder="Введите описание записи" 
            rows="3" 
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              fontSize: '14px', 
              resize: 'vertical' 
            }} 
          />
        </div>
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}><strong>Информация о записи:</strong></div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            Длительность: {formatTime ? formatTime(recordingDuration) : recordingDuration}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            onClick={onClose} 
            disabled={uploading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: uploading ? 'not-allowed' : 'pointer' 
            }}
          >
            Отмена
          </button>
          <button 
            onClick={onSave} 
            disabled={uploading || !recordingTitle.trim()}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: uploading || !recordingTitle.trim() ? 'not-allowed' : 'pointer' 
            }}
          >
            {uploading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingModal;