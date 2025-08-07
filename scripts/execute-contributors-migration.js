#!/usr/bin/env node

/**
 * Execute Movie Contributors Table Migration
 * 
 * Creates the movie_contributors table for Phase 1 person discovery system
 * Uses Railway PostgreSQL database connection
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// Railway PostgreSQL connection
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

async function executeMigration() {
  const client = getRailwayClient();
  
  try {
    console.log('🔄 Connecting to Railway database...');
    await client.connect();
    
    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), 'scripts', 'create-movie-contributors-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Clean up SQL content - remove comments and split by semicolon
    const cleanedSql = sqlContent
      // Remove single-line comments
      .replace(/--.*$/gm, '')
      // Remove multi-line comments  
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Split by semicolon and filter meaningful statements
    const statements = cleanedSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => 
        statement.length > 0 && 
        !statement.toLowerCase().startsWith('comment') &&
        !statement.toLowerCase().startsWith('select') &&
        !statement.toLowerCase().match(/^(explain|analyze)/)
      );
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
      } catch (error) {
        // Handle "already exists" errors gracefully
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️  Statement ${i + 1} skipped: ${error.message}`);
          continue;
        }
        
        console.error(`❌ Statement ${i + 1} failed:`, error.message);
        console.error(`   Statement: ${statement}`);
        throw error;
      }
    }
    
    // Verify table creation
    console.log('🔍 Verifying table creation...');
    const verifyResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'movie_contributors'
      ORDER BY ordinal_position
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ movie_contributors table created successfully!');
      console.log('📊 Table structure:');
      verifyResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      throw new Error('Table verification failed - movie_contributors not found');
    }
    
    // Check indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'movie_contributors'
      ORDER BY indexname
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('🗂️  Indexes created:');
      indexResult.rows.forEach(row => {
        console.log(`  - ${row.indexname}`);
      });
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { executeMigration };