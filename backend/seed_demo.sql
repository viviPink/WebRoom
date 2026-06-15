-- ================================================================
-- ДЕМО-ДАННЫЕ для системы Wisper
-- Преподаватель: Иванова Наталья Сергеевна
-- Дисциплина:   Информационные технологии
-- Группа:       ИТ-301 (12 студентов)
-- Запускать в БД: webinar_db
-- ================================================================

-- ----------------------------------------------------------------
-- 1. ПРЕПОДАВАТЕЛЬ
-- ----------------------------------------------------------------
INSERT INTO "Teacher" (name, email, is_admin, "universityId", "createdAt")
VALUES (
  'Иванова Наталья Сергеевна',
  'ivanova.ns@zabgu.ru',
  false,
  (SELECT id FROM "University" WHERE short_name = 'ЗабГУ' LIMIT 1),
  NOW() - INTERVAL '90 days'
)
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------
-- 2. ГРУППА
-- ----------------------------------------------------------------
INSERT INTO "Group" (name)
VALUES ('ИТ-301')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------
-- 3. СТУДЕНТЫ группы ИТ-301
-- ----------------------------------------------------------------
INSERT INTO "Student" ("full_name", "group", "groupId", "universityId", "createdAt")
SELECT
  s.name,
  'ИТ-301',
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  (SELECT id FROM "University" WHERE short_name = 'ЗабГУ' LIMIT 1),
  NOW() - INTERVAL '89 days'
FROM (VALUES
  ('Алексеев Дмитрий Павлович'),
  ('Бородина Кристина Андреевна'),
  ('Горбунов Илья Максимович'),
  ('Дорофеева Анастасия Олеговна'),
  ('Ермолаев Сергей Витальевич'),
  ('Жукова Валерия Николаевна'),
  ('Захаров Антон Игоревич'),
  ('Киселёва Марина Степановна'),
  ('Лобанов Никита Романович'),
  ('Михайлова Екатерина Юрьевна'),
  ('Новиков Павел Александрович'),
  ('Орлова Ольга Дмитриевна')
) AS s(name)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 4. КУРС
-- ----------------------------------------------------------------
INSERT INTO "Course" ("teacherId", title, "createdAt")
VALUES (
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Информационные технологии',
  NOW() - INTERVAL '85 days'
)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 5. СВЯЗКА преподаватель – группа – предмет
-- ----------------------------------------------------------------
INSERT INTO "TeacherGroupSubject" ("teacherId", "groupId", "subjectName")
VALUES (
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Информационные технологии'
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- 6. ЗАВЕРШЁННЫЕ ЗАНЯТИЯ (6 пар)
-- ================================================================

INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  false,
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '80 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №1: Введение в информационные технологии. Понятие информации, данных и знаний. История развития ИТ. Классификация информационных систем. Роль ИТ в современном обществе.',
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '80 days'
);

INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  false,
  NOW() - INTERVAL '73 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '73 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №2: Компьютерные сети. Топологии сетей, протоколы передачи данных. Модель OSI. Основы работы стека TCP/IP. Адресация в сетях IPv4 и IPv6.',
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '73 days'
);

INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  false,
  NOW() - INTERVAL '66 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '66 days' + INTERVAL '11 hours 30 minutes',
  'Практика №1: Настройка локальной сети. Работа с командной строкой: ipconfig, ping, tracert. Диагностика сетевых проблем. Практические задания в виртуальной среде.',
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '66 days'
);

INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  false,
  NOW() - INTERVAL '59 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '59 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №3: Базы данных. Реляционная модель данных. Основы SQL: SELECT, INSERT, UPDATE, DELETE. Понятие транзакции. Нормальные формы (1НФ, 2НФ, 3НФ).',
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '59 days'
);

INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  false,
  NOW() - INTERVAL '52 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '52 days' + INTERVAL '11 hours 30 minutes',
  'Практика №2: Работа с PostgreSQL. Установка СУБД, создание таблиц, написание запросов. Нормализация данных. Связи между таблицами, внешние ключи.',
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '52 days'
);

INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  false,
  NOW() - INTERVAL '45 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '45 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №4: Информационная безопасность. Угрозы и уязвимости информационных систем. Методы аутентификации и авторизации. Симметричное и асимметричное шифрование.',
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '45 days'
);

-- ================================================================
-- 7. ПОСЕЩАЕМОСТЬ
-- Занятие 1 (80 дн.) — все 12 присутствовали
-- Занятие 2 (73 дн.) — отсутствуют: Захаров, Лобанов
-- Занятие 3 (66 дн.) — отсутствует:  Орлова
-- Занятие 4 (59 дн.) — все 12 присутствовали
-- Занятие 5 (52 дн.) — отсутствуют: Дорофеева, Ермолаев, Михайлова
-- Занятие 6 (45 дн.) — отсутствует:  Бородина
-- ================================================================

-- Занятие 1 — все
INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
SELECT st.id,
       (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%'
          AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
       NOW() - INTERVAL '80 days' + INTERVAL '10 hours' + (floor(random()*600) || ' seconds')::INTERVAL
FROM "Student" st
WHERE st."groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301')
ON CONFLICT DO NOTHING;

-- Занятие 2 — без Захарова и Лобанова
INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
SELECT st.id,
       (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%'
          AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
       NOW() - INTERVAL '73 days' + INTERVAL '10 hours' + (floor(random()*600) || ' seconds')::INTERVAL
FROM "Student" st
WHERE st."groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301')
  AND st."full_name" NOT IN ('Захаров Антон Игоревич', 'Лобанов Никита Романович')
ON CONFLICT DO NOTHING;

-- Занятие 3 — без Орловой
INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
SELECT st.id,
       (SELECT id FROM "Session" WHERE description LIKE 'Практика №1%'
          AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
       NOW() - INTERVAL '66 days' + INTERVAL '10 hours' + (floor(random()*600) || ' seconds')::INTERVAL
FROM "Student" st
WHERE st."groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301')
  AND st."full_name" NOT IN ('Орлова Ольга Дмитриевна')
ON CONFLICT DO NOTHING;

-- Занятие 4 — все
INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
SELECT st.id,
       (SELECT id FROM "Session" WHERE description LIKE 'Лекция №3%'
          AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
       NOW() - INTERVAL '59 days' + INTERVAL '10 hours' + (floor(random()*600) || ' seconds')::INTERVAL
FROM "Student" st
WHERE st."groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301')
ON CONFLICT DO NOTHING;

-- Занятие 5 — без Дорофеевой, Ермолаева, Михайловой
INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
SELECT st.id,
       (SELECT id FROM "Session" WHERE description LIKE 'Практика №2%'
          AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
       NOW() - INTERVAL '52 days' + INTERVAL '10 hours' + (floor(random()*600) || ' seconds')::INTERVAL
FROM "Student" st
WHERE st."groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301')
  AND st."full_name" NOT IN (
    'Дорофеева Анастасия Олеговна',
    'Ермолаев Сергей Витальевич',
    'Михайлова Екатерина Юрьевна'
  )
ON CONFLICT DO NOTHING;

-- Занятие 6 — без Бородиной
INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
SELECT st.id,
       (SELECT id FROM "Session" WHERE description LIKE 'Лекция №4%'
          AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
       NOW() - INTERVAL '45 days' + INTERVAL '10 hours' + (floor(random()*600) || ' seconds')::INTERVAL
FROM "Student" st
WHERE st."groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301')
  AND st."full_name" NOT IN ('Бородина Кристина Андреевна')
ON CONFLICT DO NOTHING;

-- ================================================================
-- 8. ОЗНАКОМЛЕНИЕ С ПРОПУЩЕННЫМИ ЗАНЯТИЯМИ
-- Захаров    — ознакомился с Лекцией №2     ✓
-- Лобанов    — ознакомился с Лекцией №2     ✓
-- Орлова     — НЕ ознакомилась с Практикой №1 ✗
-- Дорофеева  — ознакомилась с Практикой №2  ✓
-- Ермолаев   — НЕ ознакомился с Практикой №2 ✗
-- Михайлова  — ознакомилась с Практикой №2  ✓
-- Бородина   — ознакомилась с Лекцией №4    ✓
-- ================================================================

INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
VALUES (
  (SELECT id FROM "Student" WHERE "full_name" = 'Захаров Антон Игоревич'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  true, NOW() - INTERVAL '71 days'
) ON CONFLICT DO NOTHING;

INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
VALUES (
  (SELECT id FROM "Student" WHERE "full_name" = 'Лобанов Никита Романович'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  true, NOW() - INTERVAL '70 days'
) ON CONFLICT DO NOTHING;

INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
VALUES (
  (SELECT id FROM "Student" WHERE "full_name" = 'Орлова Ольга Дмитриевна'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  (SELECT id FROM "Session" WHERE description LIKE 'Практика №1%'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  false, NULL
) ON CONFLICT DO NOTHING;

INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
VALUES (
  (SELECT id FROM "Student" WHERE "full_name" = 'Дорофеева Анастасия Олеговна'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  (SELECT id FROM "Session" WHERE description LIKE 'Практика №2%'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  true, NOW() - INTERVAL '50 days'
) ON CONFLICT DO NOTHING;

INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
VALUES (
  (SELECT id FROM "Student" WHERE "full_name" = 'Ермолаев Сергей Витальевич'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  (SELECT id FROM "Session" WHERE description LIKE 'Практика №2%'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  false, NULL
) ON CONFLICT DO NOTHING;

INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
VALUES (
  (SELECT id FROM "Student" WHERE "full_name" = 'Михайлова Екатерина Юрьевна'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  (SELECT id FROM "Session" WHERE description LIKE 'Практика №2%'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  true, NOW() - INTERVAL '49 days'
) ON CONFLICT DO NOTHING;

INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
VALUES (
  (SELECT id FROM "Student" WHERE "full_name" = 'Бородина Кристина Андреевна'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №4%'
     AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  true, NOW() - INTERVAL '43 days'
) ON CONFLICT DO NOTHING;

-- ================================================================
-- 9. СООБЩЕНИЯ В ЧАТ (занятия 1, 2, 4)
-- ================================================================

-- Занятие 1
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Добрый день! Начинаем лекцию по введению в ИТ. Пожалуйста, включите камеры.',
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'student',
  (SELECT id FROM "Student" WHERE "full_name" = 'Алексеев Дмитрий Павлович' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'Здравствуйте, Наталья Сергеевна!',
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours 1 minute'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'student',
  (SELECT id FROM "Student" WHERE "full_name" = 'Бородина Кристина Андреевна' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'Добрый день!',
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours 2 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Отлично. Сегодня разберём основные понятия: информация, данные, знания. Откройте конспект.',
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours 5 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'student',
  (SELECT id FROM "Student" WHERE "full_name" = 'Горбунов Илья Максимович' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'Наталья Сергеевна, а чем отличаются данные от информации?',
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours 30 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Хороший вопрос! Данные — это необработанные факты. Информация — это данные, имеющие смысл в определённом контексте.',
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours 32 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №1%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Домашнее задание: изучите §2 учебника — тема следующей лекции «Компьютерные сети».',
  NOW() - INTERVAL '80 days' + INTERVAL '11 hours 25 minutes'
);

-- Занятие 2
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Начинаем занятие. Тема сегодня — компьютерные сети. Кто прочитал §2?',
  NOW() - INTERVAL '73 days' + INTERVAL '10 hours'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'student',
  (SELECT id FROM "Student" WHERE "full_name" = 'Ермолаев Сергей Витальевич' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'Я прочитал, всё понятно.',
  NOW() - INTERVAL '73 days' + INTERVAL '10 hours 1 minute'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'student',
  (SELECT id FROM "Student" WHERE "full_name" = 'Жукова Валерия Николаевна' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'Можно уточнить про модель OSI — зачем нужны все 7 уровней?',
  NOW() - INTERVAL '73 days' + INTERVAL '10 hours 45 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Каждый уровень отвечает за свою задачу. Это позволяет менять реализацию одного уровня, не трогая остальные.',
  NOW() - INTERVAL '73 days' + INTERVAL '10 hours 47 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №2%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Занятие завершено. Д/з: составить схему сети из 3 узлов с указанием протоколов.',
  NOW() - INTERVAL '73 days' + INTERVAL '11 hours 28 minutes'
);

-- Занятие 4 (БД)
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №3%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Добрый день! Сегодня начинаем тему баз данных. Это одна из ключевых тем курса.',
  NOW() - INTERVAL '59 days' + INTERVAL '10 hours'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №3%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'student',
  (SELECT id FROM "Student" WHERE "full_name" = 'Новиков Павел Александрович' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'Наталья Сергеевна, мы будем работать с конкретной СУБД?',
  NOW() - INTERVAL '59 days' + INTERVAL '10 hours 10 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №3%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Да, на практике будем использовать PostgreSQL. На следующей паре установим и поработаем вживую.',
  NOW() - INTERVAL '59 days' + INTERVAL '10 hours 12 minutes'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №3%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'student',
  (SELECT id FROM "Student" WHERE "full_name" = 'Киселёва Марина Степановна' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'А нормальные формы — это обязательно знать на экзамене?',
  NOW() - INTERVAL '59 days' + INTERVAL '11 hours'
);
INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES (
  (SELECT id FROM "Session" WHERE description LIKE 'Лекция №3%' AND "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301') LIMIT 1),
  'teacher',
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  'Обязательно! Будет отдельный вопрос. Изучите определения 1НФ, 2НФ и 3НФ с примерами.',
  NOW() - INTERVAL '59 days' + INTERVAL '11 hours 2 minutes'
);

-- ================================================================
-- 10. ЗАПЛАНИРОВАННЫЕ ЗАНЯТИЯ (3 пары в будущем)
-- ================================================================

INSERT INTO "ScheduledSession"
  ("teacherId", "courseId", "groupId", title, description, "subjectName", "scheduledStart", duration, "isActive")
VALUES (
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Лекция №5: Облачные технологии',
  'Понятие облачных вычислений. Модели развёртывания: публичное, частное и гибридное облако. Сервисные модели: IaaS, PaaS, SaaS. Обзор платформ: AWS, Azure, Google Cloud. Достоинства и риски облачных решений.',
  'Информационные технологии',
  NOW() + INTERVAL '7 days' + INTERVAL '10 hours',
  90, false
);

INSERT INTO "ScheduledSession"
  ("teacherId", "courseId", "groupId", title, description, "subjectName", "scheduledStart", duration, "isActive")
VALUES (
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Практика №3: Работа с облачными сервисами',
  'Практическое знакомство с облачной платформой. Создание виртуальной машины, настройка хранилища объектов. Работа с Google Cloud Console. Задание: развернуть простое веб-приложение и настроить доступ.',
  'Информационные технологии',
  NOW() + INTERVAL '14 days' + INTERVAL '10 hours',
  90, false
);

INSERT INTO "ScheduledSession"
  ("teacherId", "courseId", "groupId", title, description, "subjectName", "scheduledStart", duration, "isActive")
VALUES (
  (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
  (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
     AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru') LIMIT 1),
  (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
  'Лекция №6: Искусственный интеллект и машинное обучение',
  'Обзор методов машинного обучения: обучение с учителем, без учителя, reinforcement learning. Нейронные сети: архитектура, принцип работы. Применение ИИ в современных информационных системах и сервисах.',
  'Информационные технологии',
  NOW() + INTERVAL '21 days' + INTERVAL '10 hours',
  90, false
);

-- ================================================================
-- ПРОВЕРКА — итоговые счётчики
-- ================================================================
SELECT 'Teacher'            AS "Таблица", COUNT(*) AS "Кол-во" FROM "Teacher"
UNION ALL SELECT 'Student',              COUNT(*) FROM "Student"
UNION ALL SELECT 'Group',                COUNT(*) FROM "Group"
UNION ALL SELECT 'Course',               COUNT(*) FROM "Course"
UNION ALL SELECT 'Session (завершённые)',COUNT(*) FROM "Session"   WHERE "isActive" = false
UNION ALL SELECT 'Attendance',           COUNT(*) FROM "Attendance"
UNION ALL SELECT 'MissedSessionReview',  COUNT(*) FROM "MissedSessionReview"
UNION ALL SELECT 'Message',              COUNT(*) FROM "Message"
UNION ALL SELECT 'ScheduledSession',     COUNT(*) FROM "ScheduledSession";
