#!/usr/bin/env node

/**
 * Batch Why Watch Link Processor
 *
 * Links person names in all Why Watch recommendations
 * - Processes 19,954 Why Watch records
 * - Links possessive forms (Name's) and full names
 * - Uses exact matching only
 * - Updates enhanced_why_watch table with linked_reasons column
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15
});

/**
 * Link person names in Why Watch reasons
 */
async function linkWhyWatchReasons(reasons, client) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return { linked: reasons, stats: { attempted: 0, successful: 0, failed: 0 } };
  }

  const linkedReasons = [];
  let attempted = 0;
  let successful = 0;
  let failed = 0;

  for (const reason of reasons) {
    let linkedReason = reason;

    // Pattern 1: Possessive form (Name's) - captures 1-3 capitalized words
    const possessivePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})'s\b/g;
    const possessiveMatches = [...reason.matchAll(possessivePattern)];

    for (const match of possessiveMatches) {
      const fullMatch = match[0];
      const personName = match[1];
      attempted++;

      try {
        const personResult = await client.query(
          'SELECT id, name FROM persons WHERE name = $1 LIMIT 1',
          [personName]
        );

        if (personResult.rows.length > 0) {
          const person = personResult.rows[0];
          const link = `<a href="/person/${person.id}" class="person-name">${personName}</a>'s`;
          linkedReason = linkedReason.replace(fullMatch, link);
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    // Pattern 2: Full names without possessive
    if (!reason.includes("'s")) {
      const fullNamePattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
      const fullNameMatches = [...reason.matchAll(fullNamePattern)];

      for (const match of fullNameMatches) {
        const personName = match[1];
        attempted++;

        try {
          const personResult = await client.query(
            'SELECT id, name FROM persons WHERE name = $1 LIMIT 1',
            [personName]
          );

          if (personResult.rows.length > 0) {
            const person = personResult.rows[0];
            const link = `<a href="/person/${person.id}" class="person-name">${personName}</a>`;
            linkedReason = linkedReason.replace(personName, link);
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }
    }

    linkedReasons.push(linkedReason);
  }

  return { linked: linkedReasons, stats: { attempted, successful, failed } };
}

/**
 * Process a batch of Why Watch records
 */
async function processBatch(records, batchNum, totalBatches) {
  const results = await Promise.all(
    records.map(async (record) => {
      const client = await pool.connect();
      try {
        const reasons = typeof record.reasons === 'string'
          ? JSON.parse(record.reasons)
          : record.reasons;

        const linkResult = await linkWhyWatchReasons(reasons, client);

        // Update database with linked reasons
        await client.query(`
          UPDATE enhanced_why_watch
          SET
            linked_reasons = $1,
            has_links = $2,
            link_count = $3,
            updated_at = NOW()
          WHERE id = $4
        `, [
          JSON.stringify(linkResult.linked),
          linkResult.stats.successful > 0,
          linkResult.stats.successful,
          record.id
        ]);

        return {
          success: true,
          ...linkResult.stats
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          attempted: 0,
          successful: 0,
          failed: 0
        };
      } finally {
        client.release();
      }
    })
  );

  return results;
}

/**
 * Main batch processing
 */
async function main() {
  console.log('🔗 Why Watch Batch Link Processor');
  console.log('=================================\n');

  try {
    // Add linked_reasons column if it doesn't exist
    console.log('📋 Ensuring database schema...');
    await pool.query(`
      ALTER TABLE enhanced_why_watch
      ADD COLUMN IF NOT EXISTS linked_reasons JSONB,
      ADD COLUMN IF NOT EXISTS has_links BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS link_count INTEGER DEFAULT 0
    `);
    console.log('✅ Schema ready\n');

    // Get all Why Watch records
    const countResult = await pool.query('SELECT COUNT(*) as total FROM enhanced_why_watch');
    const total = parseInt(countResult.rows[0].total);

    console.log(`📊 Found ${total.toLocaleString()} Why Watch records to process\n`);

    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(total / BATCH_SIZE);

    let processed = 0;
    let totalAttempted = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalErrors = 0;

    const startTime = Date.now();

    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1;

      // Get batch
      const result = await pool.query(`
        SELECT id, tmdb_id, reasons
        FROM enhanced_why_watch
        ORDER BY id
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      // Process batch
      const results = await processBatch(result.rows, batchNum, totalBatches);

      // Update stats
      results.forEach(r => {
        if (r.success) {
          totalAttempted += r.attempted;
          totalSuccessful += r.successful;
          totalFailed += r.failed;
        } else {
          totalErrors++;
        }
      });

      processed += result.rows.length;

      // Progress update every 10 batches
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = processed / elapsed;
        const remaining = total - processed;
        const eta = Math.round(remaining / rate);
        const pct = ((processed / total) * 100).toFixed(1);

        console.log(`[Batch ${batchNum}/${totalBatches}] ${pct}% complete`);
        console.log(`  Processed: ${processed.toLocaleString()}/${total.toLocaleString()}`);
        console.log(`  Links: ${totalSuccessful.toLocaleString()} successful, ${totalFailed.toLocaleString()} failed`);
        console.log(`  Rate: ${rate.toFixed(1)} records/sec | ETA: ${Math.floor(eta/60)}m ${eta%60}s\n`);
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    // Final summary
    console.log('\n🎉 BATCH LINKING COMPLETE!');
    console.log('==========================');
    console.log(`Total processed: ${processed.toLocaleString()}`);
    console.log(`Link attempts: ${totalAttempted.toLocaleString()}`);
    console.log(`Successful links: ${totalSuccessful.toLocaleString()}`);
    console.log(`Failed lookups: ${totalFailed.toLocaleString()}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Success rate: ${totalAttempted > 0 ? ((totalSuccessful/totalAttempted)*100).toFixed(1) : 0}%`);
    console.log(`Total time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`);
    console.log(`Rate: ${(processed/totalTime).toFixed(1)} records/sec`);

    // Verify database
    const finalCount = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE has_links = true) as with_links,
        SUM(link_count) as total_links
      FROM enhanced_why_watch
    `);

    console.log('\n📊 Final Database State:');
    console.log(`  Total records: ${finalCount.rows[0].total}`);
    console.log(`  Records with links: ${finalCount.rows[0].with_links}`);
    console.log(`  Total links: ${finalCount.rows[0].total_links}`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
main().catch(console.error);
