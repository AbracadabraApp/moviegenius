#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: false
});

async function debugSchema() {
  try {
    console.log('🔍 Investigating database schema...\n');

    // List all tables
    console.log('1. Available tables:');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    const tables = await pool.query(tablesQuery);
    console.log('✅ Tables found:');
    tables.rows.forEach(row => {
      console.log('   -', row.table_name);
    });
    console.log('');

    // Check if movie_analyses table exists and its columns
    console.log('2. Checking movie_analyses table columns:');
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'movie_analyses' 
      ORDER BY ordinal_position;
    `;
    
    const columns = await pool.query(columnsQuery);
    if (columns.rows.length > 0) {
      console.log('✅ movie_analyses columns:');
      columns.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('❌ movie_analyses table not found');
    }
    console.log('');

    // Sample a few records to understand structure
    console.log('3. Sample records from movie_analyses:');
    const sampleQuery = `
      SELECT * FROM movie_analyses LIMIT 3;
    `;
    
    const sample = await pool.query(sampleQuery);
    if (sample.rows.length > 0) {
      console.log('✅ Sample records:');
      sample.rows.forEach((row, index) => {
        console.log(`   Record ${index + 1}:`, JSON.stringify(row, null, 4));
      });
    } else {
      console.log('❌ No records found in movie_analyses');
    }

  } catch (error) {
    console.error('❌ Schema investigation failed:', error.message);
  } finally {
    await pool.end();
  }
}

debugSchema();