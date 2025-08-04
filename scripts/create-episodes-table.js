#!/usr/bin/env node

/**
 * Create Episodes Table Script
 *
 * Creates the episodes table in Supabase database using the schema file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createEpisodesTable() {
  try {
    console.log('🗃️  Creating episodes table...');

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available. Check environment variables.');
    }

    // Read the schema file
    const schemaPath = path.join(__dirname, 'episodes-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📜 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   [${i + 1}/${statements.length}] ${statement.substring(0, 50)}...`);

      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: statement,
      });

      if (error) {
        // Try direct query if RPC doesn't work
        console.log('   Trying direct query...');
        const { error: directError } = await supabaseAdmin
          .from('_dummy_table_that_does_not_exist')
          .select('*');

        // If that fails, try a different approach
        if (directError) {
          console.warn(`   ⚠️  Could not execute: ${statement.substring(0, 100)}...`);
          console.warn(`   Error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }

    // Test table creation by checking if we can query it
    console.log('🔍 Testing table creation...');
    const { data, error } = await supabaseAdmin.from('episodes').select('count(*)').single();

    if (error) {
      console.warn(`⚠️  Table may not exist yet: ${error.message}`);
      console.log('📝 You may need to apply the schema manually in Supabase dashboard');
      console.log('   1. Go to Supabase SQL Editor');
      console.log('   2. Copy contents of scripts/episodes-schema.sql');
      console.log('   3. Run the SQL statements');
    } else {
      console.log('✅ Episodes table created successfully!');
      console.log(`📊 Current episode count: ${data?.count || 0}`);
    }
  } catch (error) {
    console.error('❌ Error creating episodes table:', error.message);
    process.exit(1);
  }
}

// Run the script
createEpisodesTable();
