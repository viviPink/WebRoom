import React, { useState } from 'react';
import { createLocalDateTime } from '../../utils/dateUtils';

const ScheduleSessionModal = ({ isOpen, onClose, courses, onSchedule }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedCourse) newErrors.course = 'Выберите курс';
    if (!title.trim()) newErrors.title = 'Введите название сессии';
    if (!scheduledDate) newErrors.date = 'Выберите дату';
    if (!scheduledTime) newErrors.time = 'Выберите время';
    
    // Проверка, что дата не в прошлом
    if (scheduledDate && scheduledTime) {
      const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      if (selectedDateTime < now) {
        newErrors.datetime = 'Дата и время не могут быть в прошлом';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const scheduledStart = createLocalDateTime(scheduledDate, scheduledTime);
    
    onSchedule({
      courseId: selectedCourse,
      title: title.trim(),
      description: description.trim(),
      scheduledStart,
      duration: parseInt(duration)
    });

    // Сброс формы
    setSelectedCourse('');
    setTitle('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setDuration(60);
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setSelectedCourse('');
    setTitle('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setDuration(60);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    title: {
      marginTop: 0,
      marginBottom: '20px',
      color: '#333',
      fontSize: '24px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#333'
    },
    select: {
      width: '100%',
      padding: '10px',
      fontSize: '16px',
      border: errors.course ? '1px solid #dc3545' : '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: 'white'
    },
    input: {
      width: '100%',
      padding: '10px',
      fontSize: '16px',
      border: errors.title ? '1px solid #dc3545' : '1px solid #ddd',
      borderRadius: '4px'
    },
    textarea: {
      width: '100%',
      padding: '10px',
      fontSize: '16px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      resize: 'vertical',
      minHeight: '80px'
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '15px'
    },
    errorText: {
      color: '#dc3545',
      fontSize: '14px',
      marginTop: '5px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px'
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      ':hover': {
        backgroundColor: '#5a6268'
      }
    },
    submitButton: {
      padding: '10px 20px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      ':hover': {
        backgroundColor: '#218838'
      }
    }
  };

  // Получаем сегодняшнюю дату в формате YYYY-MM-DD для атрибута min
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Запланировать сессию</h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Курс *</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={styles.select}
            >
              <option value="">Выберите курс</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {errors.course && <div style={styles.errorText}>{errors.course}</div>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Название сессии *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название сессии"
              style={styles.input}
            />
            {errors.title && <div style={styles.errorText}>{errors.title}</div>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание сессии (необязательно)"
              style={styles.textarea}
            />
          </div>

          <div style={styles.row}>
            <div>
              <label style={styles.label}>Дата *</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                style={{
                  ...styles.input,
                  border: errors.date || errors.datetime ? '1px solid #dc3545' : '1px solid #ddd'
                }}
              />
              {errors.date && <div style={styles.errorText}>{errors.date}</div>}
            </div>
            <div>
              <label style={styles.label}>Время *</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                style={{
                  ...styles.input,
                  border: errors.time || errors.datetime ? '1px solid #dc3545' : '1px solid #ddd'
                }}
              />
              {errors.time && <div style={styles.errorText}>{errors.time}</div>}
            </div>
          </div>
          
          {errors.datetime && (
            <div style={styles.errorText}>{errors.datetime}</div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Длительность (минут)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={styles.select}
            >
              <option value="30">30 минут</option>
              <option value="60">1 час</option>
              <option value="90">1.5 часа</option>
              <option value="120">2 часа</option>
              <option value="180">3 часа</option>
            </select>
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={handleClose} style={styles.cancelButton}>
              Отмена
            </button>
            <button type="submit" style={styles.submitButton}>
              Запланировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleSessionModal;
