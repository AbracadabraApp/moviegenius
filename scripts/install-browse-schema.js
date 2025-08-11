#!/usr/bin/env node

/**
 * Install Browse List Database Schema
 * 
 * Installs the polyhierarchical browse lists database schema on Railway PostgreSQL
 */

import { readFileSync } from 'fs';
import { getRailwayClient } from '../lib/railway-db.js';

async function installSchema() {
  console.log('🗄️ Installing Browse List Database Schema...');
  
  try {
    // Read the schema file
    const schemaSQL = readFileSync('database/browse-lists-schema.sql', 'utf8');
    console.log(`📄 Schema file read (${schemaSQL.length} characters)`);

    // Connect to Railway database
    const client = getRailwayClient();
    await client.connect();
    console.log('🔗 Connected to Railway PostgreSQL');

    // Execute the schema
    console.log('⚡ Executing schema...');
    await client.query(schemaSQL);
    console.log('✅ Schema installed successfully!');

    // Verify installation by checking table counts
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'browse_%'
      ORDER BY table_name
    `);

    console.log('\n📊 Installed tables:');
    tables.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    // Check facet count
    const facetCount = await client.query(`
      SELECT COUNT(*) as count FROM browse_facets
    `);
    console.log(`\n🏷️ Bootstrap facets installed: ${facetCount.rows[0].count}`);

    await client.end();
    console.log('\n🎉 Browse list database schema ready!');

  } catch (error) {
    console.error('❌ Schema installation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  installSchema();
}