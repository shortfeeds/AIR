const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./pool');

async function initDatabase() {
  console.log('🚀 Initializing database...');

  try {
    // Run schema
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schemaSQL);
    console.log('✅ Schema created successfully');

    // Create admin user with proper hash
    const adminPassword = 'TP@2026%';
    const hash = await bcrypt.hash(adminPassword, 10);

    await db.query('DELETE FROM users WHERE email = $1', ['admin@trinitypixels.in']);
    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $1`,
      ['Trinity Admin', 'ai@trinitypixels.com', hash, 'admin']
    );
    console.log('✅ Admin user created (ai@trinitypixels.com / TP@2026%)');

    console.log('🎉 Database initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

initDatabase();
