#!/usr/bin/env node

/**
 * Reset Browse List Database Schema
 * 
 * Drops existing predictable browse lists and installs the new polyhierarchical schema
 */

import { readFileSync } from 'fs';
import { getRailwayClient } from '../lib/railway-db.js';

async function resetSchema() {
  console.log('🗑️ Resetting Browse List Database Schema...');
  console.log('   Dropping predictable existing lists and installing new polyhierarchical system');
  
  try {
    const client = getRailwayClient();
    await client.connect();
    console.log('🔗 Connected to Railway PostgreSQL');

    // First, check what exists
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'browse_%'
    `);
    
    if (tables.rows.length > 0) {
      console.log(`📊 Found ${tables.rows.length} existing browse tables (will be replaced)`);
      tables.rows.forEach(t => console.log(`   • ${t.table_name}`));
    } else {
      console.log('📊 No existing browse tables found');
    }

    // Drop existing browse list tables
    console.log('🗑️ Dropping existing browse list tables...');
    await client.query('DROP TABLE IF EXISTS browse_list_ratings CASCADE');
    await client.query('DROP TABLE IF EXISTS browse_list_movies CASCADE'); 
    await client.query('DROP TABLE IF EXISTS browse_lists CASCADE');
    console.log('✅ Old schema removed');

    // Install new polyhierarchical schema
    console.log('📄 Installing new polyhierarchical schema...');
    const schemaSQL = readFileSync('database/browse-lists-schema.sql', 'utf8');
    await client.query(schemaSQL);
    console.log('✅ New schema installed!');

    // Verify new installation
    const newTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'browse_%'
      ORDER BY table_name
    `);

    console.log('\n📊 New polyhierarchical tables:');
    newTables.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    // Check bootstrap facets
    const facetCount = await client.query('SELECT COUNT(*) as count FROM browse_facets');
    console.log(`\n🏷️ Bootstrap facets: ${facetCount.rows[0].count}`);

    // Show facet types
    const facetTypes = await client.query(`
      SELECT facet_type, COUNT(*) as count 
      FROM browse_facets 
      GROUP BY facet_type 
      ORDER BY facet_type
    `);
    
    console.log('📋 Facet types available:');
    facetTypes.rows.forEach(ft => {
      console.log(`   • ${ft.facet_type}: ${ft.count} facets`);
    });

    await client.end();
    console.log('\n🎉 Fresh polyhierarchical browse list system ready!');
    console.log('   Ready to generate sophisticated, multi-dimensional movie lists');

  } catch (error) {
    console.error('❌ Schema reset failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetSchema();
}