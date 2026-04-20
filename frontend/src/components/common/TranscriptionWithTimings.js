import React, { useState, useRef, useEffect } from 'react';

const TranscriptionWithTimings = ({ 
  recordingId, 
  transcription, 
  timings = [], 
  audioUrl,
  onClose 
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;
    
    audioRef.current = new Audio(audioUrl);
    
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('play', () => setIsPlaying(true));
    audioRef.current.addEventListener('pause', () => setIsPlaying(false));
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveWordIndex(-1);
    });
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    // Находим текущее слово по времени
    const index = timings.findIndex(t => 
      time >= t.startTime && time <= t.endTime
    );
    setActiveWordIndex(index);
    
    // Скроллим к активному слову
    if (index >= 0 && containerRef.current) {
      const wordElement = document.getElementById(`word-${index}`);
      if (wordElement) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const seekToTime = (time) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    if (!isPlaying) {
      audioRef.current.play();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '1200px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Шапка */}
        <div style={{
          padding: '20px',
          backgroundColor: '#343a40',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>Конспект с таймингами</h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Закрыть
          </button>
        </div>
        
        {/* Управление аудио */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <button
            onClick={togglePlay}
            style={{
              padding: '10px 25px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            {isPlaying ? '⏸️ Пауза' : '▶️ Воспроизвести'}
          </button>
          
          <div style={{ fontSize: '14px', color: '#666' }}>
            Текущее время: {formatTime(currentTime)}
          </div>
        </div>
        
        {/* Транскрипция с таймингами */}
        <div ref={containerRef} style={{
          flex: 1,
          overflowY: 'auto',
          padding: '30px',
          backgroundColor: '#fdfdfd',
          lineHeight: '2',
          fontSize: '16px'
        }}>
          {timings.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {timings.map((timing, index) => (
                <span
                  key={index}
                  id={`word-${index}`}
                  onClick={() => seekToTime(timing.startTime)}
                  style={{
                    cursor: 'pointer',
                    padding: '2px 4px',
                    backgroundColor: activeWordIndex === index ? '#007bff' : 'transparent',
                    color: activeWordIndex === index ? 'white' : '#333',
                    borderRadius: '3px',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    borderBottom: timings.some(t => 
                      Math.abs(t.startTime - timing.startTime) < 0.1
                    ) ? '2px solid #007bff' : 'none'
                  }}
                  title={`${formatTime(timing.startTime)} - ${formatTime(timing.endTime)}`}
                >
                  {timing.word}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {transcription}
            </div>
          )}
        </div>
        
        {/* Информация */}
        <div style={{
          padding: '15px 20px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #dee2e6',
          fontSize: '13px',
          color: '#666'
        }}>
          {timings.length > 0 ? (
            <>Нажмите на любое слово, чтобы перейти к этому моменту в аудио</>
          ) : (
            <>Тайминги не доступны для этой записи</>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionWithTimings;