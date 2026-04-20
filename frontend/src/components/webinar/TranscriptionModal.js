import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://10.121.104.190:3002';

const SOCKET_URL = API_BASE_URL;


const TranscriptionModal = ({ recordingId, onClose, onSave }) => {
  const [transcription, setTranscription] = useState('');
  const [originalTranscription, setOriginalTranscription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState(null);
  const [error, setError] = useState('');
  const [changesMade, setChangesMade] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Состояния для разных типов конспектов
  const [activeTab, setActiveTab] = useState('transcription');
  const [timedTranscription, setTimedTranscription] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiBulletPoints, setAiBulletPoints] = useState('');
  const [aiStructure, setAiStructure] = useState('');
  const [aiQuestions, setAiQuestions] = useState('');
  
  // Состояния для улучшения текста
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryAction, setSummaryAction] = useState('summary');
  const [lmStudioAvailable, setLmStudioAvailable] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const API_URL = API_BASE_URL;

  // Конфигурация вкладок
  const tabs = [
    { id: 'transcription', label: 'Обычный конспект', field: 'transcription' },
    { id: 'timed', label: 'С таймингами', field: 'timedTranscription' },
    { id: 'summary', label: 'Краткий конспект', field: 'aiSummary' },
    { id: 'bulletPoints', label: 'Тезисы', field: 'aiBulletPoints' },
    { id: 'structure', label: 'Структура', field: 'aiStructure' },
    { id: 'questions', label: 'Вопросы', field: 'aiQuestions' }
  ];

  // Маппинг действий на вкладки
  const actionToTab = {
    'summary': 'summary',
    'bullet_points': 'bulletPoints',
    'structure': 'structure',
    'questions': 'questions'
  };

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('Сервер доступен');
        setLmStudioAvailable(true);
      } else {
        console.log('Сервер вернул ошибку:', response.status);
        setLmStudioAvailable(false);
      }
    } catch (err) {
      console.error('Ошибка проверки сервера:', err.message);
      setLmStudioAvailable(false);
    }
  };

  useEffect(() => {
    if (!recordingId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${API_URL}/api/audio/${recordingId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log('Получены данные:', {
          transcription: data.transcription?.substring(0, 50),
          timedTranscription: data.timedTranscription?.substring(0, 50),
          aiSummary: data.aiSummary?.substring(0, 50),
          aiBulletPoints: data.aiBulletPoints?.substring(0, 50),
          aiStructure: data.aiStructure?.substring(0, 50),
          aiQuestions: data.aiQuestions?.substring(0, 50)
        });
        
        setRecordingInfo(data);
        
        setTranscription(data.transcription || '');
        setOriginalTranscription(data.transcription || '');
        setTimedTranscription(data.timedTranscription || '');
        setAiSummary(data.aiSummary || '');
        setAiBulletPoints(data.aiBulletPoints || '');
        setAiStructure(data.aiStructure || '');
        setAiQuestions(data.aiQuestions || '');
        
        updateCounts(data.transcription || '');
        
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError(err.message || 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    checkServerStatus();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [recordingId, API_URL]);

  const updateCounts = (text) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    
    switch(activeTab) {
      case 'transcription':
        setTranscription(newText);
        updateCounts(newText);
        break;
      case 'timed':
        setTimedTranscription(newText);
        break;
      case 'summary':
        setAiSummary(newText);
        break;
      case 'bulletPoints':
        setAiBulletPoints(newText);
        break;
      case 'structure':
        setAiStructure(newText);
        break;
      case 'questions':
        setAiQuestions(newText);
        break;
      default:
        break;
    }
    
    setChangesMade(true);
  };

  const getCurrentText = () => {
    switch(activeTab) {
      case 'transcription':
        return transcription;
      case 'timed':
        return timedTranscription;
      case 'summary':
        return aiSummary;
      case 'bulletPoints':
        return aiBulletPoints;
      case 'structure':
        return aiStructure;
      case 'questions':
        return aiQuestions;
      default:
        return transcription;
    }
  };

  const getCurrentFieldName = () => {
    switch(activeTab) {
      case 'transcription':
        return 'transcription';
      case 'timed':
        return 'timedTranscription';
      case 'summary':
        return 'aiSummary';
      case 'bulletPoints':
        return 'aiBulletPoints';
      case 'structure':
        return 'aiStructure';
      case 'questions':
        return 'aiQuestions';
      default:
        return 'transcription';
    }
  };

  const handleSave = async () => {
    const currentText = getCurrentText();
    const fieldName = getCurrentFieldName();
    
    if (!currentText.trim() && !window.confirm('Сохранить пустой текст?')) {
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch(`${API_URL}/api/audio/${recordingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          [fieldName]: currentText.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось сохранить');
      }
      
      const result = await response.json();
      
      if (activeTab === 'transcription') {
        setOriginalTranscription(currentText.trim());
      }
      
      setChangesMade(false);
      
      if (onSave) {
        onSave(recordingId, currentText.trim(), fieldName);
      }
      
      alert('Сохранено успешно!');
      
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (changesMade && !window.confirm('Есть несохраненные изменения. Выйти без сохранения?')) {
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (onClose) onClose();
  };

  const playAudio = () => {
    if (!recordingInfo?.filePath) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(`${API_URL}${recordingInfo.filePath}`);
      
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Ошибка воспроизведения:', err);
        alert('Не удалось воспроизвести аудио');
      });
    }
  };

  // Обработка выбора действия - автоматически переключаем вкладку
  const handleActionChange = (e) => {
    const newAction = e.target.value;
    setSummaryAction(newAction);
    
    const targetTab = actionToTab[newAction];
    if (targetTab) {
      setActiveTab(targetTab);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  // Улучшение текста - берем из текущей вкладки, сохраняем в целевую
  const enhanceText = async () => {
    const sourceText = getCurrentText();
    
    if (!sourceText.trim()) {
      alert('Нет текста для обработки. Сначала добавьте текст в текущую вкладку.');
      return;
    }
    
    const targetTabId = actionToTab[summaryAction];
    if (!targetTabId) {
      alert('Неизвестное действие');
      return;
    }
    
    setGeneratingSummary(true);
    setSummaryError('');
    
    try {
      const response = await fetch(`${API_URL}/api/enhance-transcription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          action: summaryAction,
          recordingId: recordingId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.text) {
        const improvedText = result.text;
        
        setActiveTab(targetTabId);
        
        switch(targetTabId) {
          case 'summary':
            setAiSummary(improvedText);
            break;
          case 'bulletPoints':
            setAiBulletPoints(improvedText);
            break;
          case 'structure':
            setAiStructure(improvedText);
            break;
          case 'questions':
            setAiQuestions(improvedText);
            break;
          default:
            break;
        }
        
        setChangesMade(true);
        
        if (textareaRef.current) {
          textareaRef.current.scrollTop = 0;
          textareaRef.current.focus();
        }
        
        const targetLabel = tabs.find(t => t.id === targetTabId)?.label;
        alert(`Текст успешно обработан и сохранен во вкладке "${targetLabel}"! Нажмите "Сохранить", чтобы сохранить изменения.`);
      } else {
        setSummaryError(result.error || 'Ошибка обработки текста');
      }
    } catch (err) {
      console.error('Ошибка улучшения текста:', err);
      setSummaryError('Не удалось подключиться к серверу');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Генерация всех вариантов из обычного конспекта
  const generateAllVariants = async () => {
    const sourceText = transcription;
    
    if (!sourceText.trim()) {
      alert('Нет текста в обычном конспекте для обработки');
      return;
    }
    
    setGeneratingSummary(true);
    setSummaryError('');
    
    const actions = [
      { action: 'summary', tabId: 'summary', setter: setAiSummary, label: 'Краткий конспект' },
      { action: 'bullet_points', tabId: 'bulletPoints', setter: setAiBulletPoints, label: 'Тезисы' },
      { action: 'structure', tabId: 'structure', setter: setAiStructure, label: 'Структура' },
      { action: 'questions', tabId: 'questions', setter: setAiQuestions, label: 'Вопросы' }
    ];
    
    let successCount = 0;
    
    for (const item of actions) {
      try {
        const response = await fetch(`${API_URL}/api/enhance-transcription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: sourceText,
            action: item.action,
            recordingId: recordingId
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.text) {
            item.setter(result.text);
            successCount++;
          }
        }
      } catch (err) {
        console.error(`Ошибка генерации ${item.label}:`, err);
      }
    }
    
    setChangesMade(true);
    setGeneratingSummary(false);
    
    alert(`Сгенерировано ${successCount} из ${actions.length} вариантов конспекта. Не забудьте сохранить изменения.`);
  };

  const getActionName = (action) => {
    const actions = {
      'summary': 'Краткий конспект',
      'bullet_points': 'Список тезисов',
      'structure': 'Структуру',
      'questions': 'Вопросы'
    };
    return actions[action] || action;
  };

  const getCurrentTextByTabId = (tabId) => {
    switch(tabId) {
      case 'transcription': return transcription;
      case 'timed': return timedTranscription;
      case 'summary': return aiSummary;
      case 'bulletPoints': return aiBulletPoints;
      case 'structure': return aiStructure;
      case 'questions': return aiQuestions;
      default: return '';
    }
  };

  if (loading) {
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
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #0a0b0c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#333', margin: 0 }}>Загрузка конспекта...</p>
        </div>
      </div>
    );
  }

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
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '1200px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {/* Верхняя панель */}
        <div style={{
          padding: '20px',
          backgroundColor: '#343a40',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px'}}>Редактор конспекта</h2>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              {recordingInfo?.title || 'Без названия'} (ID: {recordingId})
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Индикатор AI */}
            {lmStudioAvailable !== null && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                backgroundColor: lmStudioAvailable ? '#28a745' : '#dc3545',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'white'
                }}></span>
                {lmStudioAvailable ? 'AI доступен' : 'AI недоступен'}
              </div>
            )}
            
            {/* Кнопка генерации всех вариантов */}
            <button
              onClick={generateAllVariants}
              disabled={generatingSummary || !lmStudioAvailable || !transcription.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (generatingSummary || !lmStudioAvailable || !transcription.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Сгенерировать все варианты
            </button>
            
            {/* Выбор действия AI */}
            <select
              value={summaryAction}
              onChange={handleActionChange}
              disabled={generatingSummary || !lmStudioAvailable}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #495057',
                backgroundColor: '#495057',
                color: 'white',
                fontSize: '14px',
                cursor: generatingSummary ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="summary">Краткий конспект</option>
              <option value="bullet_points">Список тезисов</option>
              <option value="structure">Структура</option>
              <option value="questions">Вопросы</option>
            </select>
            
            {/* Кнопка AI обработки */}
            <button
              onClick={enhanceText}
              disabled={generatingSummary || !lmStudioAvailable || !getCurrentText().trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: generatingSummary ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (generatingSummary || !lmStudioAvailable || !getCurrentText().trim()) ? 'not-allowed' : 'pointer',
                minWidth: '200px'
              }}
            >
              {generatingSummary ? 'Обработка...' : `Создать ${getActionName(summaryAction)}`}
            </button>
            
            {/* Кнопка аудио */}
            {recordingInfo?.filePath && (
              <button
                onClick={playAudio}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isPlaying ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isPlaying ? 'Пауза' : 'Прослушать'}
              </button>
            )}
            
            {/* Кнопки действий */}
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Закрыть
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || !changesMade}
              style={{
                padding: '8px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                minWidth: '120px',
                cursor: (saving || !changesMade) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
        
        {/* Ошибки */}
        {(summaryError || error) && (
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderBottom: '1px solid #f5c6cb',
            fontSize: '14px'
          }}>
            <strong>Ошибка:</strong> {summaryError || error}
          </div>
        )}
        
        {/* Основной контент */}
        <div style={{
          display: 'flex',
          flex: 1,
          minHeight: 0
        }}>
          {/* Боковая панель */}
          <div style={{
            width: '250px',
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #dee2e6',
            padding: '20px',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#495057' }}>
              Информация
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                Название
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {recordingInfo?.title || 'Без названия'}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                Статистика текущей вкладки
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>Слов: {wordCount}</div>
                <div>Символов: {charCount}</div>
                {recordingInfo?.duration && (
                  <div>Длительность: {Math.floor(recordingInfo.duration / 60)}:{String(recordingInfo.duration % 60).padStart(2, '0')}</div>
                )}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                Доступные конспекты
              </div>
              <div style={{ fontSize: '13px' }}>
                <div>Обычный: {transcription ? 'есть' : 'нет'}</div>
                <div>С таймингами: {timedTranscription ? 'есть' : 'нет'}</div>
                <div>Краткий: {aiSummary ? 'есть' : 'нет'}</div>
                <div>Тезисы: {aiBulletPoints ? 'есть' : 'нет'}</div>
                <div>Структура: {aiStructure ? 'есть' : 'нет'}</div>
                <div>Вопросы: {aiQuestions ? 'есть' : 'нет'}</div>
              </div>
            </div>
            
            {recordingInfo?.teacherName && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                  Преподаватель
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {recordingInfo.teacherName}
                </div>
              </div>
            )}
          </div>
          
          {/* Правая панель с редактором */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Вкладки */}
            <div style={{
              padding: '10px 20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              gap: '10px',
              overflowX: 'auto'
            }}>
              {tabs.map(tab => {
                const hasContent = getCurrentTextByTabId(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      updateCounts(getCurrentTextByTabId(tab.id));
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: activeTab === tab.id ? '#007bff' : '#e9ecef',
                      color: activeTab === tab.id ? 'white' : '#495057',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                    {hasContent && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        opacity: 0.8
                      }}>
                        (есть текст)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Редактор текста */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <textarea
                ref={textareaRef}
                value={getCurrentText()}
                onChange={handleTextChange}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '25px',
                  border: 'none',
                  fontSize: '16px',
                  lineHeight: '1.7',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  fontFamily: 'inherit'
                }}
                spellCheck="true"
                placeholder="Введите или отредактируйте текст конспекта..."
                autoFocus
              />
              
              {!getCurrentText() && !loading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: '#adb5bd',
                  pointerEvents: 'none'
                }}>
                  <p style={{ fontSize: '18px', margin: 0 }}>Текст отсутствует</p>
                  <p style={{ fontSize: '14px', margin: '5px 0 0 0' }}>
                    Выберите действие в меню выше для генерации конспекта
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Нижняя панель */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: '#6c757d'
        }}>
          <div>
            {changesMade ? (
              <span style={{ color: '#ffc107' }}>Есть несохраненные изменения</span>
            ) : (
              <span>Все изменения сохранены</span>
            )}
          </div>
          <div>
            {generatingSummary && (
              <span style={{ color: '#007bff' }}>
                Обработка текста...
              </span>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        textarea {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
        }
        
        button {
          transition: all 0.2s;
        }
        
        button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default TranscriptionModal;