import React, { useState, useEffect, useRef } from 'react';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const PYTHON_SERVER_URL = window.location.hostname.includes('tunnel4.com')
  ? 'https://YOUR-PYTHON-TUNNEL.tunnel4.com'
  : 'http://192.168.0.20:5000';

const WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'];

const WHISPER_PROVIDERS = [
  { id: 'local',  label: 'Локальный',     description: 'Whisper на вашем сервере',          needsKey: false, needsModel: true,  needsUrl: false },
  { id: 'openai', label: 'OpenAI Cloud',  description: 'whisper-1 через OpenAI API',         needsKey: true,  needsModel: false, needsUrl: false, hint: 'Дешевле для нечастых запросов, точнее на акцентах' },
  { id: 'custom', label: 'Свой endpoint', description: 'Любой Whisper-совместимый API',      needsKey: true,  needsModel: true,  needsUrl: true,  hint: 'Azure, self-hosted faster-whisper и др.' },
];

const DEFAULT_TEST_TEXT = `Сегодня мы рассмотрим основные принципы машинного обучения. Машинное обучение — это подраздел искусственного интеллекта, который позволяет системам автоматически обучаться и улучшаться на основе опыта без явного программирования. Существует три основных типа обучения: обучение с учителем, обучение без учителя и обучение с подкреплением. Каждый из них имеет свои преимущества и области применения.`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AdminModelSettings = ({ admin, onBack }) => {
  const [activeTab, setActiveTab] = useState('whisper');

  const [settings, setSettings] = useState({
    whisper_provider: 'local',
    whisper_model: 'base',
    whisper_api_key: '',
    whisper_custom_url: '',
    lm_studio_url: 'http://192.168.0.16:1234',
    lm_studio_model: 'qwen2.5-7b-instruct-1m',
  });
  const [draft, setDraft] = useState({ ...settings });

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [reloading, setReloading] = useState(false);
  const [toast, setToast]       = useState(null);

  // LLM test
  const [llmTestText, setLlmTestText]   = useState(DEFAULT_TEST_TEXT);
  const [llmAction, setLlmAction]       = useState('summary');
  const [llmResult, setLlmResult]       = useState('');
  const [llmTesting, setLlmTesting]     = useState(false);
  const [llmStats, setLlmStats]         = useState(null);
  const [llmAvailableModels, setLlmAvailableModels] = useState([]);
  const [llmStatus, setLlmStatus]       = useState(null);

  // Whisper test
  const [whisperState, setWhisperState]       = useState('idle'); // idle | recording | processing | done
  const [whisperTranscript, setWhisperTranscript] = useState('');
  const [whisperStats, setWhisperStats]       = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel]           = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const timerRef         = useRef(null);
  const analyserRef      = useRef(null);
  const animFrameRef     = useRef(null);
  const streamRef        = useRef(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchSettings();
    return () => stopRecording(true);
  }, []);

  // ─── API ─────────────────────────────────────────────────────────────────────

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${PYTHON_SERVER_URL}/admin/model-settings`);
      const data = await res.json();
      if (data.success) {
        const merged = { ...settings, ...data.settings };
        setSettings(merged);
        setDraft(merged);
      }
    } catch {
      showToast('error', 'Не удалось загрузить настройки — сервер недоступен');
    } finally {
      setLoading(false);
    }
  };

  const checkLLM = async () => {
    setLlmStatus('checking');
    try {
      const res  = await fetch(`${PYTHON_SERVER_URL}/summarize/status`);
      const data = await res.json();
      setLlmStatus(data);
      if (data.available_models?.length) setLlmAvailableModels(data.available_models);
    } catch {
      setLlmStatus({ available: false, message: 'Сервер недоступен' });
    }
  };

  const saveLLM = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${PYTHON_SERVER_URL}/admin/model-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lm_studio_url: draft.lm_studio_url, lm_studio_model: draft.lm_studio_model }),
      });
      const data = await res.json();
      if (data.success) { setSettings(s => ({ ...s, ...data.settings })); showToast('success', 'LLM настройки сохранены'); }
      else showToast('error', data.error || 'Ошибка сохранения');
    } catch { showToast('error', 'Ошибка подключения'); }
    finally   { setSaving(false); }
  };

  const saveAndReloadWhisper = async () => {
    setReloading(true);
    try {
      const res  = await fetch(`${PYTHON_SERVER_URL}/admin/model-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whisper_model:      draft.whisper_model,
          whisper_provider:   draft.whisper_provider,
          whisper_api_key:    draft.whisper_api_key,
          whisper_custom_url: draft.whisper_custom_url,
          reload_whisper:     draft.whisper_provider === 'local',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(s => ({ ...s, ...data.settings }));
        showToast('success', data.whisper_reloaded
          ? `Whisper перезагружен: ${data.settings.whisper_model}`
          : 'Настройки Whisper сохранены');
      } else showToast('error', data.error || 'Ошибка');
    } catch { showToast('error', 'Ошибка подключения'); }
    finally   { setReloading(false); }
  };

  // ─── LLM test ────────────────────────────────────────────────────────────────

  const runLLMTest = async () => {
    if (!llmTestText.trim()) return;
    setLlmTesting(true);
    setLlmResult('');
    setLlmStats(null);
    const t0 = Date.now();
    try {
      const res  = await fetch(`${PYTHON_SERVER_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: llmTestText, action: llmAction }),
      });
      const data = await res.json();
      const result = data.summary || data.result || data.text;
      if (result) {
        setLlmResult(result);
        setLlmStats({ elapsed: ((Date.now() - t0) / 1000).toFixed(1), chars_in: llmTestText.length, chars_out: result.length });
      } else {
        setLlmResult(data.error ? `Ошибка: ${data.error}` : JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setLlmResult(`Не удалось подключиться: ${e.message}`);
    } finally {
      setLlmTesting(false);
    }
  };

  // ─── Whisper recording ───────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const drawLevel = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        setAudioLevel(data.reduce((a, b) => a + b, 0) / data.length);
        animFrameRef.current = requestAnimationFrame(drawLevel);
      };
      drawLevel();

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);
        stream.getTracks().forEach(t => t.stop());
        await sendAudioToWhisper();
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setWhisperState('recording');
      setWhisperTranscript('');
      setWhisperStats(null);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (e) {
      showToast('error', `Микрофон недоступен: ${e.message}`);
    }
  };

  const stopRecording = (silent = false) => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (!silent) setWhisperState('processing');
  };

  const sendAudioToWhisper = async () => {
    setWhisperState('processing');
    const blob     = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', blob, 'test.webm');
    formData.append('return_timings', 'true');
    const t0 = Date.now();
    try {
      const res  = await fetch(`${PYTHON_SERVER_URL}/transcribe`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text !== undefined) {
        setWhisperTranscript(data.text || '(пустой результат)');
        setWhisperStats({
          elapsed:         ((Date.now() - t0) / 1000).toFixed(1),
          processing_time: data.processing_time?.toFixed(2),
          pauses:          data.pauses_found || 0,
          pace:            data.speech_analysis?.speech_pace?.toFixed(0),
        });
      } else {
        setWhisperTranscript(`Ошибка: ${data.error || 'Нет текста в ответе'}`);
      }
    } catch (e) {
      setWhisperTranscript(`Ошибка подключения: ${e.message}`);
    } finally {
      setWhisperState('done');
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const currentProvider = WHISPER_PROVIDERS.find(p => p.id === draft.whisper_provider) || WHISPER_PROVIDERS[0];
  const isDirtyLLM     = draft.lm_studio_url !== settings.lm_studio_url || draft.lm_studio_model !== settings.lm_studio_model;
  const isDirtyWhisper = ['whisper_model', 'whisper_provider', 'whisper_api_key', 'whisper_custom_url'].some(k => draft[k] !== settings[k]);

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="ms-page">

      {/* Toast */}
      {toast && (
        <div className={`ms-toast ${toast.type === 'success' ? 'ms-toast-ok' : 'ms-toast-err'}`}>
          {toast.text}
        </div>
      )}

      {/* Header — same pattern as TeacherLoginView */}
      <div className="ms-header">
        <div className="ms-logo-section">
          <div className="ms-logo" />
          <span className="ms-title">ВебРум</span>
        </div>
        <button onClick={onBack} className="ms-back-button">← Назад</button>
      </div>

      {/* Page title bar */}
      <div className="ms-titlebar">
        <div>
          <h1 className="ms-page-title">Настройки моделей</h1>
          <p className="ms-page-sub">Конфигурация и тестирование Whisper и LLM</p>
        </div>
        <button onClick={fetchSettings} className="ms-refresh-btn" disabled={loading}>
          {loading ? '...' : 'Обновить'}
        </button>
      </div>

      {/* Tabs */}
      <div className="ms-tabs">
        {[
          { id: 'whisper', label: 'Whisper',        sub: 'Распознавание речи' },
          { id: 'llm',     label: 'LLM',            sub: 'Языковая модель'    },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ms-tab ${activeTab === tab.id ? 'ms-tab-active' : ''}`}
          >
            <span className="ms-tab-label">{tab.label}</span>
            <span className="ms-tab-sub">{tab.sub}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ms-loading">Загрузка настроек...</div>
      ) : (
        <div className="ms-body">

          {/* ══════ WHISPER TAB ══════ */}
          {activeTab === 'whisper' && (
            <div className="ms-two-col">

              {/* Config card */}
              <div className="ms-card">
                <h2 className="ms-card-title">Конфигурация Whisper</h2>
                <p className="ms-card-sub">
                  Активная модель: <strong>{settings.whisper_model}</strong> &nbsp;/&nbsp; {settings.whisper_provider || 'local'}
                </p>

                {/* Provider */}
                <div className="ms-field">
                  <label className="ms-label">Провайдер</label>
                  <div className="ms-provider-grid">
                    {WHISPER_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setDraft(d => ({ ...d, whisper_provider: p.id }))}
                        className={`ms-provider-card ${draft.whisper_provider === p.id ? 'ms-provider-active' : ''}`}
                      >
                        <span className="ms-provider-label">{p.label}</span>
                        <span className="ms-provider-desc">{p.description}</span>
                        {p.hint && <span className="ms-provider-hint">{p.hint}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model chips (local) */}
                {currentProvider.needsModel && currentProvider.id === 'local' && (
                  <div className="ms-field">
                    <label className="ms-label">Модель Whisper</label>
                    <div className="ms-chip-row">
                      {WHISPER_MODELS.map(m => (
                        <button
                          key={m}
                          onClick={() => setDraft(d => ({ ...d, whisper_model: m }))}
                          className={`ms-chip ${draft.whisper_model === m ? 'ms-chip-active' : ''}`}
                        >
                          {m}{m === 'base' && <span className="ms-chip-tag">реком.</span>}
                        </button>
                      ))}
                    </div>
                    <div className="ms-size-row">
                      {[['tiny','39 МБ'],['base','74 МБ'],['small','244 МБ'],['medium','769 МБ'],['large','~1.5 ГБ']].map(([n,s]) => (
                        <span key={n} className={`ms-size-item ${draft.whisper_model.startsWith(n) ? 'ms-size-active' : ''}`}>
                          {n}: {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model input (custom) */}
                {currentProvider.needsModel && currentProvider.id !== 'local' && (
                  <div className="ms-field">
                    <label className="ms-label">Название модели</label>
                    <div className="input-wrapper">
                      <input
                        value={draft.whisper_model}
                        onChange={e => setDraft(d => ({ ...d, whisper_model: e.target.value }))}
                        placeholder="whisper-1"
                        className="input-field"
                      />
                    </div>
                  </div>
                )}

                {/* API Key */}
                {currentProvider.needsKey && (
                  <div className="ms-field">
                    <label className="ms-label">API ключ</label>
                    <div className="input-wrapper">
                      <input
                        type="password"
                        value={draft.whisper_api_key}
                        onChange={e => setDraft(d => ({ ...d, whisper_api_key: e.target.value }))}
                        placeholder="sk-..."
                        className="input-field"
                      />
                    </div>
                  </div>
                )}

                {/* Custom URL */}
                {currentProvider.needsUrl && (
                  <div className="ms-field">
                    <label className="ms-label">Endpoint URL</label>
                    <div className="input-wrapper">
                      <input
                        value={draft.whisper_custom_url}
                        onChange={e => setDraft(d => ({ ...d, whisper_custom_url: e.target.value }))}
                        placeholder="https://..."
                        className="input-field"
                      />
                    </div>
                  </div>
                )}

                <div className="ms-card-footer">
                  <button
                    onClick={saveAndReloadWhisper}
                    disabled={!isDirtyWhisper || reloading}
                    className="submit-button"
                    style={{ marginTop: 0, width: 'auto', padding: '12px 24px' }}
                  >
                    {reloading ? 'Загружаем...' : currentProvider.id === 'local' ? 'Сохранить и перезагрузить' : 'Сохранить'}
                  </button>
                  {!isDirtyWhisper && <span className="ms-unchanged">Нет изменений</span>}
                </div>
              </div>

              {/* Test card */}
              <div className="ms-card">
                <h2 className="ms-card-title">Тест распознавания речи</h2>
                <p className="ms-card-sub">
                  Запишите голос и проверьте качество транскрипции текущей модели.
                </p>

                <div className="ms-recorder">
                  {/* Waveform */}
                  <div className="ms-wave">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const active = whisperState === 'recording';
                      const h = active
                        ? Math.max(3, (audioLevel / 255) * 44 * (0.4 + Math.sin(i * 0.9 + Date.now() / 180) * 0.6))
                        : whisperState === 'done' ? 12 + Math.abs(Math.sin(i * 1.3)) * 20 : 3;
                      return (
                        <div
                          key={i}
                          className="ms-wave-bar"
                          style={{
                            height: h,
                            background: active ? '#7B61FF' : whisperState === 'done' ? '#7B61FF' : '#E5E7EB',
                            opacity: active ? 1 : whisperState === 'done' ? 0.45 : 1,
                            transition: active ? 'height 0.07s' : 'height 0.35s',
                          }}
                        />
                      );
                    })}
                  </div>

                  {whisperState === 'recording' && (
                    <div className="ms-rec-timer">
                      <span className="ms-rec-dot" /> {fmtTime(recordingDuration)}
                    </div>
                  )}
                  {whisperState === 'processing' && (
                    <div className="ms-processing">Распознаём...</div>
                  )}

                  <div className="ms-rec-btns">
                    {(whisperState === 'idle' || whisperState === 'done') && (
                      <button onClick={startRecording} className="submit-button" style={{ marginTop: 0, width: 'auto', padding: '12px 24px' }}>
                        {whisperState === 'done' ? 'Записать ещё раз' : 'Начать запись'}
                      </button>
                    )}
                    {whisperState === 'recording' && (
                      <button onClick={() => stopRecording(false)} className="ms-stop-btn">
                        Остановить и распознать
                      </button>
                    )}
                  </div>
                </div>

                {whisperTranscript && (
                  <div className="ms-result">
                    <div className="ms-result-header">
                      <span className="ms-result-label">Транскрипция</span>
                      {whisperStats && (
                        <div className="ms-stat-row">
                          <span className="ms-stat">{whisperStats.elapsed} с</span>
                          {whisperStats.processing_time && <span className="ms-stat">модель: {whisperStats.processing_time} с</span>}
                          {whisperStats.pauses > 0 && <span className="ms-stat">{whisperStats.pauses} пауз</span>}
                          {whisperStats.pace && <span className="ms-stat">{whisperStats.pace} сл/мин</span>}
                        </div>
                      )}
                    </div>
                    <div className="ms-result-text">{whisperTranscript}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════ LLM TAB ══════ */}
          {activeTab === 'llm' && (
            <div className="ms-two-col">

              {/* Config card */}
              <div className="ms-card">
                <h2 className="ms-card-title">Конфигурация LLM</h2>
                <p className="ms-card-sub">Активная модель: <strong>{settings.lm_studio_model}</strong></p>

                <div className="ms-field">
                  <label className="ms-label">URL LM Studio</label>
                  <div className="input-wrapper">
                    <input
                      value={draft.lm_studio_url}
                      onChange={e => setDraft(d => ({ ...d, lm_studio_url: e.target.value }))}
                      placeholder="http://192.168.0.16:1234"
                      className="input-field"
                    />
                  </div>
                  <p className="ms-hint">Адрес запущенного LM Studio, обычно порт 1234.</p>
                </div>

                <div className="ms-field">
                  <label className="ms-label">Название модели</label>
                  <div className="input-wrapper">
                    <input
                      value={draft.lm_studio_model}
                      onChange={e => setDraft(d => ({ ...d, lm_studio_model: e.target.value }))}
                      placeholder="qwen2.5-7b-instruct-1m"
                      className="input-field"
                    />
                  </div>
                  {llmAvailableModels.length > 0 && (
                    <div className="ms-chip-row" style={{ marginTop: 8 }}>
                      {llmAvailableModels.map(m => (
                        <button
                          key={m}
                          onClick={() => setDraft(d => ({ ...d, lm_studio_model: m }))}
                          className={`ms-chip ${draft.lm_studio_model === m ? 'ms-chip-active' : ''}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="ms-hint">Должно совпадать с именем загруженной модели в LM Studio.</p>
                </div>

                <button
                  onClick={checkLLM}
                  disabled={llmStatus === 'checking'}
                  className="ms-secondary-btn"
                >
                  {llmStatus === 'checking' ? 'Проверяем...' : 'Проверить соединение'}
                </button>

                {llmStatus && llmStatus !== 'checking' && (
                  <div className={`ms-status ${llmStatus.available ? 'ms-status-ok' : 'ms-status-err'}`}>
                    {llmStatus.available ? 'Соединение установлено' : 'Соединение не установлено'}&nbsp;—&nbsp;{llmStatus.message}
                  </div>
                )}

                <div className="ms-card-footer">
                  <button
                    onClick={saveLLM}
                    disabled={!isDirtyLLM || saving}
                    className="submit-button"
                    style={{ marginTop: 0, width: 'auto', padding: '12px 24px' }}
                  >
                    {saving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                  {!isDirtyLLM && <span className="ms-unchanged">Нет изменений</span>}
                </div>
              </div>

              {/* Test card */}
              <div className="ms-card">
                <h2 className="ms-card-title">Тест LLM</h2>
                <p className="ms-card-sub">Проверьте работу модели на тестовом тексте.</p>

                <div className="ms-field">
                  <div className="ms-label-row">
                    <label className="ms-label">Тестовый текст</label>
                    <button className="ms-reset-btn" onClick={() => setLlmTestText(DEFAULT_TEST_TEXT)}>
                      Сбросить пример
                    </button>
                  </div>
                  <textarea
                    value={llmTestText}
                    onChange={e => setLlmTestText(e.target.value)}
                    rows={6}
                    className="ms-textarea"
                    placeholder="Вставьте текст для обработки..."
                  />
                  <p className="ms-hint">{llmTestText.length} символов</p>
                </div>

                <div className="ms-field">
                  <label className="ms-label">Действие</label>
                  <div className="ms-chip-row">
                    {[
                      { id: 'summary',       label: 'Конспект'  },
                      { id: 'bullet_points', label: 'Тезисы'    },
                      { id: 'structure',     label: 'Структура' },
                      { id: 'questions',     label: 'Вопросы'   },
                    ].map(a => (
                      <button
                        key={a.id}
                        onClick={() => setLlmAction(a.id)}
                        className={`ms-chip ${llmAction === a.id ? 'ms-chip-active' : ''}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={runLLMTest}
                  disabled={llmTesting || !llmTestText.trim()}
                  className="submit-button"
                  style={{ marginTop: 0 }}
                >
                  {llmTesting ? 'Обрабатываем...' : 'Запустить тест'}
                </button>

                {llmResult && (
                  <div className="ms-result">
                    <div className="ms-result-header">
                      <span className="ms-result-label">Результат</span>
                      {llmStats && (
                        <div className="ms-stat-row">
                          <span className="ms-stat">{llmStats.elapsed} с</span>
                          <span className="ms-stat">{llmStats.chars_in} → {llmStats.chars_out} симв.</span>
                        </div>
                      )}
                    </div>
                    <div className="ms-result-text">{llmResult}</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      <style>{`
        /* ── Base (inherits TeacherLoginView tokens) ── */
        .ms-page {
          min-height: 100vh;
          background-color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Header — identical to TeacherLoginView */
        .ms-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid #e5e7eb;
        }
        .ms-logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ms-logo {
          width: 48px;
          height: 48px;
          background-color: #7B61FF;
          border-radius: 12px;
        }
        .ms-title {
          font-size: 24px;
          font-weight: 700;
          color: #000;
        }
        .ms-back-button {
          background: none;
          border: none;
          font-size: 16px;
          color: #6B7280;
          cursor: pointer;
          padding: 8px 16px;
          transition: color 0.2s;
        }
        .ms-back-button:hover { color: #7B61FF; }

        /* Title bar */
        .ms-titlebar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 28px 40px 0;
        }
        .ms-page-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #000;
        }
        .ms-page-sub {
          margin: 4px 0 0;
          font-size: 15px;
          color: #6B7280;
        }
        .ms-refresh-btn {
          background: none;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 18px;
          font-size: 14px;
          color: #6B7280;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .ms-refresh-btn:hover { color: #7B61FF; border-color: #7B61FF; }

        /* Tabs */
        .ms-tabs {
          display: flex;
          gap: 8px;
          padding: 24px 40px 0;
        }
        .ms-tab {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 28px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          color: #374151;
        }
        .ms-tab:hover { border-color: #7B61FF; }
        .ms-tab-active {
          background-color: #7B61FF;
          border-color: #7B61FF;
          color: #fff;
        }
        .ms-tab-active .ms-tab-sub { color: rgba(255,255,255,0.7); }
        .ms-tab-label { font-size: 15px; font-weight: 700; }
        .ms-tab-sub   { font-size: 12px; color: #9CA3AF; }

        /* Loading */
        .ms-loading {
          text-align: center;
          padding: 80px 0;
          color: #6B7280;
          font-size: 15px;
        }

        /* Body / grid */
        .ms-body    { padding: 24px 40px 48px; }
        .ms-two-col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        /* Card */
        .ms-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 28px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: #fff;
        }
        .ms-card-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #000;
        }
        .ms-card-sub {
          margin: -12px 0 0;
          font-size: 14px;
          color: #6B7280;
          line-height: 1.5;
        }
        .ms-card-footer {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-top: 4px;
          border-top: 1px solid #f3f4f6;
        }

        /* Fields — reuse TeacherLoginView classes */
        .ms-field        { display: flex; flex-direction: column; gap: 7px; }
        .ms-label        { font-size: 14px; font-weight: 600; color: #374151; }
        .ms-label-row    { display: flex; justify-content: space-between; align-items: center; }
        .ms-hint         { margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.4; }
        .ms-unchanged    { font-size: 13px; color: #9CA3AF; }
        .ms-reset-btn    { background: none; border: none; font-size: 13px; color: #7B61FF; cursor: pointer; padding: 0; }

        /* Input — same as TeacherLoginView */
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-field {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s;
          box-sizing: border-box;
          font-family: inherit;
          color: #111827;
        }
        .input-field:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }
        .ms-textarea {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          color: #111827;
          line-height: 1.6;
          resize: vertical;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .ms-textarea:focus {
          outline: none;
          border-color: #7B61FF;
          box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.1);
        }

        /* Submit — same as TeacherLoginView */
        .submit-button {
          width: 100%;
          padding: 16px;
          background-color: #7B61FF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }
        .submit-button:hover:not(:disabled) {
          background-color: #6750E0;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(123, 97, 255, 0.3);
        }
        .submit-button:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Secondary button */
        .ms-secondary-btn {
          padding: 12px 20px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }
        .ms-secondary-btn:hover:not(:disabled) { border-color: #7B61FF; color: #7B61FF; }
        .ms-secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Stop button (recording) */
        .ms-stop-btn {
          padding: 12px 24px;
          background: #fff;
          border: 2px solid #EF4444;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          color: #EF4444;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ms-stop-btn:hover { background: #FEF2F2; }

        /* Provider grid */
        .ms-provider-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .ms-provider-card  {
          display: flex; flex-direction: column; gap: 3px;
          padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px;
          background: #f9fafb; cursor: pointer; text-align: left; transition: all 0.2s;
        }
        .ms-provider-card:hover { border-color: #7B61FF; }
        .ms-provider-active { border: 2px solid #7B61FF; background: #f5f3ff; }
        .ms-provider-label  { font-size: 13px; font-weight: 700; color: #111827; }
        .ms-provider-desc   { font-size: 11px; color: #6B7280; line-height: 1.3; }
        .ms-provider-hint   { font-size: 11px; color: #7B61FF; margin-top: 3px; }

        /* Chips */
        .ms-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .ms-chip {
          padding: 7px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
          background: #f9fafb; font-size: 13px; cursor: pointer; color: #374151;
          display: flex; align-items: center; gap: 6px; transition: all 0.15s;
        }
        .ms-chip:hover      { border-color: #7B61FF; color: #7B61FF; }
        .ms-chip-active     { border: 1.5px solid #7B61FF; background: #f5f3ff; color: #7B61FF; font-weight: 600; }
        .ms-chip-tag        { font-size: 10px; background: #dcfce7; color: #166534; padding: 1px 5px; border-radius: 4px; font-weight: 600; }

        /* Model size hints */
        .ms-size-row   { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .ms-size-item  { font-size: 11px; color: #9CA3AF; padding: 2px 8px; border-radius: 4px; background: #f3f4f6; }
        .ms-size-active { background: #f5f3ff; color: #7B61FF; font-weight: 600; }

        /* Status */
        .ms-status     { padding: 11px 16px; border-radius: 10px; font-size: 14px; border: 1px solid; }
        .ms-status-ok  { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
        .ms-status-err { background: #fff1f2; border-color: #fecdd3; color: #be123c; }

        /* Recorder */
        .ms-recorder {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .ms-wave     { display: flex; align-items: center; gap: 3px; height: 52px; }
        .ms-wave-bar { width: 5px; border-radius: 3px; min-height: 3px; }
        .ms-rec-timer {
          font-size: 22px; font-weight: 700; color: #7B61FF;
          display: flex; align-items: center; gap: 8px;
        }
        .ms-rec-dot {
          width: 10px; height: 10px; border-radius: 50%; background: #EF4444;
          animation: msPulse 1s ease-in-out infinite;
          display: inline-block;
        }
        @keyframes msPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
        .ms-processing { font-size: 15px; color: #6B7280; }
        .ms-rec-btns   { display: flex; gap: 10px; }

        /* Result box */
        .ms-result { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .ms-result-header {
          padding: 10px 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 8px; background: #f9fafb;
        }
        .ms-result-label { font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: .06em; }
        .ms-stat-row  { display: flex; gap: 8px; flex-wrap: wrap; }
        .ms-stat {
          font-size: 12px; color: #6B7280; background: #fff;
          padding: 2px 8px; border-radius: 6px; border: 1px solid #e5e7eb;
        }
        .ms-result-text {
          padding: 16px; font-size: 14px; color: #111827;
          line-height: 1.7; white-space: pre-wrap;
          max-height: 260px; overflow-y: auto;
        }

        /* Toast */
        .ms-toast {
          position: fixed; top: 20px; right: 20px;
          padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
          z-index: 1000; box-shadow: 0 4px 16px rgba(0,0,0,.12);
        }
        .ms-toast-ok  { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .ms-toast-err { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }

        /* Responsive */
        @media (max-width: 900px) {
          .ms-header, .ms-titlebar, .ms-tabs, .ms-body { padding-left: 20px; padding-right: 20px; }
          .ms-two-col { grid-template-columns: 1fr; }
          .ms-provider-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default AdminModelSettings;