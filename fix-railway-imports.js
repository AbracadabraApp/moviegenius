#!/usr/bin/env node

// Quick fix script for Railway imports and undefined supabase references
// Targets specific patterns causing build failures

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Files that need basic fixes for immediate build success
const criticalFiles = [
  // Files with 'getPool' is not defined
  'pages/api/analysis-count.js',
  'pages/api/debug-db-schema.js', 
  'pages/api/debug-db.js',
  'pages/api/educational-list-analysis.js',
  'pages/api/generate-list-content.js',
  'pages/api/genius-list.js',
  'pages/api/list-analysis.js',
  'pages/api/person-analysis.js',
  'pages/api/tag-cloud.js',
  'pages/api/verify-movie.js',
  
  // Admin files with simple supabase references
  'pages/api/admin/table-schema.js',
  'pages/api/admin/count-all-movies.js',
  'pages/api/admin/count-analysis.js',
];

function addRailwayImport(filePath) {
  try {
    console.log(`Processing: ${filePath}`);
    
    let content = readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Add Railway import if getPool is used but not imported
    if (content.includes('getPool') && !content.includes("from '../lib/railway-db.js'") && !content.includes("from '../../lib/railway-db.js'")) {
      // Determine correct import path based on file location
      const importPath = filePath.includes('admin/') ? "'../../lib/railway-db.js'" : "'../lib/railway-db.js'";
      const importLine = `import { getPool } from ${importPath};\n`;
      
      // Find the best place to insert the import
      if (content.includes('import ')) {
        // Add after existing imports
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            insertIndex = i + 1;
          }
        }
        lines.splice(insertIndex, 0, importLine);
        content = lines.join('\n');
      } else {
        // Add at the beginning
        content = importLine + '\n' + content;
      }
      modified = true;
      console.log(`✅ Added Railway import to: ${filePath}`);
    }
    
    // Replace basic supabase references with getPool() calls
    if (content.includes('supabase.') && !content.includes('createClient')) {
      content = content.replace(/supabase\./g, 'getPool().');
      modified = true;
      console.log(`✅ Fixed supabase references in: ${filePath}`);
    }
    
    // Write changes if modified
    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`📝 Updated: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Process critical files
console.log('🚀 Starting critical Railway import fixes...\n');

for (const file of criticalFiles) {
  const filePath = join(process.cwd(), file);
  addRailwayImport(filePath);
}

console.log('\n✅ Critical import fixes completed!');
console.log('🔄 Run npm run build to test improvements');