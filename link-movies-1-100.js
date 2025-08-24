#!/usr/bin/env node

import { getPool } from './lib/railway-db.js';
import { processAnalysisContent } from './lib/movie-analysis-linker.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

async function linkMovies1to100() {
  console.log('🎬 Linking Movies 1-100 with Direct HTML Approach');
  console.log('================================================\n');

  const pool = getPool();
  
  try {
    // Get analyses for movies with TMDB IDs 1-100
    const result = await pool.query(`
      SELECT 
        ma.id as analysis_id,
        ma.claude_response,
        m.id as movie_id,
        m.title,
        m.year,
        m.tmdb_id,
        m.contributors_json
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response IS NOT NULL
        AND m.tmdb_id BETWEEN 1 AND 100
        AND (ma.has_links = false OR ma.has_links IS NULL)
      ORDER BY m.tmdb_id ASC
    `);

    console.log(`Found ${result.rows.length} analyses to process\n`);

    if (result.rows.length === 0) {
      console.log('✅ No analyses need processing');
      return;
    }

    let processed = 0;
    let totalMovieLinks = 0;
    let totalContributorLinks = 0;
    let errors = 0;

    for (const analysis of result.rows) {
      const movieTitle = `${analysis.title} (${analysis.year})`;
      
      console.log(`\n[${processed + 1}/${result.rows.length}] Processing: ${movieTitle} - TMDB: ${analysis.tmdb_id}`);
      console.log('─'.repeat(60));

      try {
        // Parse the analysis content
        let analysisData = analysis.claude_response;
        if (typeof analysisData === 'string') {
          analysisData = JSON.parse(analysisData);
        }

        // Create contributors string if available
        let contributorsString = '';
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
            contributorsString = `KEY_CONTRIBUTORS: ${parts.join(', ')}`;
          }
        }

        // Process the content structure
        let updatedAnalysis = { ...analysisData };
        let movieLinksAdded = 0;
        let contributorLinksAdded = 0;

        // Handle different content structures
        if (analysisData.raw_content && typeof analysisData.raw_content === 'string') {
          try {
            // Parse the raw content JSON structure
            const contentData = JSON.parse(analysisData.raw_content);
            
            if (contentData.content && Array.isArray(contentData.content)) {
              // Process each content section
              for (let i = 0; i < contentData.content.length; i++) {
                const section = contentData.content[i];
                if (section.text && section.text.trim()) {
                  const originalText = section.text;
                  
                  const processedText = await processAnalysisContent(
                    originalText,
                    analysis.title, // Current movie title for self-reference prevention
                    `section-${i}`,
                    contributorsString,
                    {
                      processMovies: true,
                      processContributors: true,
                      dbClient: pool
                    }
                  );

                  // Update the section with processed content
                  contentData.content[i].text = processedText;

                  // Count links added
                  const movieLinks = (processedText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length - 
                                    (originalText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
                  const contribLinks = (processedText.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length -
                                      (originalText.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
                  
                  movieLinksAdded += movieLinks;
                  contributorLinksAdded += contribLinks;
                }
              }

              // Update the analysis with processed content
              updatedAnalysis.raw_content = JSON.stringify(contentData);
            }
          } catch (parseError) {
            // If raw_content is not JSON, process it as plain text
            const processedContent = await processAnalysisContent(
              analysisData.raw_content,
              analysis.title,
              'raw-content',
              contributorsString,
              {
                processMovies: true,
                processContributors: true,
                dbClient: pool
              }
            );

            updatedAnalysis.raw_content = processedContent;

            // Count links
            movieLinksAdded = (processedContent.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
            contributorLinksAdded = (processedContent.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
          }
        }

        const totalLinks = movieLinksAdded + contributorLinksAdded;
        console.log(`   🔗 Added ${movieLinksAdded} movie links, ${contributorLinksAdded} contributor links`);

        // Update the database with processed content
        await pool.query(`
          UPDATE movie_analyses 
          SET 
            claude_response = $1,
            has_links = $2,
            link_count = $3,
            updated_at = NOW()
          WHERE id = $4
        `, [
          JSON.stringify(updatedAnalysis),
          totalLinks > 0,
          totalLinks,
          analysis.analysis_id
        ]);

        console.log(`   ✅ Database updated - total links: ${totalLinks}`);

        totalMovieLinks += movieLinksAdded;
        totalContributorLinks += contributorLinksAdded;
        processed++;

      } catch (error) {
        console.error(`   ❌ Error processing: ${error.message}`);
        errors++;
      }

      // Rate limiting to be gentle on the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Processing Complete:`);
    console.log(`  • Processed: ${processed}/${result.rows.length}`);
    console.log(`  • Movie links added: ${totalMovieLinks}`);
    console.log(`  • Contributor links added: ${totalContributorLinks}`);
    console.log(`  • Total links: ${totalMovieLinks + totalContributorLinks}`);
    console.log(`  • Errors: ${errors}`);
    console.log(`  • Success rate: ${Math.round((processed / result.rows.length) * 100)}%`);

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    throw error;
  }
}

linkMovies1to100()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  });