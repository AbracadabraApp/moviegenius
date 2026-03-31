/**
 * Backfill specific movie by TMDB ID
 */

import { getPool, MovieService } from './lib/railway-db.js';
import { processAnalysisContent } from './lib/movie-analysis-linker.js';

const tmdbId = parseInt(process.argv[2]);

if (!tmdbId) {
  console.error('Usage: node backfill-specific-movie.js <TMDB_ID>');
  process.exit(1);
}

async function backfillMovie() {
  const pool = getPool();

  try {
    // Get movie by TMDB ID
    const movie = await MovieService.getMovieByTMDBId(tmdbId);
    if (!movie) {
      console.error(`Movie with TMDB ID ${tmdbId} not found`);
      process.exit(1);
    }

    console.log(`🎬 Processing: ${movie.title} (${movie.year})`);

    // Get analysis
    const analysis = await MovieService.getMovieAnalysis(movie.id);
    if (!analysis) {
      console.error(`No analysis found for ${movie.title}`);
      process.exit(1);
    }

    const rawContent = analysis.claude_response.raw_content;
    let analysisData;

    try {
      analysisData = JSON.parse(rawContent);
    } catch (e) {
      console.error('Invalid JSON format');
      process.exit(1);
    }

    console.log(`📊 Found ${analysisData.content?.length || 0} content sections`);

    // Process each content section
    let totalLinks = 0;
    const updatedContent = [];

    for (const section of analysisData.content) {
      if (!section.text) {
        updatedContent.push(section);
        continue;
      }

      console.log(`\n🔄 Processing section: ${section.type}`);

      const processedText = await processAnalysisContent(
        section.text,
        movie.title,
        `${movie.title} - ${section.type}`,
        rawContent,
        {
          processMovies: true,
          processContributors: true
        }
      );

      const linkCount = (processedText.match(/<a href=/g) || []).length;
      totalLinks += linkCount;

      updatedContent.push({
        ...section,
        text: processedText
      });
    }

    console.log(`\n✅ Total links added: ${totalLinks}`);

    // Update database
    const updatedAnalysisData = {
      ...analysisData,
      content: updatedContent
    };

    const updatedClaudeResponse = {
      ...analysis.claude_response,
      processed_content: JSON.stringify(updatedAnalysisData),
      has_links: true,
      linked_at: new Date().toISOString(),
      link_count: totalLinks
    };

    const updateQuery = `
      UPDATE movie_analyses
      SET
        claude_response = $1,
        has_links = true,
        linked_at = NOW(),
        link_count = $2,
        updated_at = NOW()
      WHERE id = $3
    `;

    await pool.query(updateQuery, [
      JSON.stringify(updatedClaudeResponse),
      totalLinks,
      analysis.id
    ]);

    console.log(`\n💾 Updated database for ${movie.title}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backfillMovie();