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
    const adminPassword = 'admin123';
    const hash = await bcrypt.hash(adminPassword, 10);

    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      ['Trinity Admin', 'admin@trinitypixels.in', hash, 'admin']
    );
    console.log('✅ Admin user created (admin@trinitypixels.in / admin123)');

    console.log('🎉 Database initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

initDatabase();
