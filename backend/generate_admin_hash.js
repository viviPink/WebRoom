// Запустить один раз: node generate_admin_hash.js
// Скопируй вывод и вставь в admin_migration.sql

const bcrypt = require('bcrypt');

const password = 'admin123'; // Замени на нужный пароль
bcrypt.hash(password, 10).then(hash => {
  console.log('Пароль:', password);
  console.log('Хэш для SQL:', hash);
  console.log('\nSQL для вставки:');
  console.log(`INSERT INTO "Admin" (login, password, name)`);
  console.log(`VALUES ('admin', '${hash}', 'Главный администратор')`);
  console.log(`ON CONFLICT (login) DO NOTHING;`);
});