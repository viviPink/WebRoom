/**
 * run_seed.js — заполнение БД осмысленными демо-данными
 * Запуск: node run_seed.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Подключение к БД успешно');

    // --- 1. Преподаватель ---
    await client.query(`
      INSERT INTO "Teacher" (name, email, is_admin, "universityId", "createdAt")
      VALUES (
        'Иванова Наталья Сергеевна',
        'ivanova.ns@zabgu.ru',
        false,
        (SELECT id FROM "University" WHERE short_name = 'ЗабГУ' LIMIT 1),
        NOW() - INTERVAL '90 days'
      )
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('1. Преподаватель добавлен');

    // --- 2. Группа ---
    await client.query(`
      INSERT INTO "Group" (name) VALUES ('ИТ-301') ON CONFLICT (name) DO NOTHING
    `);
    console.log('2. Группа добавлена');

    // --- 3. Студенты ---
    const students = [
      'Алексеев Дмитрий Павлович',
      'Бородина Кристина Андреевна',
      'Горбунов Илья Максимович',
      'Дорофеева Анастасия Олеговна',
      'Ермолаев Сергей Витальевич',
      'Жукова Валерия Николаевна',
      'Захаров Антон Игоревич',
      'Киселёва Марина Степановна',
      'Лобанов Никита Романович',
      'Михайлова Екатерина Юрьевна',
      'Новиков Павел Александрович',
      'Орлова Ольга Дмитриевна',
    ];
    for (const name of students) {
      await client.query(`
        INSERT INTO "Student" ("full_name", "group", "groupId", "universityId", "createdAt")
        VALUES (
          $1, 'ИТ-301',
          (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
          (SELECT id FROM "University" WHERE short_name = 'ЗабГУ' LIMIT 1),
          NOW() - INTERVAL '89 days'
        )
        ON CONFLICT DO NOTHING
      `, [name]);
    }
    console.log('3. Студенты добавлены:', students.length);

    // --- 4. Курс ---
    await client.query(`
      INSERT INTO "Course" ("teacherId", title, "createdAt")
      VALUES (
        (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
        'Информационные технологии',
        NOW() - INTERVAL '85 days'
      )
      ON CONFLICT DO NOTHING
    `);
    console.log('4. Курс добавлен');

    // --- 5. TeacherGroupSubject ---
    await client.query(`
      INSERT INTO "TeacherGroupSubject" ("teacherId", "groupId", "subjectName")
      VALUES (
        (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'),
        (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
        'Информационные технологии'
      )
      ON CONFLICT DO NOTHING
    `);
    console.log('5. TeacherGroupSubject добавлен');

    // --- 6. Завершённые занятия ---
    const sessionDefs = [
      {
        daysAgo: 80,
        description: 'Лекция №1: Введение в информационные технологии. Понятие информации, данных и знаний. История развития ИТ. Классификация информационных систем.',
      },
      {
        daysAgo: 73,
        description: 'Лекция №2: Компьютерные сети. Топологии сетей, протоколы передачи данных. Модель OSI. Основы работы стека TCP/IP.',
      },
      {
        daysAgo: 66,
        description: 'Практика №1: Настройка локальной сети. Работа с командной строкой: ipconfig, ping, tracert. Диагностика сетевых проблем.',
      },
      {
        daysAgo: 59,
        description: 'Лекция №3: Базы данных. Реляционная модель данных. Основы SQL: SELECT, INSERT, UPDATE, DELETE. Понятие транзакции.',
      },
      {
        daysAgo: 52,
        description: 'Практика №2: Работа с PostgreSQL. Создание таблиц, написание запросов. Нормализация данных. Практические задания по SQL.',
      },
      {
        daysAgo: 45,
        description: 'Лекция №4: Информационная безопасность. Угрозы и уязвимости. Методы аутентификации и авторизации. Шифрование данных.',
      },
    ];

    const sessionIds = [];
    for (const s of sessionDefs) {
      const r = await client.query(`
        INSERT INTO "Session" ("courseId", "isActive", "startTime", "endTime", description, "groupId", "subjectName", "createdAt")
        VALUES (
          (SELECT id FROM "Course" WHERE title = 'Информационные технологии'
            AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru')
            LIMIT 1),
          false,
          NOW() - ($1 || ' days')::INTERVAL + INTERVAL '10 hours',
          NOW() - ($1 || ' days')::INTERVAL + INTERVAL '11 hours 30 minutes',
          $2,
          (SELECT id FROM "Group" WHERE name = 'ИТ-301'),
          'Информационные технологии',
          NOW() - ($1 || ' days')::INTERVAL
        )
        RETURNING id
      `, [s.daysAgo, s.description]);
      sessionIds.push(r.rows[0].id);
    }
    console.log('6. Сессии добавлены:', sessionIds);

    const [s1, s2, s3, s4, s5, s6] = sessionIds;

    // --- Получаем ID студентов ---
    const stRes = await client.query(`
      SELECT id, "full_name" FROM "Student"
      WHERE "groupId" = (SELECT id FROM "Group" WHERE name = 'ИТ-301')
      ORDER BY "full_name"
    `);
    const allStudents = stRes.rows;
    const stMap = {};
    for (const st of allStudents) stMap[st.full_name] = st.id;

    const absent = {
      [s2]: ['Захаров Антон Игоревич', 'Лобанов Никита Романович'],
      [s3]: ['Орлова Ольга Дмитриевна'],
      [s5]: ['Дорофеева Анастасия Олеговна', 'Ермолаев Сергей Витальевич', 'Михайлова Екатерина Юрьевна'],
      [s6]: ['Бородина Кристина Андреевна'],
    };

    // --- 7. Посещаемость ---
    for (const [sessId, off] of [
      [s1, 80], [s2, 73], [s3, 66], [s4, 59], [s5, 52], [s6, 45]
    ]) {
      const absentList = absent[sessId] || [];
      for (const st of allStudents) {
        if (absentList.includes(st.full_name)) continue;
        const secOffset = Math.floor(Math.random() * 600);
        await client.query(`
          INSERT INTO "Attendance" ("studentId", "sessionId", "joinTime")
          VALUES ($1, $2, NOW() - ($3 || ' days')::INTERVAL + INTERVAL '10 hours' + ($4 || ' seconds')::INTERVAL)
          ON CONFLICT DO NOTHING
        `, [st.id, sessId, off, secOffset]);
      }
    }
    console.log('7. Посещаемость добавлена');

    // --- 8. MissedSessionReview ---
    const reviews = [
      { name: 'Захаров Антон Игоревич',        sessId: s2, reviewed: true,  daysAgo: 71 },
      { name: 'Лобанов Никита Романович',       sessId: s2, reviewed: true,  daysAgo: 70 },
      { name: 'Орлова Ольга Дмитриевна',        sessId: s3, reviewed: false, daysAgo: null },
      { name: 'Дорофеева Анастасия Олеговна',   sessId: s5, reviewed: true,  daysAgo: 50 },
      { name: 'Ермолаев Сергей Витальевич',     sessId: s5, reviewed: false, daysAgo: null },
      { name: 'Михайлова Екатерина Юрьевна',    sessId: s5, reviewed: true,  daysAgo: 49 },
      { name: 'Бородина Кристина Андреевна',    sessId: s6, reviewed: true,  daysAgo: 43 },
    ];
    for (const r of reviews) {
      const sid = stMap[r.name];
      if (!sid) { console.warn('Студент не найден:', r.name); continue; }
      const reviewedAt = r.daysAgo
        ? `NOW() - INTERVAL '${r.daysAgo} days'`
        : 'NULL';
      await client.query(`
        INSERT INTO "MissedSessionReview" ("studentId", "sessionId", "hasReviewed", "reviewedAt")
        VALUES ($1, $2, $3, ${reviewedAt})
        ON CONFLICT DO NOTHING
      `, [sid, r.sessId, r.reviewed]);
    }
    console.log('8. MissedSessionReview добавлен');

    // --- 9. Сообщения в чат ---
    const tRes = await client.query(`SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru'`);
    const tId = tRes.rows[0].id;

    const messages = [
      // занятие 1
      { sess: s1, type: 'teacher', sid: tId, text: 'Добрый день! Начинаем лекцию по введению в ИТ. Пожалуйста, включите камеры.', off: '10 hours' },
      { sess: s1, type: 'student', name: 'Алексеев Дмитрий Павлович',   text: 'Здравствуйте, Наталья Сергеевна!',                                              off: '10 hours 1 minute' },
      { sess: s1, type: 'student', name: 'Бородина Кристина Андреевна', text: 'Добрый день!',                                                                   off: '10 hours 2 minutes' },
      { sess: s1, type: 'teacher', sid: tId, text: 'Отлично. Сегодня разберём основные понятия: информация, данные, знания. Откройте конспект.', off: '10 hours 5 minutes' },
      { sess: s1, type: 'student', name: 'Горбунов Илья Максимович',    text: 'Наталья Сергеевна, а чем отличаются данные от информации?',                      off: '10 hours 30 minutes' },
      { sess: s1, type: 'teacher', sid: tId, text: 'Хороший вопрос! Данные — необработанные факты, информация — это данные, имеющие смысл в определённом контексте.', off: '10 hours 32 minutes' },
      { sess: s1, type: 'teacher', sid: tId, text: 'На следующей лекции разберём компьютерные сети. Изучите §2 учебника заранее.',                               off: '11 hours 25 minutes' },
      // занятие 2
      { sess: s2, type: 'teacher', sid: tId, text: 'Начинаем занятие. Тема — компьютерные сети. Кто не прочитал §2?',                                             off: '10 hours' },
      { sess: s2, type: 'student', name: 'Ермолаев Сергей Витальевич',  text: 'Я прочитал, всё понятно.',                                                       off: '10 hours 1 minute' },
      { sess: s2, type: 'student', name: 'Жукова Валерия Николаевна',   text: 'Наталья Сергеевна, можно уточнить про модель OSI — зачем нужны все 7 уровней?',  off: '10 hours 45 minutes' },
      { sess: s2, type: 'teacher', sid: tId, text: 'Каждый уровень отвечает за свою задачу. Это позволяет менять реализацию одного уровня, не трогая остальные.', off: '10 hours 47 minutes' },
      { sess: s2, type: 'teacher', sid: tId, text: 'Занятие завершено. Домашнее задание: составить схему сети из 3 узлов.',                                       off: '11 hours 28 minutes' },
      // занятие 4
      { sess: s4, type: 'teacher', sid: tId, text: 'Добрый день! Сегодня начинаем тему баз данных. Это одна из ключевых тем курса.',                             off: '10 hours' },
      { sess: s4, type: 'student', name: 'Новиков Павел Александрович', text: 'Наталья Сергеевна, мы будем работать с конкретной СУБД?',                         off: '10 hours 10 minutes' },
      { sess: s4, type: 'teacher', sid: tId, text: 'Да, на практике используем PostgreSQL. На следующей паре установим и поработаем.',                            off: '10 hours 12 minutes' },
      { sess: s4, type: 'student', name: 'Киселёва Марина Степановна',  text: 'А нормальные формы — это обязательно знать?',                                     off: '11 hours' },
      { sess: s4, type: 'teacher', sid: tId, text: 'Обязательно! На экзамене будет вопрос. Изучите 1НФ, 2НФ и 3НФ.',                                             off: '11 hours 2 minutes' },
    ];

    for (const m of messages) {
      const senderId = m.type === 'teacher' ? m.sid : stMap[m.name];
      if (!senderId) { console.warn('Отправитель не найден:', m.name); continue; }
      await client.query(`
        INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp")
        VALUES ($1, $2, $3, $4, NOW() - ($5 || ' days')::INTERVAL + INTERVAL '${m.off}')
      `, [
        m.sess,
        m.type,
        senderId,
        m.text,
        m.type === 'teacher'
          ? (m.sess === s1 ? 80 : m.sess === s2 ? 73 : 59)
          : (m.sess === s1 ? 80 : m.sess === s2 ? 73 : 59),
      ]);
    }
    console.log('9. Сообщения добавлены:', messages.length);

    // --- 10. Запланированные занятия ---
    const scheduled = [
      {
        title: 'Лекция №5: Облачные технологии',
        description: 'Понятие облачных вычислений. Модели развёртывания: публичное, частное, гибридное облако. Сервисные модели: IaaS, PaaS, SaaS. Примеры платформ: AWS, Azure, Google Cloud.',
        daysFromNow: 7,
      },
      {
        title: 'Практика №3: Работа с облачными сервисами',
        description: 'Практическое знакомство с облачной платформой. Создание виртуальной машины, настройка хранилища. Работа с Google Cloud Console. Задание: развернуть простое веб-приложение.',
        daysFromNow: 14,
      },
      {
        title: 'Лекция №6: Искусственный интеллект и машинное обучение',
        description: 'Обзор методов машинного обучения: обучение с учителем, без учителя, reinforcement learning. Нейронные сети. Применение ИИ в современных информационных системах.',
        daysFromNow: 21,
      },
    ];

    const courseRes = await client.query(`
      SELECT id FROM "Course"
      WHERE title = 'Информационные технологии'
        AND "teacherId" = (SELECT id FROM "Teacher" WHERE email = 'ivanova.ns@zabgu.ru')
      LIMIT 1
    `);
    const courseId = courseRes.rows[0].id;
    const groupRes = await client.query(`SELECT id FROM "Group" WHERE name = 'ИТ-301' LIMIT 1`);
    const groupId = groupRes.rows[0].id;

    for (const sc of scheduled) {
      await client.query(`
        INSERT INTO "ScheduledSession"
          ("teacherId", "courseId", "groupId", title, description, "subjectName", "scheduledStart", duration, "isActive")
        VALUES (
          $1, $2, $3, $4, $5,
          'Информационные технологии',
          NOW() + ($6 || ' days')::INTERVAL + INTERVAL '10 hours',
          90, false
        )
      `, [tId, courseId, groupId, sc.title, sc.description, sc.daysFromNow]);
    }
    console.log('10. Запланированные занятия добавлены');

    // --- Итоговая статистика ---
    const stats = await client.query(`
      SELECT 'Teacher' AS t, COUNT(*) FROM "Teacher"
      UNION ALL SELECT 'Student', COUNT(*) FROM "Student"
      UNION ALL SELECT 'Group', COUNT(*) FROM "Group"
      UNION ALL SELECT 'Course', COUNT(*) FROM "Course"
      UNION ALL SELECT 'Session', COUNT(*) FROM "Session"
      UNION ALL SELECT 'Attendance', COUNT(*) FROM "Attendance"
      UNION ALL SELECT 'MissedSessionReview', COUNT(*) FROM "MissedSessionReview"
      UNION ALL SELECT 'Message', COUNT(*) FROM "Message"
      UNION ALL SELECT 'ScheduledSession', COUNT(*) FROM "ScheduledSession"
    `);
    console.log('\n=== Статистика БД ===');
    for (const row of stats.rows) {
      console.log(`  ${row.t.padEnd(22)} : ${row.count}`);
    }
    console.log('\nГотово! Данные успешно заполнены.');
  } catch (err) {
    console.error('Ошибка при заполнении данных:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });
