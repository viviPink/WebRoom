// dateUtils.js

// Константа для смещения в часах (UTC+9)
const TIMEZONE_OFFSET = "-9"; // часов

/**
 * Преобразует UTC дату из БД в локальное время (+9 часов)
 * ПРИ ОТОБРАЖЕНИИ: добавляем 9 часов к UTC из БД
 */
export const formatToLocalDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Добавляем 9 часов для отображения
    const localDate = new Date(date.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const day = String(localDate.getDate()).padStart(2, '0');
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const year = localDate.getFullYear();
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return '';
  }
};

/**
 * Преобразует UTC дату из БД в локальное время (+9 часов) только дата
 */
export const formatToLocalDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const localDate = new Date(date.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const day = String(localDate.getDate()).padStart(2, '0');
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const year = localDate.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return '';
  }
};

/**
 * Преобразует UTC дату из БД в локальное время (+9 часов) только время
 */
export const formatToLocalTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const localDate = new Date(date.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Ошибка форматирования времени:', error);
    return '';
  }
};

/**
 * Форматирует дату для отображения в читаемом виде
 */
export const formatDisplayDateTime = (dateString) => {
  return formatToLocalDateTime(dateString);
};

/**
 * Получает локальную дату в формате YYYY-MM-DD для сравнения (с учетом +9)
 */
export const getLocalDateString = (date) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const localDate = new Date(d.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Ошибка получения локальной даты:', error);
    return '';
  }
};

/**
 * Создает дату для отправки на сервер (из локального времени с +9 в UTC)
 * ПРИ СОХРАНЕНИИ: вычитаем 9 часов для получения UTC
 */
export const createLocalDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  try {
    // Парсим локальную дату и время (это время с +9)
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Создаём дату в локальном времени (считаем что это UTC+9)
    const localDate = new Date(year, month - 1, day, hours, minutes);
    
    // Вычитаем 9 часов для получения UTC
    const utcDate = new Date(localDate.getTime() - (TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    // Возвращаем ISO строку для отправки на сервер
    return utcDate.toISOString();
  } catch (error) {
    console.error('Ошибка создания даты:', error);
    return null;
  }
};

/**
 * Проверяет, является ли дата сегодняшней (с учетом +9)
 */
export const isToday = (dateString) => {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const now = new Date();
    const localNow = new Date(now.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    return localDate.getDate() === localNow.getDate() &&
           localDate.getMonth() === localNow.getMonth() &&
           localDate.getFullYear() === localNow.getFullYear();
  } catch (error) {
    return false;
  }
};

// Для отладки - функция, показывающая преобразование
export const debugTimeConversion = (dateString) => {
  if (!dateString) return 'Нет даты';
  
  const original = new Date(dateString);
  const local = new Date(original.getTime() + (TIMEZONE_OFFSET * 60 * 60 * 1000));
  
  return {
    'UTC (в БД)': original.toISOString(),
    'UTC часы': original.getUTCHours(),
    'UTC минуты': original.getUTCMinutes(),
    'Локальное (+9)': local.toISOString(),
    'Локальные часы': local.getHours(),
    'Локальные минуты': local.getMinutes(),
    'Отображение': formatToLocalDateTime(dateString)
  };
};