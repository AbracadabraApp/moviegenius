#!/usr/bin/env node

// Mass Railway Adapter Fix - Add compatibility imports to all Supabase files
// This provides immediate build success while maintaining migration path

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

let stats = {
  filesProcessed: 0,
  importsAdded: 0,
  errors: []
};

function processFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if file uses supabase but doesn't import it
    if (content.includes('supabase') && !content.includes('@supabase/supabase-js') && !content.includes('railway-adapter')) {
      
      // Determine correct import path
      const isAdmin = filePath.includes('/admin/');
      const isBatch = filePath.includes('/batch/');
      let importPath;
      
      if (isAdmin) {
        importPath = "'../../lib/railway-adapter.js'";
      } else if (isBatch) {
        importPath = "'../../lib/railway-adapter.js'";  
      } else {
        importPath = "'../lib/railway-adapter.js'";
      }
      
      const importLine = `import { createClient, supabase } from ${importPath};\n`;
      
      // Add import at the top
      if (content.includes('import ') || content.includes('const ') || content.includes('export ')) {
        // Find the best place to insert
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Look for existing imports or first non-comment line
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('import ') || line.startsWith('const ') || line.startsWith('let ')) {
            insertIndex = i;
            break;
          }
          if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
            insertIndex = i;
            break;
          }
        }
        
        lines.splice(insertIndex, 0, importLine);
        content = lines.join('\n');
      } else {
        content = importLine + '\n' + content;
      }
      
      modified = true;
      stats.importsAdded++;
      console.log(`✅ Added Railway adapter to: ${filePath}`);
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      stats.filesProcessed++;
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

console.log('🚀 Adding Railway adapter imports to all API files...\n');

// Process pages/api directory
const apiDir = join(process.cwd(), 'pages', 'api');
processDirectory(apiDir);

console.log('\n📊 Railway Adapter Import Statistics:');
console.log(`Files Processed: ${stats.filesProcessed}`);
console.log(`Imports Added: ${stats.importsAdded}`);

if (stats.errors.length > 0) {
  console.log(`\n❌ Errors (${stats.errors.length}):`);
  stats.errors.forEach(error => {
    console.log(`  - ${error.file || error.directory}: ${error.error}`);
  });
} else {
  console.log('\n✅ Railway adapter imports completed successfully!');
}

console.log('\n🔄 Next: Run npm run build to test build success');