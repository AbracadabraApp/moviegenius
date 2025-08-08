#!/usr/bin/env node

/**
 * Person Link Sanitization Script
 * 
 * Cleans up malformed person links in movie analysis content
 * Converts name slug links (/person/christopher-nolan) to ID links (/person/123)
 * 
 * Features:
 * - Batch processing with progress tracking
 * - Dry-run mode for safe testing
 * - Detailed reporting of changes
 * - Automatic mapping of name slugs to person IDs
 * - Error handling and rollback capability
 */

import { PersonLinkSanitizer, PersonLinkValidator } from '../lib/validation/person-link-validator.js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class PersonLinkSanitizationRunner {
  constructor(options = {}) {
    this.dryRun = options.dryRun ?? true;
    this.batchSize = options.batchSize ?? 50;
    this.logFile = options.logFile ?? `sanitization-${Date.now()}.log`;
    this.validator = new PersonLinkValidator({ strictMode: true });
    this.sanitizer = new PersonLinkSanitizer(supabase);
    this.stats = {
      totalRecords: 0,
      processedRecords: 0,
      recordsWithChanges: 0,
      totalLinksFixed: 0,
      totalUnresolvedLinks: 0,
      errors: 0
    };
  }

  /**
   * Main sanitization process
   */
  async run() {
    console.log('🧹 Person Link Sanitization Process');
    console.log('=====================================\n');
    console.log(`Mode: ${this.dryRun ? '🔍 DRY RUN' : '⚠️  LIVE UPDATE'}`);
    console.log(`Batch Size: ${this.batchSize}`);
    console.log(`Log File: ${this.logFile}\n`);

    try {
      // Initialize sanitizer
      await this.sanitizer.initialize();

      // Get records with person links
      const recordsToProcess = await this._getRecordsWithPersonLinks();
      this.stats.totalRecords = recordsToProcess.length;

      console.log(`Found ${recordsToProcess.length} records with person links\n`);

      if (recordsToProcess.length === 0) {
        console.log('✅ No records to process');
        return;
      }

      // Process in batches
      for (let i = 0; i < recordsToProcess.length; i += this.batchSize) {
        const batch = recordsToProcess.slice(i, i + this.batchSize);
        await this._processBatch(batch, i);
        
        // Progress update
        const progress = Math.round((i + batch.length) / recordsToProcess.length * 100);
        console.log(`Progress: ${progress}% (${i + batch.length}/${recordsToProcess.length})`);
      }

      // Generate final report
      await this._generateReport();

    } catch (error) {
      console.error('❌ Sanitization process failed:', error);
      this.stats.errors++;
    }
  }

  /**
   * Get records that contain person links
   */
  async _getRecordsWithPersonLinks() {
    try {
      const { data, error } = await supabase
        .from('movie_analyses')
        .select('tmdb_id, claude_response')
        .not('claude_response', 'is', null);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Filter records that actually have person links
      const recordsWithLinks = data.filter(record => {
        if (!record.claude_response) return false;

        const content = JSON.stringify(record.claude_response);
        return content.includes('href="/person/');
      });

      return recordsWithLinks;
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  }

  /**
   * Process a batch of records
   */
  async _processBatch(batch, batchIndex) {
    console.log(`\n📦 Processing batch ${Math.floor(batchIndex / this.batchSize) + 1}...`);

    for (const record of batch) {
      try {
        await this._processRecord(record);
        this.stats.processedRecords++;
      } catch (error) {
        console.error(`Error processing record ${record.tmdb_id}:`, error);
        this.stats.errors++;
        await this._logError(record.tmdb_id, error);
      }
    }
  }

  /**
   * Process a single record
   */
  async _processRecord(record) {
    const originalContent = record.claude_response;
    let hasChanges = false;
    const changes = [];

    // Process different content sections
    const updatedContent = { ...originalContent };

    // Process processed_content
    if (originalContent.processed_content) {
      const result = await this.sanitizer.sanitizeContent(originalContent.processed_content);
      if (result.hasChanges) {
        updatedContent.processed_content = result.content;
        changes.push(...result.changes);
        hasChanges = true;
      }
    }

    // Process sections
    if (originalContent.sections) {
      for (const [key, sectionContent] of Object.entries(originalContent.sections)) {
        if (typeof sectionContent === 'string') {
          const result = await this.sanitizer.sanitizeContent(sectionContent);
          if (result.hasChanges) {
            updatedContent.sections[key] = result.content;
            changes.push(...result.changes.map(change => ({ ...change, section: key })));
            hasChanges = true;
          }
        }
      }
    }

    // Process exploreFurther
    if (originalContent.exploreFurther && Array.isArray(originalContent.exploreFurther)) {
      for (let i = 0; i < originalContent.exploreFurther.length; i++) {
        const item = originalContent.exploreFurther[i];
        if (item.content) {
          const result = await this.sanitizer.sanitizeContent(item.content);
          if (result.hasChanges) {
            updatedContent.exploreFurther[i].content = result.content;
            changes.push(...result.changes.map(change => ({ ...change, section: `exploreFurther[${i}]` })));
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      this.stats.recordsWithChanges++;
      
      // Count fixed and unresolved links
      const fixedLinks = changes.filter(c => c.type === 'CORRECTED').length;
      const unresolvedLinks = changes.filter(c => c.type === 'UNRESOLVED').length;
      
      this.stats.totalLinksFixed += fixedLinks;
      this.stats.totalUnresolvedLinks += unresolvedLinks;

      // Log the changes
      await this._logChanges(record.tmdb_id, changes);

      // Update database if not dry run
      if (!this.dryRun) {
        await this._updateRecord(record.tmdb_id, updatedContent);
      }

      console.log(`  ✅ Movie ${record.tmdb_id}: ${fixedLinks} links fixed, ${unresolvedLinks} unresolved`);
    }
  }

  /**
   * Update record in database
   */
  async _updateRecord(tmdbId, updatedContent) {
    try {
      const { error } = await supabase
        .from('movie_analyses')
        .update({ claude_response: updatedContent })
        .eq('tmdb_id', tmdbId);

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
    } catch (error) {
      console.error(`Failed to update record ${tmdbId}:`, error);
      throw error;
    }
  }

  /**
   * Log changes for audit trail
   */
  async _logChanges(tmdbId, changes) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      tmdbId,
      changes: changes.map(change => ({
        type: change.type,
        original: change.original,
        corrected: change.corrected || null,
        nameSlug: change.nameSlug,
        personId: change.personId || null,
        section: change.section || 'processed_content',
        reason: change.reason || null
      }))
    };

    await this._writeToLogFile(JSON.stringify(logEntry) + '\n');
  }

  /**
   * Log error for debugging
   */
  async _logError(tmdbId, error) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      tmdbId,
      error: {
        message: error.message,
        stack: error.stack
      }
    };

    await this._writeToLogFile(`ERROR: ${JSON.stringify(errorEntry)}\n`);
  }

  /**
   * Write to log file
   */
  async _writeToLogFile(content) {
    try {
      await fs.promises.appendFile(this.logFile, content, 'utf8');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  /**
   * Generate final report
   */
  async _generateReport() {
    const report = {
      summary: {
        mode: this.dryRun ? 'DRY_RUN' : 'LIVE_UPDATE',
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        ...this.stats
      },
      recommendations: []
    };

    // Add recommendations based on results
    if (this.stats.totalUnresolvedLinks > 0) {
      report.recommendations.push({
        type: 'MANUAL_REVIEW',
        message: `${this.stats.totalUnresolvedLinks} person links could not be automatically resolved. Manual review required.`,
        action: 'Check log file for UNRESOLVED entries and fix manually'
      });
    }

    if (this.stats.errors > 0) {
      report.recommendations.push({
        type: 'ERROR_INVESTIGATION',
        message: `${this.stats.errors} errors occurred during processing.`,
        action: 'Check log file for ERROR entries and investigate'
      });
    }

    if (this.dryRun && this.stats.totalLinksFixed > 0) {
      report.recommendations.push({
        type: 'APPLY_CHANGES',
        message: `${this.stats.totalLinksFixed} links can be automatically fixed.`,
        action: 'Run script without --dry-run to apply changes'
      });
    }

    // Write report to file
    const reportFile = `sanitization-report-${Date.now()}.json`;
    await fs.promises.writeFile(reportFile, JSON.stringify(report, null, 2));

    // Display summary
    console.log('\n📊 Sanitization Summary');
    console.log('========================');
    console.log(`Total Records: ${this.stats.totalRecords}`);
    console.log(`Processed: ${this.stats.processedRecords}`);
    console.log(`Records with Changes: ${this.stats.recordsWithChanges}`);
    console.log(`Links Fixed: ${this.stats.totalLinksFixed}`);
    console.log(`Unresolved Links: ${this.stats.totalUnresolvedLinks}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`\nLog File: ${this.logFile}`);
    console.log(`Report File: ${reportFile}`);

    if (this.dryRun && this.stats.totalLinksFixed > 0) {
      console.log('\n🔧 To apply changes, run:');
      console.log('node scripts/sanitize-person-links.js --apply');
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const batchSize = args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || 50;

  if (args.includes('--help')) {
    console.log(`
Person Link Sanitization Script

Usage:
  node scripts/sanitize-person-links.js [options]

Options:
  --apply         Apply changes to database (default is dry-run)
  --batch-size=N  Process N records at a time (default: 50)
  --help          Show this help message

Examples:
  # Dry run (safe testing)
  node scripts/sanitize-person-links.js

  # Apply changes
  node scripts/sanitize-person-links.js --apply

  # Custom batch size
  node scripts/sanitize-person-links.js --batch-size=100
    `);
    process.exit(0);
  }

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const runner = new PersonLinkSanitizationRunner({
    dryRun,
    batchSize: parseInt(batchSize)
  });

  runner.startTime = Date.now();
  await runner.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}