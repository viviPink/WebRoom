import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = window.location.hostname.includes('tunnel4.com')
  ? ''
  : 'https://192.168.0.20:3002';

const TranscriptionTab = ({ recordingId, onClose, onSave, teacherId }) => {
  const [transcription, setTranscription] = useState('');
  const [originalTranscription, setOriginalTranscription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState(null);
  const [error, setError] = useState('');
  const [changesMade, setChangesMade] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  
  const [activeTab, setActiveTab] = useState('transcription');
  const [timedTranscription, setTimedTranscription] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiBulletPoints, setAiBulletPoints] = useState('');
  const [aiStructure, setAiStructure] = useState('');
  const [aiQuestions, setAiQuestions] = useState('');
  
  // РАЗДЕЛЯЕМ: промпт (настройка) и результат генерации
  const [customUserPrompt, setCustomUserPrompt] = useState('');      // промпт преподавателя
  const [customUserResult, setCustomUserResult] = useState('');     // сгенерированный текст во вкладке
  
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [selectedPromptAction, setSelectedPromptAction] = useState('summary');
  const [lmStudioAvailable, setLmStudioAvailable] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  
  const [showPromptsEditor, setShowPromptsEditor] = useState(false);
  const [userPrompts, setUserPrompts] = useState({});
  const [defaultPrompts, setDefaultPrompts] = useState({});
  const [editingPrompts, setEditingPrompts] = useState({});
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [hasCustomPrompts, setHasCustomPrompts] = useState(false);
  
  const textareaRef = useRef(null);

  const tabs = [
    { id: 'transcription', label: 'Обычный конспект', field: 'transcription' },
    // { id: 'timed', label: 'С таймингами', field: 'timedTranscription' },
    { id: 'summary', label: 'Краткий конспект', field: 'aiSummary' },
    { id: 'bulletPoints', label: 'Тезисы', field: 'aiBulletPoints' },
    { id: 'structure', label: 'Структура', field: 'aiStructure' },
    { id: 'questions', label: 'Вопросы', field: 'aiQuestions' },
    { id: 'customUser', label: 'Мой персональный конспект', field: 'customUserResult' }
  ];

  const actionToTab = {
    'summary': 'summary',
    'bullet_points': 'bulletPoints',
    'structure': 'structure',
    'questions': 'questions',
    'custom': 'customUser'  
  };

  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (teacherId) {
      headers['X-Teacher-ID'] = String(teacherId);
    }
    return headers;
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

  const loadUserPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/prompts`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserPrompts(data.prompts);
          setDefaultPrompts(data.default_prompts || data.prompts);
          setEditingPrompts({ ...data.prompts });
          setHasCustomPrompts(data.is_custom || false);
        }
      }
    } catch (err) {
      console.error('Error loading prompts:', err);
    }
  };

  // Загружаем промпт преподавателя (не результат)
  const loadTeacherCustomPrompt = async () => {
    if (!teacherId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacherId}/custom-prompt`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCustomUserPrompt(data.customPrompt || '');
        }
      }
    } catch (err) {
      console.error('Error loading teacher prompt:', err);
    }
  };

  // Сохраняем промпт преподавателя (не результат)
  const saveTeacherCustomPrompt = async () => {
    if (!teacherId) return;
    
    setSavingPrompts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacherId}/custom-prompt`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          customPrompt: customUserPrompt,
          selectedPromptType: 'custom',
          selectedPromptAction: 'custom'
        })
      });
      if (response.ok) {
        alert('Персональный промпт сохранен');
      } else {
        alert('Ошибка сохранения');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ошибка сохранения');
    } finally {
      setSavingPrompts(false);
    }
  };

  // Сохраняем сгенерированный текст во вкладке "Мой персональный конспект"
  const handleSaveCustomUserResult = async () => {
    if (!teacherId) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/${teacherId}/custom-prompt-result`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          customResult: customUserResult,
          recordingId: recordingId
        })
      });
      if (response.ok) {
        alert('Конспект сохранен');
        setChangesMade(false);
        if (onSave) {
          onSave(recordingId, customUserResult, 'customUserResult');
        }
      } else {
        alert('Ошибка сохранения');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const saveUserPrompts = async () => {
    setSavingPrompts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/prompts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(editingPrompts)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserPrompts({ ...editingPrompts });
          setHasCustomPrompts(true);
          alert('Ваши персональные промпты успешно сохранены');
        } else {
          alert('Ошибка: ' + (data.error || 'Не удалось сохранить'));
        }
      } else {
        alert('Ошибка сохранения промптов');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ошибка сохранения промптов: ' + err.message);
    } finally {
      setSavingPrompts(false);
    }
  };

  const resetToDefault = (key) => {
    if (defaultPrompts[key]) {
      setEditingPrompts(prev => ({
        ...prev,
        [key]: defaultPrompts[key]
      }));
    }
  };

  const deleteCustomPrompt = async (key) => {
    if (!window.confirm(`Удалить промпт "${key}"?`)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/prompts/${key}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (response.ok) {
        const newPrompts = { ...editingPrompts };
        delete newPrompts[key];
        setEditingPrompts(newPrompts);
        alert('Промпт удален');
      } else {
        alert('Ошибка удаления промпта');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ошибка удаления промпта');
    }
  };

  const resetAllToDefault = () => {
    if (!window.confirm('Сбросить ВСЕ ваши персональные промпты к системным значениям?')) return;
    setEditingPrompts({ ...defaultPrompts });
  };

  const resetServerPrompts = async () => {
    if (!window.confirm('Удалить ваши персональные настройки промптов с сервера?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/prompts/reset`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({})
      });
      if (response.ok) {
        await loadUserPrompts();
        setEditingPrompts({ ...userPrompts });
        setHasCustomPrompts(false);
        alert('Ваши промпты сброшены к системным значениям');
      } else {
        alert('Ошибка сброса промптов');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ошибка сброса промптов');
    }
  };

  useEffect(() => {
    if (!recordingId || isNaN(Number(recordingId))) {
      setError('ID записи не указан или некорректен');
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
        setCustomUserResult(data.customUserResult || '');
        
        updateCounts(data.transcription || '');
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message || 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    checkServerStatus();
    loadUserPrompts();
    loadTeacherCustomPrompt();
    
    return () => {};
  }, [recordingId, teacherId]);

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
      case 'customUser':
        setCustomUserResult(newText);
        break;
      default:
        break;
    }
    
    setChangesMade(true);
  };

  const getCurrentText = () => {
    switch(activeTab) {
      case 'transcription': return transcription;
      case 'timed': return timedTranscription;
      case 'summary': return aiSummary;
      case 'bulletPoints': return aiBulletPoints;
      case 'structure': return aiStructure;
      case 'questions': return aiQuestions;
      case 'customUser': return customUserResult;
      default: return transcription;
    }
  };

  const getCurrentFieldName = () => {
    switch(activeTab) {
      case 'transcription': return 'transcription';
      case 'timed': return 'timedTranscription';
      case 'summary': return 'aiSummary';
      case 'bulletPoints': return 'aiBulletPoints';
      case 'structure': return 'aiStructure';
      case 'questions': return 'aiQuestions';
      case 'customUser': return 'customUserResult';
      default: return 'transcription';
    }
  };

  const handleSave = async () => {
    if (!recordingId || isNaN(Number(recordingId))) {
      setError('Ошибка: некорректный ID записи. Закройте и откройте конспект снова.');
      return;
    }

    const currentText = getCurrentText();
    const fieldName = getCurrentFieldName();
    
    if (!currentText.trim() && !window.confirm('Сохранить пустой текст?')) {
      return;
    }
    
    if (activeTab === 'customUser') {
      await handleSaveCustomUserResult();
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      const updateData = {};
      updateData[fieldName] = currentText.trim();
      
      const response = await fetch(`${API_BASE_URL}/api/audio/${recordingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        let errorMessage = `Ошибка сервера (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const text = await response.text().catch(() => '');
          if (text) errorMessage += ': ' + text.slice(0, 200);
        }
        throw new Error(errorMessage);
      }
      
      if (activeTab === 'transcription') {
        setOriginalTranscription(currentText.trim());
      }
      
      setChangesMade(false);
      
      if (onSave) {
        onSave(recordingId, currentText.trim(), fieldName);
      }
      
      alert('Сохранено успешно');
      
    } catch (err) {
      console.error('Error saving:', err);
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const generateWithPrompt = async () => {
    const sourceText = getCurrentText();
    
    if (!sourceText.trim()) {
      alert('Нет текста для обработки.');
      return;
    }
    
    setGeneratingSummary(true);
    setSummaryError('');
    
    try {
      // Для custom промпта используем customUserPrompt (промпт преподавателя)
      let effectiveAction = selectedPromptAction;
      let customPromptText = null;
      
      if (selectedPromptAction === 'custom') {
        if (!customUserPrompt.trim()) {
          alert('Персональный промпт не заполнен. Настройте его в разделе "Настроить системные промпты".');
          setGeneratingSummary(false);
          return;
        }
        customPromptText = customUserPrompt;
        effectiveAction = 'custom';
      }
      
      const body = {
        text: sourceText,
        action: effectiveAction,
        recordingId: recordingId,
        teacher_id: teacherId
      };
      
      // Если это кастомный промпт, передаём его текст отдельно
      if (customPromptText) {
        body.customPrompt = customPromptText;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/enhance-transcription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (result.success && result.summary) {
        const improvedText = result.summary;
        
        let targetTabId;
        if (selectedPromptAction === 'summary') {
          targetTabId = 'summary';
        } else if (selectedPromptAction === 'bullet_points') {
          targetTabId = 'bulletPoints';
        } else if (selectedPromptAction === 'structure') {
          targetTabId = 'structure';
        } else if (selectedPromptAction === 'questions') {
          targetTabId = 'questions';
        } else {
          targetTabId = 'customUser';
        }
        
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
          case 'customUser':
            // Сохраняем результат в customUserResult (НЕ в промпт!)
            setCustomUserResult(improvedText);
            break;
          default:
            setTranscription(improvedText);
        }
        
        setChangesMade(true);
        setActiveTab(targetTabId);
        
        alert('Текст успешно сгенерирован');
      } else {
        setSummaryError(result.error || 'Ошибка обработки текста');
      }
    } catch (err) {
      console.error('Error:', err);
      setSummaryError('Не удалось подключиться к серверу');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const getAvailablePrompts = () => {
    const prompts = [];
    
    if (defaultPrompts.summary) prompts.push({ key: 'summary', name: 'Краткий конспект (системный)', isCustom: false });
    if (defaultPrompts.bullet_points) prompts.push({ key: 'bullet_points', name: 'Тезисы (системный)', isCustom: false });
    if (defaultPrompts.structure) prompts.push({ key: 'structure', name: 'Структура (системный)', isCustom: false });
    if (defaultPrompts.questions) prompts.push({ key: 'questions', name: 'Вопросы (системный)', isCustom: false });
    
    // Персональный промпт — отдельно, с пометкой
    prompts.push({ 
      key: 'custom', 
      name: customUserPrompt ? 'Мой персональный промпт (заполнен)' : 'Мой персональный промпт (пустой)', 
      isCustom: true, 
      isTeacherPrompt: true 
    });
    
    for (const [key, value] of Object.entries(editingPrompts)) {
      if (!defaultPrompts[key] && value && value.trim()) {
        prompts.push({ key: key, name: key + ' (свой)', isCustom: true });
      }
    }
    
    return prompts;
  };

  const getCurrentTextByTabId = (tabId) => {
    switch(tabId) {
      case 'transcription': return transcription;
      case 'timed': return timedTranscription;
      case 'summary': return aiSummary;
      case 'bulletPoints': return aiBulletPoints;
      case 'structure': return aiStructure;
      case 'questions': return aiQuestions;
      case 'customUser': return customUserResult;
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
      <style>{`
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
        .ai-status.available { background-color: #28a745; }
        .ai-status.unavailable { background-color: #dc3545; }
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
        .btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary { background-color: #007bff; color: white; }
        .btn-success { background-color: #28a745; color: white; }
        .btn-danger { background-color: #dc3545; color: white; }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-info { background-color: #17a2b8; color: white; }
        .btn-warning { background-color: #ffc107; color: #212529; }
        .btn-outline {
          background-color: transparent;
          border: 1px solid #6c757d;
          color: #6c757d;
        }
        .btn-outline:hover { background-color: #6c757d; color: white; }
        .select-dark {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #495057;
          background-color: #495057;
          color: white;
          font-size: 13px;
          cursor: pointer;
          min-width: 220px;
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
        .sidebar-section { margin-bottom: 20px; }
        .sidebar-label { font-size: 12px; color: #6c757d; margin-bottom: 5px; }
        .sidebar-value { font-size: 14px; font-weight: bold; color: #111827; }
        .stats-list { font-size: 14px; line-height: 1.6; }
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
        .tab-btn.active { background-color: #007bff; color: white; font-weight: bold; }
        .tab-btn.has-content { background-color: #28a745; color: white; }
        .tab-btn.has-content.active { background-color: #007bff; }
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
        .unsaved { color: #ffc107; }
        .custom-tab-note {
          margin-top: 10px;
          padding: 10px;
          background-color: #e3f2fd;
          border-radius: 6px;
          font-size: 12px;
          color: #1565c0;
        }
        .prompts-editor-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20000;
          padding: 20px;
        }
        .prompts-editor-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .prompts-editor-header {
          padding: 18px 24px;
          background: #343a40;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .prompts-editor-header h3 { margin: 0; font-size: 18px; }
        .prompts-editor-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .prompt-edit-block {
          margin-bottom: 24px;
          border: 1px solid #dee2e6;
          border-radius: 10px;
          overflow: hidden;
        }
        .prompt-edit-title {
          padding: 10px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .prompt-edit-name { font-weight: 600; font-size: 14px; color: #343a40; }
        .prompt-edit-hint { font-size: 11px; color: #6c757d; margin-top: 2px; }
        .prompt-edit-textarea {
          width: 100%;
          min-height: 140px;
          padding: 12px 16px;
          border: none;
          font-size: 13px;
          font-family: 'Courier New', monospace;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          color: #212529;
        }
        .prompts-editor-footer {
          padding: 14px 24px;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn-reset-prompt {
          padding: 5px 12px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #856404;
          transition: all 0.2s;
        }
        .btn-reset-prompt:hover { background: #ffc107; color: #212529; }
        .btn-delete-prompt {
          padding: 5px 12px;
          background: #f8d7da;
          border: 1px solid #dc3545;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #721c24;
          transition: all 0.2s;
        }
        .btn-delete-prompt:hover { background: #dc3545; color: white; }
        .badge-custom {
          display: inline-block;
          background: #ffc107;
          color: #212529;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: 8px;
        }
        .divider { border-top: 1px solid #dee2e6; margin: 16px 0; }
        .transcription-loading {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
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
          .sidebar { width: 240px; }
          .toolbar { flex-wrap: wrap; }
          .btn { padding: 6px 12px; font-size: 12px; }
          .select-dark { min-width: 180px; }
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
            className="btn btn-warning"
            onClick={() => setShowPromptsEditor(true)}
            title="Настроить системные промпты"
          >
            Настроить системные промпты
            {hasCustomPrompts && <span className="badge-custom">изменены</span>}
          </button>
          
          <select
            className="select-dark"
            value={selectedPromptAction}
            onChange={(e) => setSelectedPromptAction(e.target.value)}
            disabled={generatingSummary || !lmStudioAvailable}
          >
            {getAvailablePrompts().map(prompt => (
              <option key={prompt.key} value={prompt.key}>
                {prompt.name}
              </option>
            ))}
          </select>
          
          <button
            className="btn btn-primary"
            onClick={generateWithPrompt}
            disabled={generatingSummary || !lmStudioAvailable || !getCurrentText().trim()}
          >
            {generatingSummary ? 'Обработка...' : 'Сгенерировать конспект'}
          </button>
          
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
              {/* <div>С таймингами: {timedTranscription ? 'есть' : 'нет'}</div> */}
              <div>Краткий: {aiSummary ? 'есть' : 'нет'}</div>
              <div>Тезисы: {aiBulletPoints ? 'есть' : 'нет'}</div>
              <div>Структура: {aiStructure ? 'есть' : 'нет'}</div>
              <div>Вопросы: {aiQuestions ? 'есть' : 'нет'}</div>
              <div>Мой персональный: {customUserResult ? 'есть' : 'нет'}</div>
            </div>
          </div>
          
          <div className="custom-tab-note">
            <strong>О вкладке "Мой персональный конспект":</strong><br />
            Здесь хранится результат генерации с вашим персональным промптом. 
            Сам промпт настраивается в разделе "Настроить системные промпты".
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
              placeholder={activeTab === 'customUser' ? 
                "Здесь будет результат генерации с вашим персональным промптом. Нажмите 'Сгенерировать конспект'." : 
                "Введите или отредактируйте текст конспекта..."}
              autoFocus
            />
            
            {!getCurrentText() && !loading && activeTab === 'customUser' && (
              <div className="content-hint">
                <p style={{ fontSize: '18px', margin: 0 }}>Конспект не сгенерирован</p>
                <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
                  Настройте ваш персональный промпт в разделе "Настроить системные промпты",<br />
                  затем выберите "Мой персональный промпт" в меню и нажмите "Сгенерировать конспект"
                </p>
              </div>
            )}
            
            {!getCurrentText() && !loading && activeTab !== 'customUser' && (
              <div className="content-hint">
                <p style={{ fontSize: '18px', margin: 0 }}>Текст отсутствует</p>
                <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
                  Выберите промпт в меню выше и нажмите "Сгенерировать конспект"
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

      {showPromptsEditor && (
        <div className="prompts-editor-overlay" onClick={() => setShowPromptsEditor(false)}>
          <div className="prompts-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prompts-editor-header">
              <h3>Настройка системных промптов</h3>
              <button className="btn btn-secondary" onClick={() => setShowPromptsEditor(false)}>Закрыть</button>
            </div>
            
            <div className="prompts-editor-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: '#e3f2fd', borderRadius: '8px', fontSize: '13px' }}>
                <strong>Важно:</strong> Здесь вы можете изменить системные промпты для генерации конспектов.
                Изменения применяются только для вашего аккаунта преподавателя и не влияют на других.
              </div>
              
              {/* ПЕРСОНАЛЬНЫЙ ПРОМПТ ПРЕПОДАВАТЕЛЯ */}
              <div className="prompt-edit-block" style={{ border: '2px solid #007bff' }}>
                <div className="prompt-edit-title" style={{ background: '#e3f2fd' }}>
                  <div>
                    <span className="prompt-edit-name" style={{ color: '#1565c0' }}>
                       Мой персональный промпт
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#1565c0' }}>
                      (используется для генерации во вкладку "Мой персональный конспект")
                    </span>
                  </div>
                  {customUserPrompt && (
                    <button
                      className="btn-reset-prompt"
                      onClick={() => setCustomUserPrompt('')}
                    >
                      Очистить
                    </button>
                  )}
                </div>
                <textarea
                  className="prompt-edit-textarea"
                  value={customUserPrompt || ''}
                  onChange={(e) => setCustomUserPrompt(e.target.value)}
                  placeholder={"Введите ваш персональный промпт.\nИспользуйте {text} для подстановки текста лекции.\n\nПример:\nСделай анализ этого текста и выдели 5 самых важных моментов:\n\n{text}\n\nВыводы:"}
                  style={{ minHeight: '160px' }}
                />
                <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="prompt-edit-hint">
                    Используйте {'{text}'} для подстановки текста лекции
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={saveTeacherCustomPrompt}
                    disabled={savingPrompts}
                  >
                    {savingPrompts ? 'Сохранение...' : 'Сохранить промпт'}
                  </button>
                </div>
              </div>

              <div className="divider" />

              {Object.entries(editingPrompts).map(([key, value]) => {
                const displayName = key === 'summary' ? 'Краткий конспект' :
                                  key === 'bullet_points' ? 'Тезисы' :
                                  key === 'structure' ? 'Структура' :
                                  key === 'questions' ? 'Вопросы' : key;
                
                return (
                  <div key={key} className="prompt-edit-block">
                    <div className="prompt-edit-title">
                      <div>
                        <span className="prompt-edit-name">{displayName}</span>
                        {defaultPrompts[key] && editingPrompts[key] !== defaultPrompts[key] && (
                          <span className="badge-custom" style={{ marginLeft: '8px' }}>изменён</span>
                        )}
                      </div>
                      <div>
                        {defaultPrompts[key] && (
                          <button
                            className="btn-reset-prompt"
                            onClick={() => resetToDefault(key)}
                            style={{ marginRight: '8px' }}
                          >
                            Сбросить
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      className="prompt-edit-textarea"
                      value={value || ''}
                      onChange={(e) => setEditingPrompts(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Текст промпта. Используйте {text} для подстановки текста лекции"
                    />
                    <div className="prompt-edit-hint" style={{ padding: '8px 16px' }}>
                      Используйте {'{text}'} для подстановки текста лекции
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="prompts-editor-footer">
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={resetAllToDefault}
                  style={{ marginRight: '8px' }}
                >
                  Сбросить все
                </button>
                <button
                  className="btn btn-danger"
                  onClick={resetServerPrompts}
                >
                  Удалить персональные настройки
                </button>
              </div>
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingPrompts({ ...userPrompts });
                    setShowPromptsEditor(false);
                  }}
                  style={{ marginRight: '8px' }}
                >
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveUserPrompts}
                  disabled={savingPrompts}
                >
                  {savingPrompts ? 'Сохранение...' : 'Сохранить системные промпты'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionTab;