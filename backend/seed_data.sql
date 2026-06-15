-- ============================================================
-- SEED DATA — осмысленные демо-данные для системы Wisper
-- Преподаватель: Иванова Наталья Сергеевна
-- Курс: Информационные технологии, группа ИТ-301
-- ============================================================

-- -------------------------------------------------------
-- 1. Преподаватель
-- -------------------------------------------------------
INSERT INTO "Teacher" (name, email, is_admin, "universityId", "createdAt")
VALUES (
  'Иванова Наталья Сергеевна',
  'ivanova.ns@zabgu.ru',
  false,
  (SELECT id FROM "University" WHERE short_name = 'ЗабГУ' LIMIT 1),
  NOW() - INTERVAL '90 days'
)
ON CONFLICT (email) DO NOTHING;

-- -------------------------------------------------------
-- 2. Группа
-- -------------------------------------------------------
INSERT INTO "Group" (name)
VALUES ('ИТ-301')
ON CONFLICT (name) DO NOTHING;

-- -------------------------------------------------------
-- 3. Студенты группы ИТ-301
-- -------------------------------------------------------
INSERT INTO "Student" ("full_name", "group", "groupId", "universityId", "createdAt")
VALUES
  ('Алексеев Дмитрий Павлович',   'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Бородина Кристина Андреевна', 'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Горбунов Илья Максимович',    'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Дорофеева Анастасия Олеговна','ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Ермолаев Сергей Витальевич',  'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Жукова Валерия Николаевна',   'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Захаров Антон Игоревич',      'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Киселёва Марина Степановна',  'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Лобанов Никита Романович',    'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Михайлова Екатерина Юрьевна', 'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Новиков Павел Александрович', 'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days'),
  ('Орлова Ольга Дмитриевна',     'ИТ-301', (SELECT id FROM "Group" WHERE name='ИТ-301'), (SELECT id FROM "University" WHERE short_name='ЗабГУ'), NOW() - INTERVAL '89 days')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 4. Курс
-- -------------------------------------------------------
INSERT INTO "Course" ("teacherId", title, "createdAt")
VALUES (
  (SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru'),
  'Информационные технологии',
  NOW() - INTERVAL '85 days'
)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 5. Связка преподаватель–группа–предмет
-- -------------------------------------------------------
INSERT INTO "TeacherGroupSubject" ("teacherId", "groupId", "subjectName")
VALUES (
  (SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru'),
  (SELECT id FROM "Group" WHERE name='ИТ-301'),
  'Информационные технологии'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. ЗАВЕРШЁННЫЕ ЗАНЯТИЯ (Session isActive=false)
-- ============================================================

-- Занятие 1 — состоялось ~80 дней назад
INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title='Информационные технологии' AND "teacherId"=(SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru')),
  false,
  NOW() - INTERVAL '80 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '80 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №1: Введение в информационные технологии. Понятие информации, данных и знаний. История развития ИТ. Классификация информационных систем.',
  (SELECT id FROM "Group" WHERE name='ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '80 days'
);

-- Занятие 2 — ~73 дня назад
INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title='Информационные технологии' AND "teacherId"=(SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru')),
  false,
  NOW() - INTERVAL '73 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '73 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №2: Компьютерные сети. Топологии сетей, протоколы передачи данных. Модель OSI. Основы работы стека TCP/IP.',
  (SELECT id FROM "Group" WHERE name='ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '73 days'
);

-- Занятие 3 — ~66 дней назад
INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title='Информационные технологии' AND "teacherId"=(SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru')),
  false,
  NOW() - INTERVAL '66 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '66 days' + INTERVAL '11 hours 30 minutes',
  'Практика №1: Настройка локальной сети. Работа с командной строкой: ipconfig, ping, tracert. Диагностика сетевых проблем.',
  (SELECT id FROM "Group" WHERE name='ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '66 days'
);

-- Занятие 4 — ~59 дней назад
INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title='Информационные технологии' AND "teacherId"=(SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru')),
  false,
  NOW() - INTERVAL '59 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '59 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №3: Базы данных. Реляционная модель данных. Основы SQL: SELECT, INSERT, UPDATE, DELETE. Понятие транзакции.',
  (SELECT id FROM "Group" WHERE name='ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '59 days'
);

-- Занятие 5 — ~52 дня назад
INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title='Информационные технологии' AND "teacherId"=(SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru')),
  false,
  NOW() - INTERVAL '52 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '52 days' + INTERVAL '11 hours 30 minutes',
  'Практика №2: Работа с PostgreSQL. Создание таблиц, написание запросов. Нормализация данных. Практические задания по SQL.',
  (SELECT id FROM "Group" WHERE name='ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '52 days'
);

-- Занятие 6 — ~45 дней назад
INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
VALUES (
  (SELECT id FROM "Course" WHERE title='Информационные технологии' AND "teacherId"=(SELECT id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru')),
  false,
  NOW() - INTERVAL '45 days' + INTERVAL '10 hours',
  NOW() - INTERVAL '45 days' + INTERVAL '11 hours 30 minutes',
  'Лекция №4: Информационная безопасность. Угрозы и уязвимости. Методы аутентификации и авторизации. Шифрование данных.',
  (SELECT id FROM "Group" WHERE name='ИТ-301'),
  'Информационные технологии',
  NOW() - INTERVAL '45 days'
);

-- ============================================================
-- 7. ПОСЕЩАЕМОСТЬ по занятиям
-- ============================================================

-- Вспомогательные переменные через DO-блок
DO $$
DECLARE
  t_id   INTEGER;
  g_id   INTEGER;
  s1_id  INTEGER;
  s2_id  INTEGER;
  s3_id  INTEGER;
  s4_id  INTEGER;
  s5_id  INTEGER;
  s6_id  INTEGER;
  st_ids INTEGER[];
  sid    INTEGER;
BEGIN
  SELECT id INTO t_id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru';
  SELECT id INTO g_id FROM "Group" WHERE name='ИТ-301';

  -- Получаем ID сессий по описанию (в порядке createdAt)
  SELECT id INTO s1_id FROM "Session"
    WHERE "groupId"=g_id AND description LIKE 'Лекция №1%' LIMIT 1;
  SELECT id INTO s2_id FROM "Session"
    WHERE "groupId"=g_id AND description LIKE 'Лекция №2%' LIMIT 1;
  SELECT id INTO s3_id FROM "Session"
    WHERE "groupId"=g_id AND description LIKE 'Практика №1%' LIMIT 1;
  SELECT id INTO s4_id FROM "Session"
    WHERE "groupId"=g_id AND description LIKE 'Лекция №3%' LIMIT 1;
  SELECT id INTO s5_id FROM "Session"
    WHERE "groupId"=g_id AND description LIKE 'Практика №2%' LIMIT 1;
  SELECT id INTO s6_id FROM "Session"
    WHERE "groupId"=g_id AND description LIKE 'Лекция №4%' LIMIT 1;

  -- Получаем все ID студентов группы
  SELECT ARRAY_AGG(id) INTO st_ids FROM "Student" WHERE "groupId"=g_id;

  -- Занятие 1: все 12 присутствовали
  FOREACH sid IN ARRAY st_ids LOOP
    INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
    VALUES (sid, s1_id, NOW() - INTERVAL '80 days' + INTERVAL '10 hours' + (random()*600 || ' seconds')::INTERVAL)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Занятие 2: отсутствуют Захаров и Лобанов (не первые 2)
  FOREACH sid IN ARRAY st_ids LOOP
    IF sid NOT IN (
      (SELECT id FROM "Student" WHERE "full_name"='Захаров Антон Игоревич'   AND "groupId"=g_id LIMIT 1),
      (SELECT id FROM "Student" WHERE "full_name"='Лобанов Никита Романович' AND "groupId"=g_id LIMIT 1)
    ) THEN
      INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
      VALUES (sid, s2_id, NOW() - INTERVAL '73 days' + INTERVAL '10 hours' + (random()*600 || ' seconds')::INTERVAL)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Занятие 3: отсутствует только Орлова
  FOREACH sid IN ARRAY st_ids LOOP
    IF sid <> (SELECT id FROM "Student" WHERE "full_name"='Орлова Ольга Дмитриевна' AND "groupId"=g_id LIMIT 1) THEN
      INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
      VALUES (sid, s3_id, NOW() - INTERVAL '66 days' + INTERVAL '10 hours' + (random()*600 || ' seconds')::INTERVAL)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Занятие 4: все присутствовали
  FOREACH sid IN ARRAY st_ids LOOP
    INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
    VALUES (sid, s4_id, NOW() - INTERVAL '59 days' + INTERVAL '10 hours' + (random()*600 || ' seconds')::INTERVAL)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Занятие 5: отсутствуют Дорофеева, Ермолаев, Михайлова
  FOREACH sid IN ARRAY st_ids LOOP
    IF sid NOT IN (
      (SELECT id FROM "Student" WHERE "full_name"='Дорофеева Анастасия Олеговна' AND "groupId"=g_id LIMIT 1),
      (SELECT id FROM "Student" WHERE "full_name"='Ермолаев Сергей Витальевич'   AND "groupId"=g_id LIMIT 1),
      (SELECT id FROM "Student" WHERE "full_name"='Михайлова Екатерина Юрьевна'  AND "groupId"=g_id LIMIT 1)
    ) THEN
      INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
      VALUES (sid, s5_id, NOW() - INTERVAL '52 days' + INTERVAL '10 hours' + (random()*600 || ' seconds')::INTERVAL)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Занятие 6: отсутствует Бородина
  FOREACH sid IN ARRAY st_ids LOOP
    IF sid <> (SELECT id FROM "Student" WHERE "full_name"='Бородина Кристина Андреевна' AND "groupId"=g_id LIMIT 1) THEN
      INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
      VALUES (sid, s6_id, NOW() - INTERVAL '45 days' + INTERVAL '10 hours' + (random()*600 || ' seconds')::INTERVAL)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

END $$;

-- ============================================================
-- 8. ОЗНАКОМЛЕНИЕ С ПРОПУЩЕННЫМИ ЗАНЯТИЯМИ (MissedSessionReview)
-- ============================================================
DO $$
DECLARE
  g_id   INTEGER;
  s2_id  INTEGER;
  s3_id  INTEGER;
  s5_id  INTEGER;
  s6_id  INTEGER;
BEGIN
  SELECT id INTO g_id FROM "Group" WHERE name='ИТ-301';

  SELECT id INTO s2_id FROM "Session" WHERE "groupId"=g_id AND description LIKE 'Лекция №2%'   LIMIT 1;
  SELECT id INTO s3_id FROM "Session" WHERE "groupId"=g_id AND description LIKE 'Практика №1%' LIMIT 1;
  SELECT id INTO s5_id FROM "Session" WHERE "groupId"=g_id AND description LIKE 'Практика №2%' LIMIT 1;
  SELECT id INTO s6_id FROM "Session" WHERE "groupId"=g_id AND description LIKE 'Лекция №4%'   LIMIT 1;

  -- Захаров ознакомился с лекцией №2
  INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
  VALUES (
    (SELECT id FROM "Student" WHERE "full_name"='Захаров Антон Игоревич'   AND "groupId"=g_id LIMIT 1),
    s2_id, true,
    NOW() - INTERVAL '71 days'
  ) ON CONFLICT DO NOTHING;

  -- Лобанов ознакомился с лекцией №2
  INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
  VALUES (
    (SELECT id FROM "Student" WHERE "full_name"='Лобанов Никита Романович' AND "groupId"=g_id LIMIT 1),
    s2_id, true,
    NOW() - INTERVAL '70 days'
  ) ON CONFLICT DO NOTHING;

  -- Орлова НЕ ознакомилась с практикой №1
  INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
  VALUES (
    (SELECT id FROM "Student" WHERE "full_name"='Орлова Ольга Дмитриевна' AND "groupId"=g_id LIMIT 1),
    s3_id, false, NULL
  ) ON CONFLICT DO NOTHING;

  -- Дорофеева ознакомилась с практикой №2
  INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
  VALUES (
    (SELECT id FROM "Student" WHERE "full_name"='Дорофеева Анастасия Олеговна' AND "groupId"=g_id LIMIT 1),
    s5_id, true,
    NOW() - INTERVAL '50 days'
  ) ON CONFLICT DO NOTHING;

  -- Ермолаев НЕ ознакомился с практикой №2
  INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
  VALUES (
    (SELECT id FROM "Student" WHERE "full_name"='Ермолаев Сергей Витальевич' AND "groupId"=g_id LIMIT 1),
    s5_id, false, NULL
  ) ON CONFLICT DO NOTHING;

  -- Михайлова ознакомилась с практикой №2
  INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
  VALUES (
    (SELECT id FROM "Student" WHERE "full_name"='Михайлова Екатерина Юрьевна' AND "groupId"=g_id LIMIT 1),
    s5_id, true,
    NOW() - INTERVAL '49 days'
  ) ON CONFLICT DO NOTHING;

  -- Бородина ознакомилась с лекцией №4
  INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
  VALUES (
    (SELECT id FROM "Student" WHERE "full_name"='Бородина Кристина Андреевна' AND "groupId"=g_id LIMIT 1),
    s6_id, true,
    NOW() - INTERVAL '43 days'
  ) ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- 9. СООБЩЕНИЯ В ЧАТ (для занятий 1, 2, 4)
-- ============================================================
DO $$
DECLARE
  t_id  INTEGER;
  g_id  INTEGER;
  s1_id INTEGER;
  s2_id INTEGER;
  s4_id INTEGER;
BEGIN
  SELECT id INTO t_id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru';
  SELECT id INTO g_id FROM "Group" WHERE name='ИТ-301';
  SELECT id INTO s1_id FROM "Session" WHERE "groupId"=g_id AND description LIKE 'Лекция №1%' LIMIT 1;
  SELECT id INTO s2_id FROM "Session" WHERE "groupId"=g_id AND description LIKE 'Лекция №2%' LIMIT 1;
  SELECT id INTO s4_id FROM "Session" WHERE "groupId"=g_id AND description LIKE 'Лекция №3%' LIMIT 1;

  -- Сообщения занятия 1
  INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES
    (s1_id, 'teacher', t_id, 'Добрый день! Начинаем лекцию по введению в ИТ. Пожалуйста, включите камеры.', NOW() - INTERVAL '80 days' + INTERVAL '10 hours'),
    (s1_id, 'student', (SELECT id FROM "Student" WHERE "full_name"='Алексеев Дмитрий Павлович'   AND "groupId"=g_id LIMIT 1), 'Здравствуйте, Наталья Сергеевна!', NOW() - INTERVAL '80 days' + INTERVAL '10 hours 1 minute'),
    (s1_id, 'student', (SELECT id FROM "Student" WHERE "full_name"='Бородина Кристина Андреевна' AND "groupId"=g_id LIMIT 1), 'Добрый день!', NOW() - INTERVAL '80 days' + INTERVAL '10 hours 2 minutes'),
    (s1_id, 'teacher', t_id, 'Отлично. Сегодня мы разберём основные понятия: информация, данные, знания. Откройте конспект.', NOW() - INTERVAL '80 days' + INTERVAL '10 hours 5 minutes'),
    (s1_id, 'student', (SELECT id FROM "Student" WHERE "full_name"='Горбунов Илья Максимович' AND "groupId"=g_id LIMIT 1), 'Наталья Сергеевна, а чем отличаются данные от информации?', NOW() - INTERVAL '80 days' + INTERVAL '10 hours 30 minutes'),
    (s1_id, 'teacher', t_id, 'Хороший вопрос! Данные — это необработанные факты, информация — это данные, имеющие смысл в определённом контексте.', NOW() - INTERVAL '80 days' + INTERVAL '10 hours 32 minutes'),
    (s1_id, 'teacher', t_id, 'На следующей лекции разберём компьютерные сети. Изучите §2 учебника заранее.', NOW() - INTERVAL '80 days' + INTERVAL '11 hours 25 minutes');

  -- Сообщения занятия 2
  INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES
    (s2_id, 'teacher', t_id, 'Начинаем занятие. Тема сегодня — компьютерные сети. Кто не прочитал §2?', NOW() - INTERVAL '73 days' + INTERVAL '10 hours'),
    (s2_id, 'student', (SELECT id FROM "Student" WHERE "full_name"='Ермолаев Сергей Витальевич' AND "groupId"=g_id LIMIT 1), 'Я прочитал, всё понятно.', NOW() - INTERVAL '73 days' + INTERVAL '10 hours 1 minute'),
    (s2_id, 'student', (SELECT id FROM "Student" WHERE "full_name"='Жукова Валерия Николаевна' AND "groupId"=g_id LIMIT 1), 'Наталья Сергеевна, можно уточнить про модель OSI — зачем нужны все 7 уровней?', NOW() - INTERVAL '73 days' + INTERVAL '10 hours 45 minutes'),
    (s2_id, 'teacher', t_id, 'Каждый уровень отвечает за свою задачу. Это позволяет разработчикам менять реализацию одного уровня, не трогая остальные.', NOW() - INTERVAL '73 days' + INTERVAL '10 hours 47 minutes'),
    (s2_id, 'teacher', t_id, 'Занятие завершено. Домашнее задание: составить схему сети из 3 узлов.', NOW() - INTERVAL '73 days' + INTERVAL '11 hours 28 minutes');

  -- Сообщения занятия 4 (БД)
  INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES
    (s4_id, 'teacher', t_id, 'Добрый день! Сегодня начинаем тему баз данных. Это одна из ключевых тем курса.', NOW() - INTERVAL '59 days' + INTERVAL '10 hours'),
    (s4_id, 'student', (SELECT id FROM "Student" WHERE "full_name"='Новиков Павел Александрович' AND "groupId"=g_id LIMIT 1), 'Наталья Сергеевна, мы будем работать с конкретной СУБД?', NOW() - INTERVAL '59 days' + INTERVAL '10 hours 10 minutes'),
    (s4_id, 'teacher', t_id, 'Да, на практике будем использовать PostgreSQL. На следующей паре уже установим и поработаем.', NOW() - INTERVAL '59 days' + INTERVAL '10 hours 12 minutes'),
    (s4_id, 'student', (SELECT id FROM "Student" WHERE "full_name"='Киселёва Марина Степановна' AND "groupId"=g_id LIMIT 1), 'А нормальные формы — это обязательно знать?', NOW() - INTERVAL '59 days' + INTERVAL '11 hours'),
    (s4_id, 'teacher', t_id, 'Обязательно! На экзамене будет вопрос. Изучите 1НФ, 2НФ и 3НФ.', NOW() - INTERVAL '59 days' + INTERVAL '11 hours 2 minutes');

END $$;

-- ============================================================
-- 10. ЗАПЛАНИРОВАННЫЕ ЗАНЯТИЯ (ScheduledSession)
-- ============================================================
DO $$
DECLARE
  t_id INTEGER;
  c_id INTEGER;
  g_id INTEGER;
BEGIN
  SELECT id INTO t_id FROM "Teacher" WHERE email='ivanova.ns@zabgu.ru';
  SELECT id INTO c_id FROM "Course"
    WHERE title='Информационные технологии'
      AND "teacherId"=t_id LIMIT 1;
  SELECT id INTO g_id FROM "Group" WHERE name='ИТ-301';

  -- Запланированное занятие через 7 дней
  INSERT INTO "ScheduledSession"
    ("teacherId", "courseId", "groupId", title, description, "subjectName", "scheduledStart", duration, "isActive")
  VALUES (
    t_id, c_id, g_id,
    'Лекция №5: Облачные технологии',
    'Понятие облачных вычислений. Модели развёртывания: публичное, частное, гибридное облако. Сервисные модели: IaaS, PaaS, SaaS. Примеры облачных платформ: AWS, Azure, Google Cloud.',
    'Информационные технологии',
    NOW() + INTERVAL '7 days' + INTERVAL '10 hours',
    90, false
  );

  -- Запланированное занятие через 14 дней
  INSERT INTO "ScheduledSession"
    ("teacherId", "courseId", "groupId", title, description, "subjectName", "scheduledStart", duration, "isActive")
  VALUES (
    t_id, c_id, g_id,
    'Практика №3: Работа с облачными сервисами',
    'Практическое знакомство с облачной платформой. Создание виртуальной машины, настройка хранилища. Работа с Google Cloud Console. Задание: развернуть простое веб-приложение.',
    'Информационные технологии',
    NOW() + INTERVAL '14 days' + INTERVAL '10 hours',
    90, false
  );

  -- Запланированное занятие через 21 день
  INSERT INTO "ScheduledSession"
    ("teacherId", "courseId", "groupId", title, description, "subjectName", "scheduledStart", duration, "isActive")
  VALUES (
    t_id, c_id, g_id,
    'Лекция №6: Искусственный интеллект и машинное обучение',
    'Обзор методов машинного обучения: обучение с учителем, без учителя, reinforcement learning. Нейронные сети. Применение ИИ в современных информационных системах.',
    'Информационные технологии',
    NOW() + INTERVAL '21 days' + INTERVAL '10 hours',
    90, false
  );

END $$;

-- ============================================================
-- Итоговый вывод
-- ============================================================
SELECT 'Teachers'  AS "Таблица", COUNT(*) AS "Записей" FROM "Teacher"
UNION ALL SELECT 'Students',     COUNT(*) FROM "Student"
UNION ALL SELECT 'Groups',       COUNT(*) FROM "Group"
UNION ALL SELECT 'Courses',      COUNT(*) FROM "Course"
UNION ALL SELECT 'Sessions',     COUNT(*) FROM "Session"
UNION ALL SELECT 'Attendance',   COUNT(*) FROM "Attendance"
UNION ALL SELECT 'MissedReview', COUNT(*) FROM "MissedSessionReview"
UNION ALL SELECT 'Messages',     COUNT(*) FROM "Message"
UNION ALL SELECT 'Scheduled',    COUNT(*) FROM "ScheduledSession";
