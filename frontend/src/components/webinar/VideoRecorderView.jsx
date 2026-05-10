import React from 'react';

const SOURCE_LABELS = {
  local:   'экран / камера преподавателя',
  student: 'экран студента',
};

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
  activeVideoSource = 'local',
  audioLinked = false,
  showTranscription,
  setShowTranscription,
  liveTranscription,
  timedTranscription,
  isTranscribing,
  onUndoLast,
  onClearTranscription,
  timingsCount,
}) => {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
    }}>
      <style>{`
        @keyframes rec-pulse {
          0%   { opacity: 1; transform: scale(1); }
          50%  { opacity: 0.4; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
            Запись видео
          </span>
          {isRecording && (
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isPaused ? '#F59E0B' : '#EF4444',
              display: 'inline-block',
              animation: isPaused ? 'none' : 'rec-pulse 1.5s infinite',
            }} />
          )}
          {isRecording && (
            <span style={{
              fontSize: '12px',
              color: '#6B7280',
              backgroundColor: '#f3f4f6',
              padding: '2px 8px',
              borderRadius: '20px',
            }}>
              {SOURCE_LABELS[activeVideoSource] || activeVideoSource}
            </span>
          )}
          {isRecording && audioLinked && (
            <span style={{
              fontSize: '12px',
              color: '#059669',
              backgroundColor: '#ecfdf5',
              padding: '2px 8px',
              borderRadius: '20px',
              border: '1px solid #a7f3d0',
            }}>
              + аудио
            </span>
          )}
        </div>
        <span style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'monospace', color: '#111827' }}>
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!isRecording ? (
          <button
            onClick={startVideoRecording}
            style={{
              padding: '10px 20px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EF4444'}
          >
            <span style={{ fontSize: '10px' }}>●</span>
            Начать запись
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10B981'}
              >
                Продолжить
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F59E0B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D97706'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F59E0B'}
              >
                Пауза
              </button>
            )}
            <button
              onClick={stopRecording}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4B5563'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6B7280'}
            >
              Остановить
            </button>
          </>
        )}
      </div>

      {/* Подсказка во время записи */}
      {isRecording && (
        <div style={{
          marginTop: '12px',
          fontSize: '12px',
          color: '#6B7280',
          padding: '8px 12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          Запись идёт непрерывно. При переключении между экраном преподавателя и экраном студента запись не прерывается.
        </div>
      )}

      {/* Живая транскрипция */}
      {liveTranscription && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
              Конспект лекции{isTranscribing ? ' (обработка...)' : ''}
              {timingsCount > 0 && (
                <span style={{ marginLeft: '10px', padding: '2px 8px', backgroundColor: '#3B82F6', color: 'white', fontSize: '11px', borderRadius: '20px' }}>
                  {timingsCount} слов
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowTranscription?.(!showTranscription)} style={{ padding: '4px 10px', backgroundColor: '#6B7280', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                {showTranscription ? 'Скрыть' : 'Показать'} тайминги
              </button>
              <button onClick={onUndoLast} style={{ padding: '4px 10px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                Отменить
              </button>
              <button onClick={onClearTranscription} style={{ padding: '4px 10px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                Очистить
              </button>
            </div>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: 'white', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
            {showTranscription && timedTranscription ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '13px', lineHeight: '1.6', fontFamily: 'monospace' }}>
                {timedTranscription}
              </pre>
            ) : (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '15px', lineHeight: '1.6', color: '#374151' }}>
                {liveTranscription || 'Конспект появится здесь по мере записи...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно сохранения */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '18px', fontWeight: '600' }}>
              Сохранить видеозапись
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
                Название
              </label>
              <input
                type="text"
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                placeholder="Введите название записи"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#7B61FF'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
                Описание
              </label>
              <textarea
                value={recordingDescription}
                onChange={(e) => setRecordingDescription(e.target.value)}
                placeholder="Введите описание"
                rows="3"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#7B61FF'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            <div style={{ marginBottom: '24px', fontSize: '13px', color: '#6B7280' }}>
              Длительность: {formatTime(recordingDuration)}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelRecording}
                disabled={uploading}
                style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '14px', opacity: uploading ? 0.5 : 1 }}
              >
                Отмена
              </button>
              <button
                onClick={saveRecording}
                disabled={uploading}
                style={{ padding: '10px 20px', backgroundColor: uploading ? '#9CA3AF' : '#10B981', color: 'white', border: 'none', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}
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