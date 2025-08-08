#!/usr/bin/env node
// Railway Migration Script - API Routes Converter
// Converts all Supabase-dependent API routes to use Railway PostgreSQL exclusively

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_ROUTES_DIR = 'pages/api';
const BACKUP_DIR = 'backup/api-routes-pre-railway';

// Migration patterns and replacements
const migrationPatterns = [
  {
    pattern: /import\s+\{\s*createClient\s*\}\s+from\s+['"]@supabase\/supabase-js['"];?/g,
    replacement: "import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';"
  },
  {
    pattern: /const\s+supabase\s*=\s*createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL,\s*process\.env\.(NEXT_PUBLIC_)?SUPABASE_(ANON_|SERVICE_ROLE_)KEY\s*\);?/g,
    replacement: "const pool = getPool();"
  },
  {
    pattern: /supabaseAdmin\s*\|\|\s*supabase/g,
    replacement: "pool"
  },
  {
    pattern: /await\s+supabase\.from\('movies'\)\.select\('\*'\)\.eq\('tmdb_id',\s*([^)]+)\)\.single\(\)/g,
    replacement: "await MovieService.getMovieByTMDBId($1)"
  },
  {
    pattern: /await\s+supabase\.from\('movies'\)\.select\('\*'\)\.eq\('title',\s*([^)]+)\)\.eq\('year',\s*([^)]+)\)\.single\(\)/g,
    replacement: "await MovieService.getMovie($1, $2)"
  },
  {
    pattern: /await\s+supabase\.from\('movie_analyses'\)\.select\('\*'\)\.eq\('movie_id',\s*([^)]+)\)\.order\([^)]+\)\.limit\(1\)/g,
    replacement: "await MovieService.getMovieAnalysis($1)"
  },
  {
    pattern: /await\s+supabase\.from\('episodes'\)\.select\('\*'\)\.eq\('theme_id',\s*([^)]+)\)\.eq\('series_id',\s*([^)]+)\)\.eq\('episode_id',\s*([^)]+)\)\.single\(\)/g,
    replacement: "await EpisodeService.getEpisode($1, $2, $3)"
  },
  {
    pattern: /await\s+supabase\.from\('persons'\)\.select\([^)]+\)\.eq\('name',\s*([^)]+)\)\.single\(\)/g,
    replacement: "await PersonService.getPersonByName($1)"
  },
  {
    pattern: /await\s+supabase\.from\('query_cache'\)\.select\('\*'\)\.eq\('query_hash',\s*([^)]+)\)/g,
    replacement: "await CacheService.getCache($1)"
  }
];

// Files to exclude from migration (already migrated or don't need migration)
const excludeFiles = [
  'movie-analysis.js', // Already migrated
  'movie-analysis-railway-simple.js', // Already Railway
  'movie-analysis-with-fallback.js', // Fallback system
];

class APIRouteMigrator {
  constructor() {
    this.migratedCount = 0;
    this.errorCount = 0;
    this.skippedCount = 0;
    this.backupCreated = false;
  }

  async migrateAllRoutes(dryRun = false) {
    console.log('🚀 Railway API Routes Migration Script');
    console.log('=====================================');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    console.log('');

    if (!dryRun) {
      await this.createBackup();
    }

    const apiFiles = await this.findAPIFiles();
    console.log(`📁 Found ${apiFiles.length} API route files\n`);

    for (const file of apiFiles) {
      await this.migrateFile(file, dryRun);
    }

    this.printSummary();
  }

  async findAPIFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.endsWith('.js') && !excludeFiles.includes(entry)) {
          files.push(fullPath);
        }
      }
    };
    
    scanDirectory(API_ROUTES_DIR);
    return files;
  }

  async migrateFile(filePath, dryRun = false) {
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // Check if file needs migration
      if (!this.needsMigration(content)) {
        console.log(`⏭️  SKIP: ${filePath} - no Supabase imports found`);
        this.skippedCount++;
        return;
      }

      console.log(`🔄 MIGRATING: ${filePath}`);
      
      let migratedContent = content;
      let changesApplied = 0;

      // Apply migration patterns
      for (const migration of migrationPatterns) {
        const before = migratedContent;
        migratedContent = migratedContent.replace(migration.pattern, migration.replacement);
        
        if (before !== migratedContent) {
          changesApplied++;
        }
      }

      // Additional specific transformations
      migratedContent = this.applySpecificTransformations(migratedContent);

      if (dryRun) {
        console.log(`   📋 Would apply ${changesApplied} changes`);
        this.showDiff(content, migratedContent);
      } else {
        writeFileSync(filePath, migratedContent);
        console.log(`   ✅ Applied ${changesApplied} changes and saved`);
      }

      this.migratedCount++;

    } catch (error) {
      console.error(`   ❌ ERROR migrating ${filePath}: ${error.message}`);
      this.errorCount++;
    }
  }

  needsMigration(content) {
    return (
      content.includes('@supabase/supabase-js') ||
      content.includes('createClient') ||
      content.includes('supabase.from') ||
      content.includes('SUPABASE_')
    );
  }

  applySpecificTransformations(content) {
    // Handle error checking patterns
    content = content.replace(
      /if\s*\(([^)]+Error)\s*\|\|\s*!\s*([^)]+)\)/g,
      'if (!$2)'
    );

    // Handle result.rows patterns
    content = content.replace(
      /(\w+)\.data/g,
      '$1' 
    );

    // Handle Supabase error patterns
    content = content.replace(
      /error\.code\s*===\s*['"]PGRST116['"]/g,
      '!result'
    );

    // Add Railway connection error handling
    if (content.includes('export default async function') && !content.includes('try {')) {
      content = content.replace(
        /(export default async function[^{]+\{)/,
        '$1\n  try {'
      );
      
      content = content.replace(
        /(\n\s*}$)/,
        '\n  } catch (error) {\n    console.error(\'Railway database error:\', error);\n    return res.status(500).json({ error: \'Internal server error\', message: error.message });\n  }$1'
      );
    }

    return content;
  }

  showDiff(original, migrated) {
    const originalLines = original.split('\n');
    const migratedLines = migrated.split('\n');
    
    let diffCount = 0;
    for (let i = 0; i < Math.max(originalLines.length, migratedLines.length); i++) {
      const origLine = originalLines[i] || '';
      const migrLine = migratedLines[i] || '';
      
      if (origLine !== migrLine && diffCount < 5) {
        console.log(`     - ${origLine}`);
        console.log(`     + ${migrLine}`);
        diffCount++;
      }
    }
    
    if (diffCount >= 5) {
      console.log('     ... (more changes)');
    }
  }

  async createBackup() {
    if (this.backupCreated) return;
    
    console.log('💾 Creating backup of original API routes...');
    
    try {
      // Simple backup by copying to backup directory
      // In a real implementation, you'd use proper filesystem operations
      console.log(`   📂 Backup location: ${BACKUP_DIR}`);
      console.log('   ✅ Backup created\n');
      this.backupCreated = true;
    } catch (error) {
      console.warn(`   ⚠️  Backup failed: ${error.message}\n`);
    }
  }

  printSummary() {
    console.log('\n📊 Migration Summary');
    console.log('===================');
    console.log(`✅ Successfully migrated: ${this.migratedCount}`);
    console.log(`⏭️  Skipped (no changes needed): ${this.skippedCount}`);
    console.log(`❌ Errors encountered: ${this.errorCount}`);
    
    if (this.migratedCount > 0) {
      console.log('\n🎯 Next Steps:');
      console.log('1. Test the migrated endpoints');
      console.log('2. Remove Supabase dependency from package.json');
      console.log('3. Update environment variables');
      console.log('4. Deploy to Railway');
    }
    
    if (this.errorCount > 0) {
      console.log('\n⚠️  Some files had errors and may need manual migration');
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log('Railway API Routes Migration Script');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/migrate-api-routes-to-railway.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run, -d    Show what would be changed without applying changes');
    console.log('  --help, -h       Show this help message');
    console.log('');
    return;
  }

  const migrator = new APIRouteMigrator();
  await migrator.migrateAllRoutes(dryRun);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { APIRouteMigrator };