import React from 'react';

const VideoRecorderView = ({
  isRecording,
  isPaused,
  recordingTime,
  showSaveModal,
  recordingTitle,
  setRecordingTitle,
  recordingDescription,
  setRecordingDescription,
  uploading,
  recordingDuration,
  formatTime,
  startVideoRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  saveRecording,
  cancelRecording,
  showTranscription,
  setShowTranscription,
  liveTranscription,
  timedTranscription,
  isTranscribing,
  onUndoLast,
  onClearTranscription,
  timingsCount
}) => {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      marginBottom: '20px', 
      border: '1px solid #dee2e6' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Запись видео лекции
          {isRecording && (
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: isPaused ? '#ffc107' : '#dc3545',
              borderRadius: '50%',
              animation: isPaused ? 'none' : 'pulse 1.5s infinite'
            }} />
          )}
        </h3>
        <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>
          {formatTime(recordingTime)}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        {!isRecording ? (
          <button
            onClick={startVideoRecording}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>●</span> Начать запись видео
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ▶ Продолжить
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ⏸ Пауза
              </button>
            )}
            <button
              onClick={stopRecording}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏹ Остановить
            </button>
          </>
        )}
      </div>

      {/* Блок с живой транскрипцией */}
      {liveTranscription && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#495057' }}>
              Конспект лекции {isTranscribing && '(обработка...)'}
              {timingsCount > 0 && (
                <span style={{
                  marginLeft: '10px',
                  padding: '2px 8px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  fontSize: '12px',
                  borderRadius: '12px'
                }}>
                  {timingsCount} слов с таймингами
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {showTranscription ? 'Скрыть' : 'Показать'} тайминги
              </button>
              <button
                onClick={onUndoLast}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Отменить последнее
              </button>
              <button
                onClick={onClearTranscription}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Очистить
              </button>
            </div>
          </div>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: 'white',
            padding: '10px',
            border: '1px solid #dee2e6'
          }}>
            {showTranscription && timedTranscription ? (
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '14px',
                lineHeight: '1.6',
                fontFamily: 'monospace'
              }}>
                {timedTranscription}
              </pre>
            ) : (
              <p style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '16px',
                lineHeight: '1.6'
              }}>
                {liveTranscription || 'Конспект появится здесь по мере записи...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно сохранения */}
      {showSaveModal && (
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
            padding: '25px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
              Сохранить видеозапись
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Название:
              </label>
              <input
                type="text"
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                placeholder="Введите название записи"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Описание:
              </label>
              <textarea
                value={recordingDescription}
                onChange={(e) => setRecordingDescription(e.target.value)}
                placeholder="Введите описание"
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
              Длительность: {formatTime(recordingDuration)}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelRecording}
                disabled={uploading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.5 : 1
                }}
              >
                Отмена
              </button>
              <button
                onClick={saveRecording}
                disabled={uploading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: uploading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.5 : 1
                }}
              >
                {uploading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorderView;