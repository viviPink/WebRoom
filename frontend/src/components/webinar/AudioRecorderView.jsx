import React from 'react';

const AudioRecorderView = ({
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
  startRecording,
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
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      padding: '15px',
      border: '1px solid #dee2e6'
    }}>
      {/* Основные кнопки записи */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Начать запись
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0a0f0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Продолжить
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#62462b',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Пауза
              </button>
            )}
            
            <button
              onClick={stopRecording}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Остановить
            </button>
          </>
        )}
        
        <div style={{ marginLeft: 'auto', fontSize: '18px', fontWeight: 'bold' }}>
          {isRecording && (
            <span style={{ color: '#2b2b1c' }}>
              {isPaused ? 'Пауза' : 'Запись'} {formatTime(recordingTime)}
            </span>
          )}
        </div>
      </div>

      {/* Кнопка показа конспекта */}
      {isRecording && (
        <button
          onClick={() => setShowTranscription(!showTranscription)}
          style={{
            padding: '8px 16px',
            backgroundColor: showTranscription ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showTranscription ? 'Скрыть конспект' : 'Показать текущий конспект'}
          {isTranscribing && (
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></span>
          )}
        </button>
      )}

      {/* Окно конспекта */}
      {showTranscription && isRecording && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          marginBottom: '15px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '10px 15px',
            backgroundColor: '#e9ecef',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px' }}>
                Конспект {isTranscribing && '(обработка...)'}
              </h4>
              {timingsCount > 0 && (
                <span style={{
                  fontSize: '12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {timingsCount} слов с таймингами
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={onUndoLast}
                disabled={isTranscribing}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#75736e',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Отменить последнее
              </button>
              <button
                onClick={onClearTranscription}
                disabled={isTranscribing}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#823f45',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Очистить
              </button>
            </div>
          </div>
          <div style={{
            padding: '15px',
            minHeight: '150px',
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: '#fff',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap'
          }}>
            {liveTranscription ? (
              <>
                <div style={{ marginBottom: '10px', color: '#666', fontSize: '12px' }}>
                  Обычный текст:
                </div>
                {liveTranscription.split('.').map((sentence, i) => (
                  sentence.trim() && <p key={i} style={{ margin: '0 0 8px 0' }}>{sentence.trim()}.</p>
                ))}
                
                {timedTranscription && (
                  <>
                    <div style={{ 
                      marginTop: '20px', 
                      marginBottom: '10px', 
                      color: '#666', 
                      fontSize: '12px',
                      borderTop: '1px dashed #dee2e6',
                      paddingTop: '10px'
                    }}>
                      Текст с таймингами:
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      {timedTranscription.split('\n').map((line, i) => (
                        line && <p key={i} style={{ margin: '0 0 5px 0' }}>{line}</p>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p style={{ color: '#999', textAlign: 'center', margin: '20px 0' }}>
                {isTranscribing ? 'Обработка речи...' : 'Начните говорить, конспект появится здесь...'}
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
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Сохранить запись</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Название
              </label>
              <input
                type="text"
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                placeholder="Введите название записи"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Описание
              </label>
              <textarea
                value={recordingDescription}
                onChange={(e) => setRecordingDescription(e.target.value)}
                placeholder="Введите описание (необязательно)"
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>

            <div style={{ 
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <p style={{ margin: '5px 0' }}>
                <strong>Длительность:</strong> {formatTime(recordingDuration)}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Слов в конспекте:</strong> {liveTranscription.split(/\s+/).filter(w => w).length}
              </p>
              {timingsCount > 0 && (
                <p style={{ margin: '5px 0', color: '#28a745' }}>
                  <strong>Слов с таймингами:</strong> {timingsCount}
                </p>
              )}
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
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={saveRecording}
                disabled={uploading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  minWidth: '120px'
                }}
              >
                {uploading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AudioRecorderView;