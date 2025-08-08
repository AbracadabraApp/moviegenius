#!/usr/bin/env node

/**
 * Execute Person System Migration
 * 
 * This script executes the migration from name-based to ID-based person system.
 * It runs the SQL migration script and provides detailed feedback.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway PostgreSQL connection helper
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

async function executeMigration() {
  console.log('🚀 Starting Person System Migration...\n');

  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrate-to-person-ids.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration SQL from:', migrationPath);

    // Split SQL into individual statements (basic splitting on ;)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let executedCount = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${executedCount + 1}/${statements.length}...`);
          await client.query(statement);
          executedCount++;
          console.log(`✅ Statement ${executedCount} completed`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${executedCount + 1} skipped (already exists)`);
            executedCount++;
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!\n');

    // Run validation queries
    console.log('🔍 Running validation queries...\n');

    const validationQueries = [
      {
        name: 'Total persons created',
        query: 'SELECT COUNT(*) as total_persons FROM persons'
      },
      {
        name: 'Contributors with person_id',
        query: `SELECT 
          COUNT(*) as total_contributors,
          COUNT(person_id) as contributors_with_person_id,
          COUNT(*) - COUNT(person_id) as contributors_missing_person_id
        FROM movie_contributors`
      },
      {
        name: 'Sample person records',
        query: 'SELECT id, name FROM persons ORDER BY id LIMIT 5'
      },
      {
        name: 'Sample contributors with person_id',
        query: `SELECT 
          movie_tmdb_id,
          person_name,
          person_id,
          role
        FROM movie_contributors
        WHERE person_id IS NOT NULL
        ORDER BY person_id
        LIMIT 5`
      }
    ];

    for (const validation of validationQueries) {
      try {
        console.log(`📋 ${validation.name}:`);
        const result = await client.query(validation.query);
        console.table(result.rows);
        console.log('');
      } catch (error) {
        console.error(`❌ Validation query failed: ${validation.name}`, error.message);
      }
    }

    console.log('🎊 Person system migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test the new ID-based person pages: /person/1, /person/2, etc.');
    console.log('2. Verify that the API works with personId parameter');
    console.log('3. Update any links or references to use person IDs instead of name slugs');
    console.log('4. After testing, you can drop the person_name column from movie_contributors');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔄 The database should be in a consistent state for rollback if needed.');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Handle command line execution
if (require.main === module) {
  executeMigration().catch(console.error);
}

module.exports = { executeMigration };