
# Преподаватель
Создание курсов и сессий, трансляция экрана/камеры, запись лекций, транскрибация (Whisper), AI-конспекты (LM Studio), управление группами и предметами, отчёты о посещаемости
# Студент
Вход в активные вебинары, просмотр трансляции, чат, включение камеры, просмотр записей и конспектов пропущенных занятий
# _________________________________

Проект требует одновременного запуска трёх процессов:
Шаг 1: Запуск Python-сервера (Whisper + LM Studio)
cd /папка/проекта
pip install -r requirements.txt
python app.py
Сервер запустится на http://localhost:5000. Whisper автоматически загрузит модель base (~150 МБ). LM Studio должен быть запущен отдельно на порту 1234.

Шаг 2: Запуск Node.js-сервера
npm install
node server.js
HTTP-сервер: порт 3001 (для туннеля/интернета)
HTTPS-сервер: порт 3002 (для локальной сети, требует SSL-сертификаты в ./certs/)
Файл .env должен содержать: DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, CERT_PATH, KEY_PATH

Шаг 3: Запуск React-фронтенда
npm start   # Для разработки — порт 3000
npm run build && serve -s build   # Для production
В production React-сборка раздаётся напрямую из Node.js через express.static (папка public/).

SSL-сертификаты для HTTPS
Для работы WebRTC в локальной сети обязателен HTTPS. Сертификаты хранятся в ./certs/. В server.js проверяется их наличие:
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsServer = https.createServer({ key, cert }, app);
# _________________________________

| Файл | Назначение |
|------|------------|
| server.js | Главный бэкенд: Express REST API + Socket.IO WebSocket + PostgreSQL |
| app.py | Python-сервер: Whisper транскрибация + LM Studio |
| requirements.txt | Зависимости Python |
| App.js | Корневой React компонент — между страницами |
| index.js | Точка входа React |
| ApiContext.js | Контекст для хранения URL API (local/internet) |
| ModeSelectorPage.js | Страница выбора режима (локальная сеть / интернет) |
| dateUtils.js | Утилиты для работы с датами (UTC+9) |
| HomePage.jsx | Главная страница выбора роли |
| TeacherPage.js | Страница преподавателя (логин → дашборд → вебинар) |
| StudentPage.js | Страница студента (логин → дашборд → вебинар) |
| TeacherLogin.js + View | Форма входа преподавателя (логика + отображение) |
| StudentLogin.js + View | Форма входа студента |
| TeacherRegister.js | Регистрация преподавателя |
| StudentRegister.js | Регистрация студента (загружает список групп) |
| TeacherDashboard.js | Логика дашборда преподавателя (загрузка данных, обработчики) |
| TeacherDashboardView.jsx | Отображение дашборда с 7 вкладками |
| StudentDashboard.js | Логика дашборда студента |
| StudentDashboardView.jsx | Отображение: вебинары, пропущенные, записи, профиль |
| WebinarTeacher.js | Вся логика вебинара преподавателя: WebSocket + WebRTC |
| WebinarTeacherView.jsx | Интерфейс вебинара преподавателя |
| WebinarStudent.js | Логика вебинара студента: WebSocket + WebRTC |
| WebinarStudentView.jsx | Интерфейс вебинара студента |
| AudioRecorder.js | Запись аудио + реал-тайм транскрибация через Whisper |
| AudioRecorderView.jsx | Кнопки управления записью |
| VideoRecorder.js | Запись видеопотока экрана/камеры |
| VideoRecorderView.jsx | Интерфейс видеозаписи |
| TranscriptionModal.js | Редактор конспекта с 6 вкладками + AI-улучшение |
| TeacherVideoPlayer.jsx | Видеоплеер преподавателя с конспектами |
| StudentVideoPlayer.jsx | Видеоплеер студента (только просмотр) |
| TeacherGroupsManager.js | Управление группами и предметами |
| AttendanceReports.js | Отчёты о посещаемости с фильтрами и экспортом |
| SessionsCalendar.js | Календарь сессий (месячный и дневной вид) |
| ScheduleSessionModal.js | Модальное окно планирования сессии |
| TranscriptionWithTimings.js | Интерактивная транскрипция с таймингами |
| RecordingCard.jsx | Карточка записи с аудиоплеером |
| tabs/ActiveWebinarsTab.jsx | Вкладка активных вебинаров |
| tabs/CreateWebinarTab.jsx | Вкладка создания вебинара |
| tabs/GroupsSubjectsTab.jsx | Вкладка групп и предметов |
| tabs/CalendarTab.jsx | Вкладка календаря |
| tabs/ReportsTab.jsx | Вкладка отчётов |
| tabs/RecordingsTab.jsx | Вкладка записей лекций |
| tabs/ProfileTab.jsx | Вкладка профиля преподавателя |

## WebRTC — это P2P (peer-to-peer): видеопоток идёт напрямую между браузерами, минуя сервер. Сервер нужен только для «сигнализации» — первоначального обмена информацией о том, как установить соединение.
|Переменная	| Тип	| Содержимое |
|activeConnections	| Map<socketId, info> |	Все активные соединения с метаданными |
| sessionRooms|	Map<roomName, Set<socketId>> |	Комнаты сессий и их участники |
| sessionParticipants	| Map<roomName, Map<socketId, participant>> |	Детальная информация об участниках |




## -------------------
Весь WebRTC-код преподавателя находится в WebinarTeacher.js. Преподаватель всегда является инициатором (Offerer) — он создаёт offer и отправляет его студентам.



| Событие (emit) | Направление | Назначение |
|----------------|-------------|-------------|
| join_webinar | Клиент → Сервер | Войти в комнату сессии |
| leave_webinar | Клиент → Сервер | Покинуть комнату |
| participants_list | Сервер → Клиент | Список всех участников |
| user_joined | Сервер → Все в комнате | Новый участник вошёл |
| user_left | Сервер → Все в комнате | Участник вышел |
| send_message | Клиент → Сервер | Отправить сообщение в чат |
| new_message | Сервер → Все в комнате | Новое сообщение (+ сохраняется в БД) |
| teacher_start_screen_share | Клиент → Сервер | Преподаватель начал трансляцию |
| teacher_screen_share_started | Сервер → Все | Уведомление о начале трансляции |
| teacher_send_offer_to_students | Клиент → Сервер | SDP Offer для WebRTC |
| teacher_webrtc_offer | Сервер → Студент | Передача SDP Offer студенту |
| webrtc_answer | Клиент → Сервер → Клиент | SDP Answer (обратный ответ) |
| webrtc_ice_candidate | Клиент → Сервер → Клиент | ICE кандидаты для NAT traversal |
| student_webrtc_offer | Студент → Сервер → Преподаватель | Offer от студента (экран студента) |
| teacher_request_student_screen | Преподаватель → Сервер | Запрос экрана студента |
| teacher_requested_student_screen | Сервер → Студент | Уведомление студенту о запросе |
| stop_screen_share | Клиент → Сервер → Комната | Остановить трансляцию |
| start_recording | Клиент → Сервер → Комната | Уведомление о начале записи |
| student_video_offer | Студент → Сервер → Преподаватель | Offer видеокамеры студента |
| teacher_video_offer | Преподаватель → Сервер → Студент | Offer камеры преподавателя |

## Объект хранения P2P соединений
teacherPeerConnectionsRef — Map<studentSocketId, RTCPeerConnection>. Каждый студент получает отдельное P2P соединение. Используется useRef чтобы избежать лишних ререндеров.

### Трансляция экрана (startTeacherScreenShare)
- Вызов navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) — браузер показывает диалог выбора экрана
- Вызов navigator.mediaDevices.getUserMedia({ audio }) — получение звука с микрофона
- Создание объединённого MediaStream из видеотрека экрана + аудиотрека микрофона
- Сохранение в activeStreamRef.current — единая точка для всех P2P соединений
- Вызов _broadcastActiveStreamToStudents() — рассылка потока всем студентам
- При остановке экранной трансляции: screenStream.getVideoTracks()[0].onended — автоматически вызывает stopTeacherScreenShare()


### Функция _broadcastActiveStreamToStudents()
Для каждого студента из studentsForMonitoring:
- Создаётся новый RTCPeerConnection с STUN серверами Google: stun:stun.l.google.com:19302
-	Все треки из activeStreamRef добавляются: stream.getTracks().forEach(track => pc.addTrack(track, stream))
-	Создаётся offer: pc.createOffer({ offerToReceiveVideo: false, offerToReceiveAudio: false }) — false, потому что преподаватель только отправляет
-	Offer сохраняется как localDescription: await pc.setLocalDescription(offer)
-	Через Socket.IO отправляется студенту: teacher_send_offer_to_students
-	Настраивается onicecandidate — кандидаты ICE отправляются студенту через webrtc_ice_candidate


### Код студента находится в WebinarStudent.js. Студент является ответчиком (Answerer) для потока преподавателя и инициатором (Offerer) для своей камеры/экрана.
 Получение потока от преподавателя
Событие teacher_webrtc_offer → handleTeacherWebrtcOffer:
- Создаётся новый RTCPeerConnection с теми же STUN серверами
- pc.ontrack — получение треков: setTeacherScreenStream(event.streams[0])
- Установка remoteDescription: await pc.setRemoteDescription(new RTCSessionDescription(sdp))
- Создание answer: const answer = await pc.createAnswer()
- Установка localDescription: await pc.setLocalDescription(answer)
- Отправка answer преподавателю через Socket.IO: webrtc_answer
- В useEffect: когда teacherScreenStream обновляется, поток привязывается к teacherScreenVideoRef.current.srcObject


Все медиафайлы хранятся на диске сервера в папке uploads/audio/. Путь к файлу сохраняется в БД в AudioRecording.filePath.
Именование файлов (server.js — multer diskStorage)
recording_${sessionId}_${teacherId}_${timestamp}_${randomId}.webm



