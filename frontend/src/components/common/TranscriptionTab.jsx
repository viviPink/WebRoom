import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com'
  : 'https://192.168.14.190:3002';

const TranscriptionTab = ({ recordingId, onClose, onSave }) => {
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

  // Конфигурация вкладок
  const tabs = [
    { id: 'transcription', label: 'Обычный конспект', field: 'transcription' },
    { id: 'timed', label: 'С таймингами', field: 'timedTranscription' },
    { id: 'summary', label: 'Краткий конспект', field: 'aiSummary' },
    { id: 'bulletPoints', label: 'Тезисы', field: 'aiBulletPoints' },
    { id: 'structure', label: 'Структура', field: 'aiStructure' },
    { id: 'questions', label: 'Вопросы', field: 'aiQuestions' }
  ];

  const actionToTab = {
    'summary': 'summary',
    'bullet_points': 'bulletPoints',
    'structure': 'structure',
    'questions': 'questions'
  };

  const actionNames = {
    'summary': 'Краткий конспект',
    'bullet_points': 'Тезисы',
    'structure': 'Структуру',
    'questions': 'Вопросы'
  };

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      setLmStudioAvailable(response.ok);
    } catch (err) {
      setLmStudioAvailable(false);
    }
  };

  useEffect(() => {
    if (!recordingId) {
      setError('ID записи не указан');
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
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
  }, [recordingId]);

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
      
      const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}`, {
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

  const playAudio = () => {
    if (!recordingInfo?.filePath) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(`${API_BASE_URL}${recordingInfo.filePath}`);
      
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
      const response = await fetch(`${API_BASE_URL}/api/enhance-transcription`, {
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
        const response = await fetch(`${API_BASE_URL}/api/enhance-transcription`, {
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
      <div className="transcription-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка конспекта...</p>
      </div>
    );
  }

  return (
    <div className="transcription-container">
      <style jsx>{`
        .transcription-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #f8f9fa;
          display: flex;
          flex-direction: column;
          z-index: 10000;
        }
        
        .transcription-header {
          background-color: #343a40;
          color: white;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .transcription-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        
        .transcription-subtitle {
          font-size: 13px;
          opacity: 0.8;
          margin-top: 4px;
        }
        
        .toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .ai-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }
        
        .ai-status.available {
          background-color: #28a745;
        }
        
        .ai-status.unavailable {
          background-color: #dc3545;
        }
        
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: white;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        
        .btn-success {
          background-color: #28a745;
          color: white;
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-info {
          background-color: #17a2b8;
          color: white;
        }
        
        .select-dark {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #495057;
          background-color: #495057;
          color: white;
          font-size: 13px;
          cursor: pointer;
        }
        
        .error-bar {
          padding: 12px 24px;
          background-color: #f8d7da;
          color: #721c24;
          border-bottom: 1px solid #f5c6cb;
          font-size: 14px;
        }
        
        .main-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .sidebar {
          width: 280px;
          background-color: white;
          border-right: 1px solid #dee2e6;
          padding: 20px;
          overflow-y: auto;
        }
        
        .sidebar-section {
          margin-bottom: 20px;
        }
        
        .sidebar-label {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 5px;
        }
        
        .sidebar-value {
          font-size: 14px;
          font-weight: bold;
          color: #111827;
        }
        
        .stats-list {
          font-size: 14px;
          line-height: 1.6;
        }
        
        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: white;
        }
        
        .tabs-bar {
          padding: 12px 20px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .tab-btn {
          padding: 8px 16px;
          background-color: #e9ecef;
          color: #495057;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .tab-btn.active {
          background-color: #007bff;
          color: white;
          font-weight: bold;
        }
        
        .tab-btn.has-content {
          background-color: #28a745;
          color: white;
        }
        
        .tab-btn.has-content.active {
          background-color: #007bff;
        }
        
        .content-hint {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #adb5bd;
          pointer-events: none;
        }
        
        .status-bar {
          padding: 10px 24px;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #6c757d;
        }
        
        .unsaved {
          color: #ffc107;
        }
        
        .transcription-loading {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .editor-textarea {
          width: 100%;
          height: 100%;
          padding: 30px;
          border: none;
          font-size: 16px;
          line-height: 1.7;
          resize: none;
          outline: none;
          box-sizing: border-box;
          font-family: 'Courier New', monospace;
        }
        
        @media (max-width: 768px) {
          .sidebar {
            width: 240px;
          }
          .toolbar {
            flex-wrap: wrap;
          }
          .btn {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      `}</style>

      <div className="transcription-header">
        <div>
          <h2 className="transcription-title">Редактор конспекта</h2>
          <div className="transcription-subtitle">
            {recordingInfo?.title || 'Без названия'} (ID: {recordingId})
          </div>
        </div>
        
        <div className="toolbar">
          {lmStudioAvailable !== null && (
            <div className={`ai-status ${lmStudioAvailable ? 'available' : 'unavailable'}`}>
              <span className="status-dot"></span>
              {lmStudioAvailable ? 'AI доступен' : 'AI недоступен'}
            </div>
          )}
          
          <button
            className="btn btn-info"
            onClick={generateAllVariants}
            disabled={generatingSummary || !lmStudioAvailable || !transcription.trim()}
          >
            Сгенерировать все варианты
          </button>
          
          <select
            className="select-dark"
            value={summaryAction}
            onChange={handleActionChange}
            disabled={generatingSummary || !lmStudioAvailable}
          >
            <option value="summary">Краткий конспект</option>
            <option value="bullet_points">Список тезисов</option>
            <option value="structure">Структура</option>
            <option value="questions">Вопросы</option>
          </select>
          
          <button
            className="btn btn-primary"
            onClick={enhanceText}
            disabled={generatingSummary || !lmStudioAvailable || !getCurrentText().trim()}
          >
            {generatingSummary ? 'Обработка...' : `Создать ${actionNames[summaryAction] || summaryAction}`}
          </button>
          
          {recordingInfo?.filePath && (
            <button
              className={`btn ${isPlaying ? 'btn-danger' : 'btn-success'}`}
              onClick={playAudio}
            >
              {isPlaying ? 'Пауза' : 'Прослушать'}
            </button>
          )}
          
          <button className="btn btn-secondary" onClick={onClose}>
            Закрыть
          </button>
          
          <button
            className="btn btn-success"
            onClick={handleSave}
            disabled={saving || !changesMade}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
      
      {(summaryError || error) && (
        <div className="error-bar">
          <strong>Ошибка:</strong> {summaryError || error}
        </div>
      )}
      
      <div className="main-layout">
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Название</div>
            <div className="sidebar-value">{recordingInfo?.title || 'Без названия'}</div>
          </div>
          
          <div className="sidebar-section">
            <div className="sidebar-label">Статистика текущей вкладки</div>
            <div className="stats-list">
              <div>Слов: {wordCount}</div>
              <div>Символов: {charCount}</div>
              {recordingInfo?.duration && (
                <div>Длительность: {Math.floor(recordingInfo.duration / 60)}:{String(recordingInfo.duration % 60).padStart(2, '0')}</div>
              )}
            </div>
          </div>
          
          <div className="sidebar-section">
            <div className="sidebar-label">Доступные конспекты</div>
            <div className="stats-list">
              <div>Обычный: {transcription ? 'есть' : 'нет'}</div>
              <div>С таймингами: {timedTranscription ? 'есть' : 'нет'}</div>
              <div>Краткий: {aiSummary ? 'есть' : 'нет'}</div>
              <div>Тезисы: {aiBulletPoints ? 'есть' : 'нет'}</div>
              <div>Структура: {aiStructure ? 'есть' : 'нет'}</div>
              <div>Вопросы: {aiQuestions ? 'есть' : 'нет'}</div>
            </div>
          </div>
          
          {recordingInfo?.teacherName && (
            <div className="sidebar-section">
              <div className="sidebar-label">Преподаватель</div>
              <div className="sidebar-value">{recordingInfo.teacherName}</div>
            </div>
          )}
          
          {recordingInfo?.createdAt && (
            <div className="sidebar-section">
              <div className="sidebar-label">Дата создания</div>
              <div className="sidebar-value">{new Date(recordingInfo.createdAt).toLocaleString()}</div>
            </div>
          )}
        </div>
        
        <div className="content-area">
          <div className="tabs-bar">
            {tabs.map(tab => {
              const hasContent = getCurrentTextByTabId(tab.id);
              return (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${hasContent ? 'has-content' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    updateCounts(getCurrentTextByTabId(tab.id));
                  }}
                >
                  {tab.label}
                  {hasContent && <span style={{ marginLeft: '8px', fontSize: '11px' }}>(есть текст)</span>}
                </button>
              );
            })}
          </div>
          
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={getCurrentText()}
              onChange={handleTextChange}
              className="editor-textarea"
              spellCheck="true"
              placeholder="Введите или отредактируйте текст конспекта..."
              autoFocus
            />
            
            {!getCurrentText() && !loading && (
              <div className="content-hint">
                <p style={{ fontSize: '18px', margin: 0 }}>Текст отсутствует</p>
                <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
                  Выберите действие в меню выше для генерации конспекта
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="status-bar">
        <div>
          {changesMade ? (
            <span className="unsaved">Есть несохраненные изменения</span>
          ) : (
            <span>Все изменения сохранены</span>
          )}
        </div>
        <div>
          {generatingSummary && <span>Обработка текста...</span>}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionTab;