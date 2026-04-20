const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('PostgreSQL подключен');
});

pool.on('error', (err) => {
  console.error('Ошибка PostgreSQL:', err);
});

const initDatabase = async () => {
  try {
    console.log('Начало инициализации базы данных...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Teacher" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Таблица Teacher создана/проверена');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Student" (
        id SERIAL PRIMARY KEY,
        "full_name" VARCHAR(100) NOT NULL,
        "group" VARCHAR(50),
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Таблица Student создана/проверена');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Course" (
        id SERIAL PRIMARY KEY,
        "teacherId" INTEGER REFERENCES "Teacher"(id),
        title VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Таблица Course создана/проверена');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Session" (
        id SERIAL PRIMARY KEY,
        "courseId" INTEGER REFERENCES "Course"(id),
        "isActive" BOOLEAN DEFAULT true,
        "startTime" TIMESTAMP,
        "endTime" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Таблица Session создана/проверена');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Attendance" (
        id SERIAL PRIMARY KEY,
        "studentId" INTEGER REFERENCES "Student"(id),
        "sessionId" INTEGER REFERENCES "Session"(id),
        "joinTime" TIMESTAMP DEFAULT NOW(),
        UNIQUE("studentId", "sessionId")
      )
    `);
    console.log('Таблица Attendance создана/проверена');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Message" (
        id SERIAL PRIMARY KEY,
        "sessionId" INTEGER REFERENCES "Session"(id),
        "senderType" VARCHAR(20) NOT NULL,
        "senderId" INTEGER NOT NULL,
        text TEXT NOT NULL,
        "timestamp" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Таблица Message создана/проверена');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AudioRecording" (
        id SERIAL PRIMARY KEY,
        "sessionId" INTEGER,
        "teacherId" INTEGER,
        "fileName" VARCHAR(255) NOT NULL,
        "filePath" VARCHAR(500) NOT NULL,
        "fileSize" INTEGER,
        "duration" INTEGER,
        "title" VARCHAR(255),
        "description" TEXT,
        "transcription" TEXT,
        "lastEditedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Таблица AudioRecording создана/проверена');
    
    await pool.query(`
      ALTER TABLE "AudioRecording" 
      ADD COLUMN IF NOT EXISTS "transcription" TEXT,
      ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP;
    `);
    console.log('Таблица AudioRecording проверена/обновлена для транскрипций');
    
    console.log('База данных успешно инициализирована');
  } catch (err) {
    console.error('Ошибка инициализации базы данных:', err);
  }
};

module.exports = { pool, initDatabase };