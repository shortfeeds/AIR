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
    // Migrations for existing tables
    try {
      await db.query('ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS prompt_b TEXT');
      await db.query('ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS ab_split_active BOOLEAN DEFAULT false');
      
      // Update subscriptions plan_name check
      await db.query('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check');
      await db.query("ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_name_check CHECK (plan_name IN ('free_trial', 'trial', 'silver', 'gold', 'diamond', 'platinum', 'enterprise'))");
      
      await db.query('ALTER TABLE call_leads ADD COLUMN IF NOT EXISTS used_prompt CHAR(1) DEFAULT \'A\'');

      // Update client_profiles with new SaaS onboarding and webhook columns
      await db.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS avg_lead_value INTEGER DEFAULT 1000');
      await db.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)');
      await db.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS n8n_webhook_url VARCHAR(500)');
      await db.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS gstin VARCHAR(20)');
      await db.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS crm_type VARCHAR(50) DEFAULT \'none\'');
      await db.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS crm_webhook_url VARCHAR(500)');
      
      try {
        await db.query('ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_crm_type_check');
        await db.query("ALTER TABLE client_profiles ADD CONSTRAINT client_profiles_crm_type_check CHECK (crm_type IN ('none', 'zoho', 'hubspot', 'custom'))");
      } catch (err) {
        // Ignore constraint issues
      }
    } catch (e) {
      console.log('⚠️ Migration notice (can usually be ignored):', e.message);
    }

    console.log('✅ Schema updated successfully');

    // Run Migrations from src/db/migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        console.log(`Running migration: ${file}`);
        const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await db.query(migrationSQL);
        } catch (e) {
          // Ignore duplicate relation/object errors
          if (e.code !== '42P07' && e.code !== '42710' && !e.message.includes('already exists')) {
            console.warn(`⚠️ Error in migration ${file}:`, e.message);
          }
        }
      }
      console.log('✅ Migrations applied successfully');
    }

    // Create admin user with proper hash
    const adminPassword = 'TP@2026%';
    const hash = await bcrypt.hash(adminPassword, 10);

    // Ensure we have at least one admin
    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $1`,
      ['Trinity Admin', 'ai@trinitypixels.com', hash, 'admin']
    );
    console.log('✅ Admin user verified (ai@trinitypixels.com / TP@2026%)');

    console.log('🎉 Database initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

initDatabase();
