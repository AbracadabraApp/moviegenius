#!/usr/bin/env node

// Migration Script: Clean Supabase to Railway Migration
// Systematic replacement of all Supabase references with Railway equivalents
// Phase 2 of the Clean Reset Approach designed by backend-architect

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stats = {
  filesProcessed: 0,
  importsReplaced: 0,
  supabaseRefsReplaced: 0,
  getPoolAdded: 0,
  errors: []
};

// Import patterns to replace
const replacementPatterns = [
  // Import replacements
  {
    pattern: /import.*from\s+['"]\.\.\/lib\/supabase\.js['"];?/g,
    replacement: "import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../lib/railway-db.js';"
  },
  {
    pattern: /import.*from\s+['"]\.\.\/\.\.\/lib\/supabase\.js['"];?/g,
    replacement: "import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';"
  },
  {
    pattern: /import.*from\s+['"].*\/lib\/supabase\.js['"];?/g,
    replacement: "import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../lib/railway-db.js';"
  },
  
  // Service usage replacements
  {
    pattern: /supabase\.from\(['"]([^'"]+)['"]\)/g,
    replacement: (match, tableName) => {
      // Route to appropriate Railway service
      if (tableName === 'movies') return 'MovieService';
      if (tableName === 'episodes') return 'EpisodeService';
      if (tableName === 'query_cache') return 'CacheService';
      if (tableName === 'persons') return 'PersonService';
      return 'getPool()'; // Fallback to raw pool access
    }
  },
  
  // Direct supabase variable references
  {
    pattern: /\bsupabase\b(?!\.)/g,
    replacement: 'getPool()'
  }
];

// Files to exclude from processing
const excludePatterns = [
  'node_modules',
  '.next',
  '.git',
  'migration-script.js',
  'lib/supabase.js', // Keep original for reference during migration
];

function shouldExcludeFile(filePath) {
  return excludePatterns.some(pattern => filePath.includes(pattern));
}

function processFile(filePath) {
  try {
    console.log(`Processing: ${filePath}`);
    
    let content = readFileSync(filePath, 'utf8');
    let modified = false;
    let originalContent = content;
    
    // Apply replacement patterns
    replacementPatterns.forEach(({ pattern, replacement }) => {
      if (typeof replacement === 'function') {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          modified = true;
          stats.supabaseRefsReplaced++;
        }
        content = newContent;
      } else {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          modified = true;
          stats.importsReplaced += matches.length;
        }
      }
    });
    
    // Add getPool import if needed and not already present
    if (content.includes('getPool') && !content.includes('import') && !content.includes('getPool')) {
      const importLine = "import { getPool } from '../lib/railway-db.js';\n";
      content = importLine + content;
      modified = true;
      stats.getPoolAdded++;
    }
    
    // Write changes if modified
    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      stats.filesProcessed++;
    } else {
      console.log(`⏭️  No changes: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.errors.push({ file: filePath, error: error.message });
  }
}

function processDirectory(dirPath) {
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = join(dirPath, item);
      
      if (shouldExcludeFile(itemPath)) {
        continue;
      }
      
      const stat = statSync(itemPath);
      
      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (stat.isFile() && itemPath.endsWith('.js')) {
        processFile(itemPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${dirPath}:`, error.message);
    stats.errors.push({ directory: dirPath, error: error.message });
  }
}

// Main execution
console.log('🚀 Starting Clean Supabase to Railway Migration');
console.log('📁 Processing pages/api directory...\n');

const apiDir = join(__dirname, 'pages', 'api');
processDirectory(apiDir);

console.log('\n📊 Migration Statistics:');
console.log(`Files Processed: ${stats.filesProcessed}`);
console.log(`Imports Replaced: ${stats.importsReplaced}`);
console.log(`Supabase References Replaced: ${stats.supabaseRefsReplaced}`);
console.log(`getPool Imports Added: ${stats.getPoolAdded}`);

if (stats.errors.length > 0) {
  console.log(`\n❌ Errors (${stats.errors.length}):`);
  stats.errors.forEach(error => {
    console.log(`  - ${error.file || error.directory}: ${error.error}`);
  });
} else {
  console.log('\n✅ Migration completed successfully with no errors!');
}

console.log('\n🔄 Next Steps:');
console.log('1. Run npm run build to test migration');  
console.log('2. Commit successful migration');
console.log('3. Deploy to Railway');