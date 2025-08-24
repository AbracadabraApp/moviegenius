/**
 * Async Link Processor - Fire and Forget
 * 
 * Processes movie links immediately after analysis insertion without blocking response.
 * Converts **Movie Title** patterns to HTML <a href="/movie/ID"> links.
 */

import { Client } from 'pg';

// Railway PostgreSQL connection
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  return new Client({ connectionString: dbUrl });
}

/**
 * Extract movie mentions from content
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];

  const mentions = [];

  // Pattern 1: **Movie Title** (Year) - Bold with year
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  let match;

  while ((match = boldWithYearPattern.exec(content)) !== null) {
    let title = match[1].trim();
    const year = parseInt(match[2]);
    
    // Clean up title
    title = title.replace(/\s*\(\d{4}\)$/, '').trim();
    
    mentions.push({
      originalText: match[0],
      title,
      year,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  // Pattern 2: **Movie Title** - Bold without year
  const boldPattern = /\*\*([^*]+)\*\*/g;

  while ((match = boldPattern.exec(content)) !== null) {
    let title = match[1].trim();
    
    // Skip if already captured with year
    const alreadyCaptured = mentions.some(mention => 
      Math.abs(mention.startIndex - match.index) < 10
    );
    
    if (!alreadyCaptured && title.length > 2) {
      mentions.push({
        originalText: match[0],
        title,
        year: null,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }

  return mentions.sort((a, b) => b.startIndex - a.startIndex); // Process from end to start
}

/**
 * Look up movie in database
 */
async function lookupMovie(client, title, year = null) {
  let query = 'SELECT id, tmdb_id, title, year FROM movies WHERE title ILIKE $1';
  let params = [title];
  
  if (year) {
    query += ' AND year = $2';
    params.push(year);
  }
  
  query += ' LIMIT 1';
  
  const result = await client.query(query, params);
  return result.rows[0] || null;
}

/**
 * Process movie mentions and create HTML links
 */
async function processMovieMentions(client, content, currentMovieTmdbId) {
  const mentions = extractMovieMentions(content);
  if (mentions.length === 0) {
    return { content, linkCount: 0 };
  }

  let processedContent = content;
  let linkCount = 0;
  const seenMovies = new Set();

  for (const mention of mentions) {
    try {
      // Look up movie in database
      const movie = await lookupMovie(client, mention.title, mention.year);
      
      if (!movie || !movie.tmdb_id) {
        // Strip markdown but don't create link
        processedContent = processedContent.substring(0, mention.startIndex) +
          mention.title + (mention.year ? ` (${mention.year})` : '') +
          processedContent.substring(mention.endIndex);
        continue;
      }

      // Skip self-references
      if (movie.tmdb_id === currentMovieTmdbId) {
        processedContent = processedContent.substring(0, mention.startIndex) +
          mention.title + (mention.year ? ` (${mention.year})` : '') +
          processedContent.substring(mention.endIndex);
        continue;
      }

      // Skip if already linked this movie
      if (seenMovies.has(movie.tmdb_id)) {
        processedContent = processedContent.substring(0, mention.startIndex) +
          mention.title + (mention.year ? ` (${mention.year})` : '') +
          processedContent.substring(mention.endIndex);
        continue;
      }

      // Create HTML link
      const htmlLink = `<a href="/movie/${movie.tmdb_id}" class="movie-title" data-tmdb-id="${movie.tmdb_id}">${mention.title}</a>` + 
        (mention.year ? ` (${mention.year})` : '');

      processedContent = processedContent.substring(0, mention.startIndex) +
        htmlLink +
        processedContent.substring(mention.endIndex);

      seenMovies.add(movie.tmdb_id);
      linkCount++;

    } catch (error) {
      console.error(`Error processing ${mention.title}:`, error.message);
      
      // Strip markdown as fallback
      processedContent = processedContent.substring(0, mention.startIndex) +
        mention.title + (mention.year ? ` (${mention.year})` : '') +
        processedContent.substring(mention.endIndex);
    }
  }

  return { content: processedContent, linkCount };
}

/**
 * Process a single analysis for movie links (async, non-blocking)
 */
export async function processAnalysisLinks(analysisId, movieTmdbId) {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    
    // Get the analysis data
    const analysisQuery = 'SELECT * FROM movie_analyses WHERE id = $1';
    const analysisResult = await client.query(analysisQuery, [analysisId]);
    
    if (analysisResult.rows.length === 0) {
      console.log(`⚠️ Async Link Processor: Analysis ${analysisId} not found`);
      return;
    }

    const analysis = analysisResult.rows[0];
    console.log(`🔗 Async Link Processor: Starting for analysis ${analysisId}`);

    // Extract content from JSON structure
    let rawContent = null;
    if (analysis.claude_response && analysis.claude_response.raw_content) {
      if (typeof analysis.claude_response.raw_content === 'string') {
        try {
          const parsed = JSON.parse(analysis.claude_response.raw_content);
          if (parsed.content && Array.isArray(parsed.content)) {
            rawContent = parsed.content
              .map(section => section.text || '')
              .filter(text => text.trim().length > 0)
              .join('\n\n');
          }
        } catch (e) {
          rawContent = analysis.claude_response.raw_content;
        }
      }
    }

    if (!rawContent || !rawContent.includes('**')) {
      console.log(`⚠️ Async Link Processor: No markdown patterns found in analysis ${analysisId}`);
      return;
    }

    // Process movie mentions
    const result = await processMovieMentions(client, rawContent, movieTmdbId);

    if (result.linkCount > 0) {
      // Update database with processed content and link metadata
      const updatedClaudeResponse = {
        ...analysis.claude_response,
        processed_content: result.content
      };

      const updateQuery = `
        UPDATE movie_analyses 
        SET 
          claude_response = $1,
          has_links = $2,
          link_count = $3,
          linked_at = NOW()
        WHERE id = $4
      `;

      await client.query(updateQuery, [
        JSON.stringify(updatedClaudeResponse),
        true,
        result.linkCount,
        analysisId
      ]);

      console.log(`✅ Async Link Processor: Updated analysis ${analysisId} with ${result.linkCount} links`);
    } else {
      console.log(`ℹ️ Async Link Processor: No links created for analysis ${analysisId}`);
    }

  } catch (error) {
    console.error(`❌ Async Link Processor error for analysis ${analysisId}:`, error.message);
  } finally {
    await client.end();
  }
}

/**
 * Fire-and-forget wrapper - doesn't block calling code
 */
export function triggerAsyncLinkProcessing(analysisId, movieTmdbId) {
  // Fire and forget - no await, no blocking
  processAnalysisLinks(analysisId, movieTmdbId).catch(error => {
    console.error(`🔥 Fire-and-forget link processing failed for analysis ${analysisId}:`, error.message);
  });
  
  console.log(`🚀 Triggered async link processing for analysis ${analysisId}`);
}