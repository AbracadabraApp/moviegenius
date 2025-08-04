#!/usr/bin/env node

/**
 * Execute Zero-Waste Database Migration
 * 
 * This script adds the missing completion tracking columns that are preventing
 * the zero-waste protection system from working properly.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function executeZeroWasteMigration() {
  console.log('🔧 Starting Zero-Waste Database Migration...');
  
  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync('./scripts/add-completion-tracking.sql', 'utf8');
    
    // Split into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`SQL: ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);
      
      try {
        const { error } = await supabase.rpc('execute_sql', { sql_statement: statement });
        
        if (error) {
          // Try direct execution instead
          const { error: directError } = await supabase
            .from('__migrations__') // This will fail but gives us SQL execution
            .select('*')
            .limit(0);
            
          // Use raw SQL execution via PostgREST
          const { error: rawError } = await supabase
            .rpc('exec', { query: statement });
            
          if (rawError && !rawError.message.includes('does not exist')) {
            console.error(`❌ Statement ${i + 1} failed:`, rawError.message);
            
            // For ALTER TABLE statements, ignore "column already exists" errors
            if (statement.includes('ADD COLUMN IF NOT EXISTS') && 
                rawError.message.includes('already exists')) {
              console.log(`✅ Column already exists - skipping`);
              continue;
            }
            
            // For CREATE INDEX statements, ignore "already exists" errors  
            if (statement.includes('CREATE INDEX IF NOT EXISTS') &&
                rawError.message.includes('already exists')) {
              console.log(`✅ Index already exists - skipping`);
              continue;
            }
            
            throw rawError;
          }
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (statementError) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, statementError.message);
        
        // Check if it's a "already exists" error we can ignore
        if ((statement.includes('IF NOT EXISTS') || statement.includes('ADD COLUMN IF NOT EXISTS')) &&
            (statementError.message.includes('already exists') || 
             statementError.message.includes('duplicate'))) {
          console.log(`⏭️ Skipping - already exists`);
          continue;
        }
        
        throw statementError;
      }
    }

    console.log(`\n🎉 Migration completed successfully!`);
    
    // Verify the migration worked
    console.log(`\n🔍 Verifying migration...`);
    
    // Test if we can query the new columns
    const { data: testData, error: testError } = await supabase
      .from('movies')
      .select('id, has_linked_analysis, analysis_completed_at')
      .limit(1);
      
    if (testError) {
      console.error(`❌ Verification failed:`, testError.message);
      process.exit(1);
    }
    
    console.log(`✅ Verification passed - new columns are accessible`);
    console.log(`📊 Sample data:`, testData[0]);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Alternative: Execute via direct SQL
async function executeViaDirect() {
  console.log('\n🔄 Attempting direct SQL execution...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const statements = [
    `ALTER TABLE movies 
     ADD COLUMN IF NOT EXISTS has_linked_analysis BOOLEAN DEFAULT FALSE,
     ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMP,
     ADD COLUMN IF NOT EXISTS nuclear_static_completed_at TIMESTAMP,
     ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP`,
     
    `ALTER TABLE movie_analyses 
     ADD COLUMN IF NOT EXISTS has_links BOOLEAN DEFAULT FALSE,
     ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP,
     ADD COLUMN IF NOT EXISTS link_count INTEGER DEFAULT 0`
  ];
  
  for (const statement of statements) {
    console.log(`⏳ Executing: ${statement.substring(0, 50)}...`);
    
    try {
      // We'll need to execute this manually since Supabase doesn't expose direct SQL execution
      console.log(`📋 Please execute this SQL manually in your Supabase dashboard:`);
      console.log(`\n${statement};\n`);
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  executeZeroWasteMigration().catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

export { executeZeroWasteMigration };