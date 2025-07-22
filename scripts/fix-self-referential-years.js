#!/usr/bin/env node
/**
 * Fix Self-Referential Years in Nuclear Static Files
 *
 * Finds self-referential movie mentions in nuclear static files that are missing
 * years and adds them in (####) format for consistency.
 *
 * Usage: node scripts/fix-self-referential-years.js [--dry-run] [--count N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const NUCLEAR_DIR = path.join(PROJECT_ROOT, 'public', 'nuclear-static');
const PROGRESS_FILE = path.join(PROJECT_ROOT, 'scripts/.self-ref-years-progress.json');

class SelfReferentialYearFixer {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      fixesApplied: 0,
      errors: 0,
      startTime: Date.now(),
    };
    this.dryRun = process.argv.includes('--dry-run');
    this.maxFiles = this.parseCountArg() || null;
  }

  parseCountArg() {
    const countIndex = process.argv.indexOf('--count');
    if (countIndex !== -1 && process.argv[countIndex + 1]) {
      return parseInt(process.argv[countIndex + 1]);
    }
    return null;
  }

  /**
   * Find FIRST self-referential movie mention without year
   * Only adds year to the very first mention to establish context
   */
  findFirstSelfReferenceWithoutYear(content, movieTitle, movieYear) {
    if (!content || !movieTitle || !movieYear) return null;

    // Pattern: Movie title that matches current movie but lacks year
    // Look for the movie title in text that doesn't already have (year) after it
    const titlePattern = new RegExp(
      `\\b${this.escapeRegex(movieTitle)}(?!\\s*\\(\\d{4}\\))`,
      'gi'
    );

    const match = titlePattern.exec(content);
    if (!match) return null;

    const matchedText = match[0];
    
    // Skip if it's already part of a link or has complex formatting
    const beforeMatch = content.substring(Math.max(0, match.index - 20), match.index);
    const afterMatch = content.substring(match.index + matchedText.length, match.index + matchedText.length + 20);
    
    // Skip if it's part of a link or already has formatting
    if (beforeMatch.includes('<a ') || afterMatch.includes('</a>') || 
        beforeMatch.includes('href=') || afterMatch.includes('data-tmdb-id')) {
      return null;
    }

    return {
      original: matchedText,
      fixed: `${matchedText} (${movieYear})`,
      position: match.index,
      context: content.substring(Math.max(0, match.index - 30), match.index + matchedText.length + 30)
    };
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }

  /**
   * Apply single fix to content
   */
  applyFix(content, fix) {
    if (!fix) return { modifiedContent: content, appliedCount: 0 };

    const before = content.substring(0, fix.position);
    const after = content.substring(fix.position + fix.original.length);
    
    const modifiedContent = before + fix.fixed + after;
    
    return { modifiedContent, appliedCount: 1 };
  }

  /**
   * Process a single nuclear static file
   */
  async processNuclearFile(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (!data.props || !data.props.title || !data.props.year || !data.props.sections) {
        return { modified: false, fixes: 0 };
      }

      const movieTitle = data.props.title;
      const movieYear = data.props.year;
      let totalFixes = 0;
      let wasModified = false;

      // Process each text section - only fix FIRST occurrence across all sections
      let foundFirst = false;
      
      for (const section of data.props.sections) {
        if (section.type === 'text' && section.content && !foundFirst) {
          const fix = this.findFirstSelfReferenceWithoutYear(
            section.content, 
            movieTitle, 
            movieYear
          );

          if (fix) {
            const result = this.applyFix(section.content, fix);
            section.content = result.modifiedContent;
            totalFixes += result.appliedCount;
            wasModified = true;
            foundFirst = true;

            console.log(`  ✏️ Added year to first mention in "${movieTitle}" (${movieYear})`);
            console.log(`    "${fix.original}" → "${fix.fixed}"`);
            console.log(`    Context: ...${fix.context}...`);
          }
        }
      }

      // Save modified file
      if (wasModified && !this.dryRun) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }

      return { modified: wasModified, fixes: totalFixes };

    } catch (error) {
      console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
      this.stats.errors++;
      return { modified: false, fixes: 0 };
    }
  }

  /**
   * Get list of nuclear static files to process
   */
  getNuclearFiles() {
    if (!fs.existsSync(NUCLEAR_DIR)) {
      throw new Error(`Nuclear static directory not found: ${NUCLEAR_DIR}`);
    }

    const allFiles = fs.readdirSync(NUCLEAR_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(NUCLEAR_DIR, file));

    return this.maxFiles ? allFiles.slice(0, this.maxFiles) : allFiles;
  }

  /**
   * Print progress update
   */
  printProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rate = this.stats.filesProcessed / elapsed * 60; // files per minute

    console.log(`\\n📊 Progress Update:`);
    console.log(`  • Files processed: ${this.stats.filesProcessed}`);
    console.log(`  • Files modified: ${this.stats.filesModified}`);
    console.log(`  • Total fixes applied: ${this.stats.fixesApplied}`);
    console.log(`  • Errors: ${this.stats.errors}`);
    console.log(`  • Rate: ${rate.toFixed(1)} files/minute`);
    console.log(`  • Elapsed: ${(elapsed / 60).toFixed(1)} minutes`);
  }

  /**
   * Run the fixer
   */
  async run() {
    console.log('🎬 Self-Referential Year Fixer');
    console.log('🎯 Adding missing years to self-referential movie mentions\\n');

    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified\\n');
    }

    const files = this.getNuclearFiles();
    console.log(`📁 Found ${files.length} nuclear static files to process\\n`);

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      console.log(`🎥 [${this.stats.filesProcessed + 1}/${files.length}] Processing ${fileName}`);

      const result = await this.processNuclearFile(filePath);
      
      this.stats.filesProcessed++;
      if (result.modified) {
        this.stats.filesModified++;
      }
      this.stats.fixesApplied += result.fixes;

      // Progress update every 50 files
      if (this.stats.filesProcessed % 50 === 0) {
        this.printProgress();
      }
    }

    // Final summary
    this.printFinalSummary();
  }

  printFinalSummary() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;

    console.log('\\n🎯 Self-Referential Year Fixing Complete!');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Final Results:`);
    console.log(`  • Total files processed: ${this.stats.filesProcessed}`);
    console.log(`  • Files modified: ${this.stats.filesModified}`);
    console.log(`  • Total fixes applied: ${this.stats.fixesApplied}`);
    console.log(`  • Errors encountered: ${this.stats.errors}`);
    console.log(`  • Success rate: ${((this.stats.filesProcessed - this.stats.errors) / this.stats.filesProcessed * 100).toFixed(1)}%`);
    console.log(`  • Duration: ${(elapsed / 60).toFixed(1)} minutes`);
    console.log(`  • Rate: ${(this.stats.filesProcessed / elapsed * 60).toFixed(1)} files/minute`);
    
    if (this.dryRun) {
      console.log(`\\n🔍 DRY RUN completed - no files were actually modified`);
      console.log(`🚀 Run without --dry-run to apply ${this.stats.fixesApplied} fixes`);
    } else {
      console.log(`\\n✅ ${this.stats.fixesApplied} self-referential years added successfully!`);
      console.log(`🎬 Nuclear static files now have consistent year formatting`);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n\\n🛑 Gracefully shutting down...');
  if (global.yearFixer) {
    global.yearFixer.printProgress();
  }
  process.exit(0);
});

// Run the fixer
const yearFixer = new SelfReferentialYearFixer();
global.yearFixer = yearFixer; // For graceful shutdown
yearFixer.run().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});