#!/usr/bin/env node

/**
 * Execute Analysis Type Constraint
 * 
 * Adds database constraint to ensure only page_analysis type is allowed
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

async function executeConstraint() {
  try {
    console.log('🔒 Adding analysis type constraint to database...');
    
    // Read SQL file
    const sqlFile = resolve(__dirname, 'add-analysis-type-constraint.sql');
    const sql = readFileSync(sqlFile, 'utf8');
    
    // Extract the ALTER TABLE command (skip comments and test)
    const alterCommand = sql
      .split('\n')
      .filter(line => line.startsWith('ALTER TABLE') || line.startsWith('CHECK'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Executing constraint:', alterCommand);
    
    // Execute the constraint
    const { error } = await supabase.rpc('exec_sql', { 
      sql: alterCommand 
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Constraint already exists - database is protected');
        return true;
      }
      throw error;
    }
    
    console.log('✅ Analysis type constraint added successfully');
    console.log('🛡️ Database now enforces page_analysis type only');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to add constraint:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Analysis Type Constraint Enforcement');
  console.log('Ensures database only accepts page_analysis type\n');
  
  const success = await executeConstraint();
  
  if (success) {
    console.log('\n✅ Database constraint enforcement complete!');
    console.log('🔒 Future inconsistencies prevented');
  } else {
    console.log('\n❌ Constraint enforcement failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});