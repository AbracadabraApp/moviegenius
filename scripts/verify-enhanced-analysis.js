#!/usr/bin/env node

/**
 * Enhanced Analysis Verification Script
 *
 * Validates the structure and quality of generated enhanced analyses
 * Run this after the test phase to verify before scaling up
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verifyEnhancedAnalyses() {
  console.log('🔍 ENHANCED ANALYSIS VERIFICATION');
  console.log('=================================\n');

  const client = await pool.connect();

  try {
    // Check record count
    const countResult = await client.query('SELECT COUNT(*) FROM enhanced_analyses');
    const totalCount = parseInt(countResult.rows[0].count);

    console.log(`📊 Total enhanced analyses: ${totalCount}`);

    if (totalCount === 0) {
      console.log('❌ No enhanced analyses found - run batch script first\n');
      return;
    }

    // Get recent analyses for inspection (show more to verify batch processing)
    const sampleResult = await client.query(`
      SELECT
        ea.tmdb_id,
        ea.sections,
        ea.key_elements,
        ea.created_at,
        m.title,
        m.year
      FROM enhanced_analyses ea
      LEFT JOIN movies m ON ea.tmdb_id = m.tmdb_id
      ORDER BY ea.created_at DESC
      LIMIT 10
    `);

    console.log(`\n📋 STRUCTURE VALIDATION (${sampleResult.rows.length} recent samples):`);
    console.log('=' .repeat(60));

    let validCount = 0;
    let issues = [];

    sampleResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.title || 'Unknown'} (${row.year || 'Unknown'}) - TMDB:${row.tmdb_id}`);
      console.log(`   Created: ${row.created_at?.toISOString().split('T')[0]}`);

      // Verify it was saved in database
      console.log(`   📂 Database status: ✅ SAVED in enhanced_analyses table`);

      try {
        const sections = row.sections;
        const keyElements = row.key_elements;

        // Validate sections structure
        if (sections && sections.content && Array.isArray(sections.content)) {
          const contentSections = sections.content;
          console.log(`   ✅ Content sections: ${contentSections.length}`);

          if (contentSections.length === 4) {
            console.log(`   ✅ Correct 4-part structure`);

            // Check subheads
            const subheads = contentSections.map(section => section.subhead);
            const hasSubheads = subheads.every(subhead => subhead && subhead.length > 0);

            if (hasSubheads) {
              console.log(`   ✅ All sections have subheads:`);
              subheads.forEach((subhead, i) => {
                const wordCount = contentSections[i].text ? contentSections[i].text.split(' ').length : 0;
                console.log(`      ${i+1}. "${subhead}" (${wordCount} words)`);
              });

              // Check for generic vs contextual subheads
              const genericSubheads = ['Plot Summary', 'Acting', 'Direction', 'Cultural Impact', 'Technical Elements'];
              const hasGeneric = subheads.some(subhead =>
                genericSubheads.some(generic => subhead.includes(generic))
              );

              if (!hasGeneric) {
                console.log(`   ✅ Contextual subheads (not generic)`);
              } else {
                console.log(`   ⚠️  Some generic subheads detected`);
                issues.push(`${row.title}: Generic subheads`);
              }

            } else {
              console.log(`   ❌ Missing subheads`);
              issues.push(`${row.title}: Missing subheads`);
            }

            // Check word counts
            const totalWords = contentSections.reduce((sum, section) => {
              return sum + (section.text ? section.text.split(' ').length : 0);
            }, 0);

            const targetMin = 375;
            const targetMax = 425;

            if (totalWords >= targetMin && totalWords <= targetMax) {
              console.log(`   ✅ Word count: ${totalWords} (target: ${targetMin}-${targetMax})`);
            } else {
              console.log(`   ⚠️  Word count: ${totalWords} (target: ${targetMin}-${targetMax})`);
              if (totalWords < targetMin - 50 || totalWords > targetMax + 50) {
                issues.push(`${row.title}: Word count ${totalWords} outside acceptable range`);
              }
            }

          } else {
            console.log(`   ❌ Wrong section count: ${contentSections.length} (expected: 4)`);
            issues.push(`${row.title}: Wrong section count (${contentSections.length})`);
          }

          // Check metadata
          if (sections.metadata) {
            console.log(`   ✅ Has metadata: ${Object.keys(sections.metadata).join(', ')}`);
          }

          // Check featured movies
          if (sections.featuredMovies && sections.featuredMovies.length > 0) {
            console.log(`   ✅ Featured movies: ${sections.featuredMovies.length}`);
          }

          validCount++;

        } else {
          console.log(`   ❌ Invalid sections structure`);
          issues.push(`${row.title}: Invalid sections structure`);
        }

        // Check key elements
        if (keyElements && typeof keyElements === 'object') {
          const elementKeys = Object.keys(keyElements);
          console.log(`   ✅ Key elements: ${elementKeys.join(', ')}`);
        } else {
          console.log(`   ⚠️  No key elements`);
        }

      } catch (error) {
        console.log(`   ❌ Parse error: ${error.message}`);
        issues.push(`${row.title}: Parse error - ${error.message}`);
      }
    });

    // Summary
    console.log(`\n📊 VERIFICATION SUMMARY`);
    console.log('=' .repeat(30));
    console.log(`✅ Valid analyses: ${validCount}/${sampleResult.rows.length}`);
    console.log(`❌ Issues found: ${issues.length}`);

    if (issues.length > 0) {
      console.log(`\n⚠️  ISSUES DETECTED:`);
      issues.forEach((issue, i) => console.log(`   ${i+1}. ${issue}`));
    }

    // Recommendation
    console.log(`\n🎯 RECOMMENDATION:`);
    if (validCount === sampleResult.rows.length && issues.length === 0) {
      console.log(`✅ PROCEED WITH SCALING - All analyses look good!`);
      console.log(`💡 Ready to continue with 100, 1000, 10000, 10000 phases`);
    } else if (validCount >= sampleResult.rows.length * 0.8) {
      console.log(`⚠️  CAUTION - Some issues but mostly working`);
      console.log(`💡 Consider proceeding with small batch (100) for further validation`);
    } else {
      console.log(`❌ ISSUES DETECTED - Review and fix before scaling`);
      console.log(`💡 Check prompt configuration and model responses`);
    }

    console.log(`\n🔧 TO CONTINUE:`);
    console.log(`   node --env-file=.env.local scripts/batch-enhanced-analysis-haiku.js`);

  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifyEnhancedAnalyses().catch(console.error);