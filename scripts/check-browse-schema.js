#!/usr/bin/env node

/**
 * Check Browse List Database Schema Status
 */

import { getRailwayClient } from '../lib/railway-db.js';

async function checkSchema() {
  console.log('🔍 Checking Browse List Database Schema...');
  
  try {
    const client = getRailwayClient();
    await client.connect();

    // Check what browse_* tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'browse_%'
      ORDER BY table_name
    `);

    console.log('\n📊 Browse tables found:');
    for (const table of tables.rows) {
      console.log(`\n🏷️ Table: ${table.table_name}`);
      
      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      columns.rows.forEach(col => {
        console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }

    // Check if browse_lists table has data
    if (tables.rows.some(t => t.table_name === 'browse_lists')) {
      const count = await client.query('SELECT COUNT(*) as count FROM browse_lists');
      console.log(`\n📈 Browse lists count: ${count.rows[0].count}`);
    }

    // Check facets
    if (tables.rows.some(t => t.table_name === 'browse_facets')) {
      const facetCount = await client.query('SELECT COUNT(*) as count FROM browse_facets');
      console.log(`📈 Browse facets count: ${facetCount.rows[0].count}`);
      
      if (facetCount.rows[0].count > 0) {
        const facetTypes = await client.query(`
          SELECT facet_type, COUNT(*) as count 
          FROM browse_facets 
          GROUP BY facet_type 
          ORDER BY facet_type
        `);
        
        console.log('🏷️ Facet types:');
        facetTypes.rows.forEach(ft => {
          console.log(`   • ${ft.facet_type}: ${ft.count}`);
        });
      }
    }

    await client.end();
    console.log('\n✅ Schema check complete');

  } catch (error) {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkSchema();
}