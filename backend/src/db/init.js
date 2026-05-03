const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./pool');

async function initDatabase() {
  console.log('🚀 Initializing database...');

  try {
    // Run schema
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schemaSQL.split(';').filter(s => s.trim().length > 0);
    for (const statement of statements) {
      try {
        await db.query(statement);
      } catch (e) {
        // Ignore "already exists" errors
        if (e.code !== '42P07' && e.code !== '42P01') { 
          // 42P07 is duplicate_relation, 42P01 is undefined_table (shouldn't happen here but good to know)
          // 42710 is duplicate_object
          if (e.code !== '42710' && !e.message.includes('already exists')) {
            throw e;
          }
        }
      }
    }
    console.log('✅ Schema updated successfully');

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
