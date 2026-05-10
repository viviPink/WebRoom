import React, { useRef, useEffect } from 'react';

// ── Визуализатор волны ─────────────────────────────────────────────────────────
const WaveformVisualizer = ({ waveformHistory, volumeLevel, isSilence, isPaused }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Фон
    ctx.fillStyle = '#1e2329';
    ctx.fillRect(0, 0, W, H);

    if (waveformHistory.length < 2) return;

    const barW = W / waveformHistory.length;

    waveformHistory.forEach((v, i) => {
      const barH = Math.max(2, v * H * 0.75);
      const x = i * barW;
      const y = (H - barH) / 2;

      // Спокойный синевато-серый, чуть светлее при громкости
      const brightness = Math.floor(90 + v * 60);
      const alpha = isPaused ? 0.2 : (0.35 + v * 0.4);

      ctx.fillStyle = `rgba(${brightness}, ${brightness + 20}, ${brightness + 40}, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(1, barW - 2), barH, 2);
      ctx.fill();
    });

    // Центральная линия
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
  }, [waveformHistory, isSilence, isPaused]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={60}
        style={{
          width: '100%',
          height: '60px',
          borderRadius: '8px',
          display: 'block'
        }}
      />
      {/* Индикатор уровня справа */}
      <div style={{
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '2px'
      }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            width: '5px',
            height: '5px',
            borderRadius: '1px',
            backgroundColor: volumeLevel * 8 > i
              ? `rgba(150, 170, 200, ${0.4 + i * 0.07})`
              : 'rgba(255,255,255,0.07)'
          }} />
        ))}
      </div>
    </div>
  );
};

// ── Индикатор статуса ─────────────────────────────────────────────────────────
const StatusBadge = ({ isSilence, isPaused, isTranscribing, isAiCorrecting }) => {
  let label, color, pulse;

  if (isPaused) {
    label = 'Пауза'; color = '#6c757d'; pulse = false;
  } else if (isAiCorrecting) {
    label = 'AI правит текст'; color = '#8b7fcf'; pulse = true;
  } else if (isTranscribing) {
    label = 'Распознавание'; color = '#b08a4e'; pulse = true;
  } else if (isSilence) {
    label = 'Тишина'; color = '#5b8ab5'; pulse = false;
  } else {
    label = 'Запись'; color = '#5a9e6f'; pulse = true;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      backgroundColor: color + '22',
      border: `1px solid ${color}55`,
      fontSize: '12px',
      fontWeight: '600',
      color: color
    }}>
      {pulse && (
        <span style={{
          display: 'inline-block',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: color,
          animation: 'pulse 1.2s ease-in-out infinite'
        }} />
      )}
      {label}
    </div>
  );
};

// ── Основной компонент ─────────────────────────────────────────────────────────
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
  timingsCount,
  // Новые пропсы
  volumeLevel = 0,
  isSilence = false,
  waveformHistory = [],
  isAiCorrecting = false
}) => {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      padding: '15px',
      border: '1px solid #dee2e6'
    }}>
      {/* Визуализатор — показываем только во время записи */}
      {isRecording && (
        <div style={{ marginBottom: '12px' }}>
          <WaveformVisualizer
            waveformHistory={waveformHistory}
            volumeLevel={volumeLevel}
            isSilence={isSilence}
            isPaused={isPaused}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '6px'
          }}>
            <StatusBadge
              isSilence={isSilence}
              isPaused={isPaused}
              isTranscribing={isTranscribing}
              isAiCorrecting={isAiCorrecting}
            />
            <span style={{
              fontSize: '11px',
              color: '#999',
              fontStyle: 'italic'
            }}>
              {isSilence
                ? 'Нарезка по паузе...'
                : 'Нарезка по тишине'}
            </span>
          </div>
        </div>
      )}

      {/* Кнопки записи */}
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
                  backgroundColor: '#198754',
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
                  backgroundColor: '#fd7e14',
                  color: 'white',
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
            <span style={{
              color: isPaused ? '#fd7e14' : '#dc3545',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatTime(recordingTime)}
            </span>
          )}
        </div>
      </div>

      {/* Кнопка конспекта */}
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
          {(isTranscribing || isAiCorrecting) && (
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
        </button>
      )}

      {/* Панель конспекта */}
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '16px' }}>Конспект</h4>

              {isTranscribing && (
                <span style={{
                  fontSize: '11px',
                  backgroundColor: '#b08a4e',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  Whisper...
                </span>
              )}

              {isAiCorrecting && (
                <span style={{
                  fontSize: '11px',
                  backgroundColor: '#8b7fcf',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  AI правит...
                </span>
              )}

              {timingsCount > 0 && (
                <span style={{
                  fontSize: '11px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {timingsCount} слов с тайм.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={onUndoLast}
                disabled={isTranscribing || isAiCorrecting}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#75736e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (isTranscribing || isAiCorrecting) ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: (isTranscribing || isAiCorrecting) ? 0.5 : 1
                }}
              >
                Отменить
              </button>
              <button
                onClick={onClearTranscription}
                disabled={isTranscribing || isAiCorrecting}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#823f45',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (isTranscribing || isAiCorrecting) ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: (isTranscribing || isAiCorrecting) ? 0.5 : 1
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
            whiteSpace: 'pre-wrap',
            position: 'relative'
          }}>
            {/* AI-коррекция индикатор поверх текста */}
            {isAiCorrecting && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                fontSize: '11px',
                color: '#8b5cf6',
                backgroundColor: '#f3f0ff',
                padding: '3px 8px',
                borderRadius: '8px',
                border: '1px solid #c4b5fd'
              }}>
                AI улучшает текст...
              </div>
            )}

            {liveTranscription ? (
              <>
                <div style={{ marginBottom: '10px', color: '#666', fontSize: '11px' }}>
                  Распознанный текст:
                </div>
                {liveTranscription.split('.').map((sentence, i) => (
                  sentence.trim() && (
                    <p key={i} style={{ margin: '0 0 8px 0' }}>{sentence.trim()}.</p>
                  )
                ))}

                {timedTranscription && (
                  <>
                    <div style={{
                      marginTop: '20px',
                      marginBottom: '10px',
                      color: '#666',
                      fontSize: '11px',
                      borderTop: '1px dashed #dee2e6',
                      paddingTop: '10px'
                    }}>
                      Текст с таймингами:
                    </div>
                    <div style={{ fontSize: '13px', color: '#555' }}>
                      {timedTranscription.split('\n').map((line, i) => (
                        line && <p key={i} style={{ margin: '0 0 5px 0' }}>{line}</p>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p style={{ color: '#999', textAlign: 'center', margin: '20px 0' }}>
                {isTranscribing
                  ? 'Whisper обрабатывает речь...'
                  : 'Начните говорить, конспект появится здесь...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно сохранения */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Название</label>
              <input
                type="text"
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                placeholder="Введите название записи"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Описание</label>
              <textarea
                value={recordingDescription}
                onChange={(e) => setRecordingDescription(e.target.value)}
                placeholder="Введите описание (необязательно)"
                rows="3"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
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
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};

export default AudioRecorderView;