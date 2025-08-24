# Movie Linking System Issue - Component Not Using Processed Content

## Problem Summary

The movie linking system stores HTML links (`<a href="/movie/123">Movie Title</a>`) in the database `processed_content` field, but the React component displays markdown patterns (`**Movie Title**`) instead. Investigation reveals the component never uses `processed_content` - it always falls back to `raw_content`.

## Key Evidence

1. **Database contains valid HTML links**: `processed_content` has `<a href="/movie/154">Star Trek II</a>` 
2. **Browser shows markdown patterns**: Page displays `**Star Trek II**` instead of clickable links
3. **Placeholder test failed**: Cannot get any processed_content text to appear on page
4. **Component always uses raw_content**: Falls back regardless of processed_content contents

## Root Cause

The component's conditional logic for using `processed_content` is failing:

```javascript
const hasProcessedContent = processedJsonData && processedJsonData.content && processedJsonData.content[textIndex];
```

This evaluates to `false`, so the component never renders processed content with HTML links.

## Technical Analysis

### Current Data Flow:
1. **Batch script** creates HTML links and stores in `processed_content` with HTML entity encoding
2. **API** returns both `raw_content` and `processed_content` fields  
3. **Component** attempts `JSON.parse(processedContent)` on line 72
4. **Parsing fails** due to JSON structure issues (line 82: `processedAnalysisData = null`)
5. **Conditional check fails** on line 912: `processedJsonData` is null
6. **Component falls back** to `raw_content` with markdown patterns

### The Critical Issue:
**Line 912**: `const hasProcessedContent = processedJsonData && processedJsonData.content && processedJsonData.content[textIndex];`

Since `processedJsonData` is null (due to parsing failure), this condition is always false, causing the component to never use processed content regardless of what's stored in the database.

### Required Fix:
The component's JSON parsing logic needs to handle the HTML entity-encoded content structure that the batch script creates, or the batch script needs to store processed content in a format the component can parse.

---

## File Contents

### 1. Batch Script: `/scripts/linking/production/process-movie-analysis-links.js`

```javascript
#!/usr/bin/env node
/**
 * Production Movie Analysis Link Processor
 * 
 * Uses the universal movie-analysis-linker.js system to process Railway database analyses.
 * Links both movies (**Movie Title** patterns) and contributors (using contributors_json data).
 * No quality scoring - processes all analyses that need links.
 * 
 * Usage:
 *   node scripts/linking/production/process-movie-analysis-links.js [--limit=100] [--dry-run]
 * 
 * Features:
 * - Uses lib/movie-analysis-linker.js (the correct implementation)
 * - Processes movies and contributors equally without discrimination  
 * - Uses contributors_json field with personId values
 * - Creates /movie/TMDB_ID and /person/ID format links
 * - Updates has_links and link_count fields properly
 */

import { getPool } from '../../../lib/railway-db.js';
import { processAnalysisContent } from '../../../lib/movie-analysis-linker.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

// Speed optimization caches
const movieCache = new Map(); // title+year -> movie data
const personCache = new Map(); // name -> person data

async function processMovieAnalysisLinks() {
  console.log('🎬 Production Movie Analysis Link Processor - Optimized');
  console.log('====================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Limit: ${limit} analyses`);
  console.log(`Using: lib/movie-analysis-linker.js (Universal Linker)`);
  console.log(`Optimizations: Movie/Person caching, Preloaded contributors, Single JSON parse\n`);

  const pool = getPool();
  
  try {
    // Get analyses that need linking - NO QUALITY SCORING
    const query = `
      SELECT 
        ma.id,
        ma.movie_id,
        ma.claude_response,
        ma.has_links,
        ma.link_count,
        m.title,
        m.year,
        m.tmdb_id,
        m.contributors_json
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response IS NOT NULL
        AND (ma.has_links = false OR ma.has_links IS NULL OR ma.link_count = 0 OR ma.link_count IS NULL)
      ORDER BY m.tmdb_id ASC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    console.log(`📋 Found ${result.rows.length} analyses to process\n`);
    
    if (result.rows.length === 0) {
      console.log('✅ No analyses need processing');
      return;
    }

    // OPTIMIZATION 2: Parse all JSON upfront (single parse per analysis)
    const parsedAnalyses = result.rows.map(analysis => {
      let rawContent = analysis.claude_response;
      if (typeof rawContent === 'string') {
        try {
          rawContent = JSON.parse(rawContent);
        } catch (error) {
          console.warn(`⚠️ JSON parse error for analysis ${analysis.id}:`, error.message);
          rawContent = { raw_content: analysis.claude_response };
        }
      }
      return { ...analysis, parsedContent: rawContent };
    });

    let processed = 0;
    let totalMovieLinks = 0;
    let totalContributorLinks = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const analysis of parsedAnalyses) {
      console.log(`\n[${processed + 1}/${parsedAnalyses.length}] Processing: ${analysis.title} (${analysis.year}) - TMDB: ${analysis.tmdb_id}`);
      
      try {
        // OPTIMIZATION 1: Contributors JSON already preloaded from query
        // Create KEY_CONTRIBUTORS format from preloaded contributors_json
        let keyContributorsString = '';
        if (analysis.contributors_json) {
          const contributors = analysis.contributors_json;
          const parts = [];
          
          Object.keys(contributors).forEach(role => {
            if (contributors[role] && Array.isArray(contributors[role])) {
              const names = contributors[role].map(c => c.name || c).join(', ');
              const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
              parts.push(`${roleCapitalized}: ${names}`);
            }
          });
          
          if (parts.length > 0) {
            keyContributorsString = `KEY_CONTRIBUTORS: ${parts.join(', ')}`;
          }
        }
        
        // ARCHITECTURAL FIX: Handle both legacy and modern JSON structures properly
        const rawContent = analysis.parsedContent;
        let processedSections = [];
        let analysisIsJson = false;
        
        // Check if this is modern JSON format with structured content
        if (rawContent.raw_content && typeof rawContent.raw_content === 'object' && rawContent.raw_content.content) {
          analysisIsJson = true;
          console.log('   📋 Processing JSON-structured analysis');
          
          // Process each content section individually to preserve structure
          for (const section of rawContent.raw_content.content) {
            if (section.text && section.text.trim().length > 0) {
              const processedText = await processAnalysisContent(
                section.text,
                `${analysis.title} (${analysis.year})`,
                'JSON section processing',
                keyContributorsString,
                {
                  processMovies: true,
                  processContributors: false, // TEMPORARILY DISABLED for testing
                  dbClient: pool,
                  movieCache: movieCache,
                  personCache: personCache
                }
              );
              
              processedSections.push({
                ...section,
                text: processedText
              });
            } else {
              processedSections.push(section);
            }
          }
        } else {
          // Legacy text format - process as single block
          let analysisText = '';
          
          if (rawContent.processed_content) {
            analysisText = rawContent.processed_content;
          } else if (rawContent.raw_content) {
            if (typeof rawContent.raw_content === 'string') {
              analysisText = rawContent.raw_content;
            }
          }

          if (!analysisText || analysisText.trim().length === 0) {
            console.log('   ⚠️ No analysis text found');
            continue;
          }
          
          // Process the text content
          processedSections = await processAnalysisContent(
            analysisText,
            `${analysis.title} (${analysis.year})`,
            'Legacy text processing',
            keyContributorsString,
            {
              processMovies: true,
              processContributors: false, // TEMPORARILY DISABLED for testing
              dbClient: pool,
              movieCache: movieCache,
              personCache: personCache
            }
          );
        }

        // Count links in processed content
        let movieLinks = 0;
        let contributorLinks = 0;
        
        if (analysisIsJson) {
          // Count links in all processed sections
          processedSections.forEach(section => {
            if (section.text) {
              movieLinks += (section.text.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
              contributorLinks += (section.text.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
            }
          });
        } else {
          // Legacy format - count in single processed content
          movieLinks = (processedSections.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
          contributorLinks = (processedSections.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
        }
        
        const totalLinks = movieLinks + contributorLinks;
        console.log(`   🔗 Added ${movieLinks} movie links, ${contributorLinks} contributor links`);

        if (!dryRun) {
          // ARCHITECTURAL FIX: Escape HTML quotes before JSON storage
          let processedSectionsWithEscapedHtml;
          
          if (analysisIsJson) {
            // For JSON format: escape quotes in each section's text
            processedSectionsWithEscapedHtml = processedSections.map(section => ({
              ...section,
              text: section.text ? section.text.replace(/"/g, '&quot;') : section.text
            }));
          } else {
            // For legacy format: escape quotes in the processed content string
            processedSectionsWithEscapedHtml = processedSections.replace(/"/g, '&quot;');
          }
          
          // Store processed content in the correct structure
          let updatedClaudeResponse;
          
          if (analysisIsJson) {
            // JSON format: replace content sections with processed versions
            updatedClaudeResponse = {
              ...rawContent,
              processed_content: {
                ...rawContent.raw_content,
                content: processedSectionsWithEscapedHtml
              }
            };
          } else {
            // Legacy format: store processed HTML directly as processed_content
            updatedClaudeResponse = {
              ...rawContent,
              processed_content: processedSectionsWithEscapedHtml
            };
          }

          await pool.query(`
            UPDATE movie_analyses 
            SET 
              claude_response = $1,
              has_links = $2,
              link_count = $3,
              updated_at = NOW()
            WHERE id = $4
          `, [
            JSON.stringify(updatedClaudeResponse),
            totalLinks > 0,
            totalLinks,
            analysis.id
          ]);

          console.log(`   ✅ Updated database - total links: ${totalLinks}`);
        } else {
          console.log(`   🔍 DRY RUN - would add ${totalLinks} total links`);
        }

        totalMovieLinks += movieLinks;
        totalContributorLinks += contributorLinks;
        processed++;

      } catch (error) {
        console.error(`   ❌ Error processing analysis: ${error.message}`);
      }
    }

    // Final summary with cache statistics
    console.log(`\n📊 Processing Complete:`);
    console.log(`  • Processed: ${processed}`);
    console.log(`  • Movie links added: ${totalMovieLinks}`);
    console.log(`  • Contributor links added: ${totalContributorLinks}`);
    console.log(`  • Total links: ${totalMovieLinks + totalContributorLinks}`);
    console.log(`  • Cache performance: ${cacheHits} hits, ${cacheMisses} misses (${cacheHits > 0 ? Math.round((cacheHits / (cacheHits + cacheMisses)) * 100) : 0}% hit rate)`);
    console.log(`  • Movie cache size: ${movieCache.size}, Person cache size: ${personCache.size}`);
    console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Database updated'}`);

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processMovieAnalysisLinks()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 FATAL ERROR:', error.message);
      process.exit(1);
    });
}

export { processMovieAnalysisLinks };
```

### 2. React Component Key Sections: `/components/MovieAnalysisWithEntities.js`

#### Processing Logic (Lines 49-84):

```javascript
const processAnalysisContent = async () => {
  const processingStart = performance.now();
  
  try {

    const rawContent = analysis.claude_response.raw_content;
    const processedContent = analysis.claude_response.processed_content;

    // Check if content is JSON format (new structure)
    let analysisData;
    let processedAnalysisData = null;
    
    try {
      analysisData = JSON.parse(rawContent);
      console.log('✅ Detected JSON format analysis');
    } catch (e) {
      console.log('📝 Using legacy text format analysis');
      analysisData = null;
    }

    // Parse processed content if available (for HTML links)
    if (processedContent) {
      try {
        processedAnalysisData = JSON.parse(processedContent);
        console.log('🔗 Processed content with HTML links available');
      } catch (e) {
        console.log('⚠️ Processed content parsing failed - malformed JSON with unescaped HTML quotes');
        console.log('🔍 Error:', e.message);
        console.log('🔍 First 200 chars:', processedContent.substring(0, 200));
        
        // ARCHITECTURAL ISSUE: processed_content contains HTML with unescaped quotes
        // This needs to be fixed in the batch script, not here
        // For now, skip the processed content and use raw content only
        processedAnalysisData = null;
      }
    }

    if (analysisData) {
      // New JSON format processing
      console.log('🔍 JSON Analysis Debug:', {
        hasContent: !!analysisData.content,
        contentLength: analysisData.content?.length || 0,
        hasFeaturedMovies: !!analysisData.featuredMovies,
        featuredMoviesLength: analysisData.featuredMovies?.length || 0,
        hasExploreTopics: !!analysisData.exploreTopics,
        exploreTopicsLength: analysisData.exploreTopics?.length || 0,
        hasMoreIdeas: !!analysisData.moreIdeas,
        moreIdeasLength: analysisData.moreIdeas?.length || 0
      });
```

#### Rendering Logic (Lines 910-930):

```javascript
// Add text section (immediately after its header)
// Use processed content if available (contains HTML links), otherwise use EntityLinkedText
const hasProcessedContent = processedJsonData && processedJsonData.content && processedJsonData.content[textIndex];
const textToRender = hasProcessedContent ? processedJsonData.content[textIndex].text : section.text;

content.push(
  <div key={`json-text-${textIndex}`} style={{...styles.paragraph, paddingTop: textIndex === 0 ? '16px' : '0'}} data-testid={`section-${section.type}`}>
    <ErrorBoundary level="section">
      {hasProcessedContent ? (
        <div dangerouslySetInnerHTML={{ __html: textToRender.replace(/&quot;/g, '"') }} />
      ) : (
        <EntityLinkedText
          text={textToRender}
          linkingIntensity={linkingIntensity}
          context="movie-analysis"
          currentEntity={{
            type: 'movie',
            slug: movie?.slug,
            title: movie?.title,
          }}
```

## Database Evidence

### Sample processed_content from TMDB 152:

```json
{
  "metadata": {
    "title": "Star Trek: The Motion Picture",
    "year": 1979,
    ...
  },
  "whyWatch": {
    "recommendation": "NO",
    "reasons": [
      "Watch <a href=&quot;/movie/154&quot; class=&quot;movie-title&quot; data-tmdb-id=&quot;154&quot;>Star Trek II: The Wrath of Khan</a> (1982) instead for a more compelling Trek film experience"
    ]
  },
  "content": [
    {
      "type": "performancesAndVision",
      "text": "Robert Wise, known for <a href=&quot;/movie/828&quot; class=&quot;movie-title&quot; data-tmdb-id=&quot;828&quot;>The Day the Earth Stood Still</a> (1951), brings a serious, contemplative tone..."
    }
  ]
}
```

**Note**: The processed_content contains valid HTML links but uses `&quot;` entity encoding, which appears to be causing JSON parsing issues in the React component.

## Summary

The batch script successfully creates HTML links and stores them with entity encoding, but the React component cannot parse this format. The component's `processedJsonData` remains null, causing it to always fall back to raw_content with markdown patterns instead of using the processed HTML links.