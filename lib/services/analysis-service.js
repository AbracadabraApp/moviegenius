/**
 * Analysis Service - Simplified Claude analysis management
 *
 * Single responsibility: Get or generate movie analysis
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildPrompt } from '../prompts/builder.js';
import { 
  safeMovieProcessing, 
  trackZeroWasteSavings,
  validateContentIntegrity 
} from '../zero-waste-protection.js';
import { processAnalysisContent } from '../movie-analysis-linker.js';
import { 
  markAnalysisComplete, 
  recordZeroWasteOperation,
  getEnhancedMovieCompletionStatus 
} from '../zero-waste-database.js';
// Analysis service configuration
const ANALYSIS_CONFIG = {
  DATABASE: {
    ANALYSIS_TYPE: 'movie_analysis',
  },
  CLAUDE: {
    MAX_TOKENS: 4000,
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AnalysisService {
  /**
   * ZERO-WASTE: Get existing analysis or generate new one with three-tier protection
   */
  static async getOrGenerate(movie, options = {}) {
    console.log(
      `🛡️ ZERO-WASTE getOrGenerate called for movie: ${movie.title} (ID: ${movie.id}, TMDB: ${movie.tmdb_id})`
    );

    try {
      // Use safe processing with three-tier strategy
      return await safeMovieProcessing(
        movie,
        // Generate fresh function
        async (movieData) => {
          const analysis = await this.generate(movieData);
          const savings = trackZeroWasteSavings('tier3_fresh', analysis);
          console.log(`💰 Tier 3 cost: $${savings.costIncurred.toFixed(4)}`);
          return analysis;
        },
        // Link existing function  
        async (existingAnalysis, movieData) => {
          console.log(`🔗 Tier 2 - Adding links to existing analysis for ${movieData.title}`);
          
          // Process the existing content to add movie links
          const linkedContent = await processAnalysisContent(
            existingAnalysis.raw_content,
            movieData.title,
            `${movieData.title} (${movieData.year})`
          );

          // Validate that we didn't break anything
          const validation = validateContentIntegrity(
            existingAnalysis.raw_content,
            linkedContent,
            'tier2_link_only'
          );

          if (!validation.valid) {
            console.error('🚨 Content integrity validation failed:', validation.errors);
            throw new Error(`Content integrity violation: ${validation.errors.join(', ')}`);
          }

          // Update the database with linked content
          const updatedAnalysis = {
            ...existingAnalysis,
            raw_content: linkedContent,
            linked_at: new Date().toISOString(),
            has_links: true
          };

          await this.updateAnalysisWithLinks(movie.id, updatedAnalysis);

          // Mark as complete in database
          await markAnalysisComplete(movie.id, 1);
          
          // Record the zero-waste operation
          await recordZeroWasteOperation({
            operationType: 'tier2_link_only',
            contentType: 'movie_analysis', 
            contentId: movie.id,
            costSaved: 0.10,
            costIncurred: 0.001,
            linksAdded: 1,
            metadata: { movieTitle: movieData.title, movieYear: movieData.year }
          });

          const savings = trackZeroWasteSavings('tier2_link_only', { linksAdded: 1 });
          console.log(`💰 Tier 2 saved: $${savings.costSaved.toFixed(4)}`);

          return await this.parseAnalysisWithTmdbLookup(linkedContent);
        },
        supabase
      );
    } catch (error) {
      console.error(`❌ ZERO-WASTE getOrGenerate failed for ${movie.title}:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Get existing analysis from database
   */
  static async getExisting(movieId) {
    console.log(
      `🗄️ getExisting: Querying database for movie_id=${movieId}, analysis_type=${ANALYSIS_CONFIG.DATABASE.ANALYSIS_TYPE}`
    );

    try {
      const { data: analysis, error } = await supabase
        .from('movie_analyses')
        .select('claude_response')
        .eq('movie_id', movieId)
        .eq('analysis_type', ANALYSIS_CONFIG.DATABASE.ANALYSIS_TYPE)
        .single();

      if (error) {
        console.log(`🗄️ Database query error (expected if no analysis exists):`, error.message);
        console.log(`🗄️ Error code:`, error.code);
      }

      console.log(`🗄️ Database query result:`, analysis ? 'ANALYSIS FOUND' : 'NO ANALYSIS');
      if (analysis) {
        console.log(`🗄️ Analysis has claude_response:`, !!analysis.claude_response);
        console.log(
          `🗄️ Analysis content length:`,
          analysis.claude_response?.raw_content?.length || 0
        );
      }

      return analysis;
    } catch (dbError) {
      console.error(`❌ getExisting database error:`, dbError);
      return null;
    }
  }

  /**
   * Generate new Claude analysis
   */
  static async generate(movie) {
    console.log(`🤖 generate() called for movie: ${movie.title} (${movie.year})`);
    console.log(`🤖 Movie object in generate():`, {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdb_id: movie.tmdb_id,
    });

    // Check environment variables
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is missing');
    }

    console.log(`🤖 Building prompt for MOVIE_ANALYSIS...`);
    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Include 3-4 accessibly written Explore Further topics'
    );
    const userPrompt = `${movie.title} (${movie.year})`;
    console.log(`🤖 User prompt: "${userPrompt}"`);
    console.log(`🤖 Prompt config model: ${promptConfig.model}`);

    console.log(`🤖 Calling Claude API...`);
    try {
      const message = await anthropic.messages.create({
        ...promptConfig,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: ANALYSIS_CONFIG.CLAUDE.MAX_TOKENS,
      });

      console.log(`✅ Claude API response received`);
      console.log(
        `🤖 Token usage: ${message.usage.input_tokens} input, ${message.usage.output_tokens} output`
      );

      const analysis = message.content[0].text;
      const costEstimate =
        (message.usage.input_tokens * 3) / 1000000 + (message.usage.output_tokens * 15) / 1000000;

      console.log(`🤖 Analysis length: ${analysis.length} characters`);
      console.log(`🤖 Cost estimate: $${costEstimate.toFixed(4)}`);

      // Save to database
      const analysisData = {
        raw_content: analysis,
        generated_at: new Date().toISOString(),
        cost_estimate: costEstimate,
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        model: promptConfig.model,
      };

      console.log(`💾 Saving analysis to database for movie_id: ${movie.id}`);
      const { error: dbError } = await supabase.from('movie_analyses').insert({
        movie_id: movie.id,
        analysis_type: ANALYSIS_CONFIG.DATABASE.ANALYSIS_TYPE,
        claude_response: analysisData,
        query_text: `Analysis for ${movie.title} (${movie.year})`,
      });

      if (dbError) {
        console.error(`❌ Database save error:`, dbError);
        throw new Error(`Failed to save analysis to database: ${dbError.message}`);
      }

      console.log(`✅ Analysis saved to database successfully`);
      
      // ZERO-WASTE: Integrate linking into fresh content generation
      console.log(`🔗 Adding movie links to fresh analysis for ${movie.title}...`);
      const linkedAnalysis = await processAnalysisContent(
        analysis,
        movie.title,
        `${movie.title} (${movie.year})`
      );

      // Update database with linked version
      const linkedAnalysisData = {
        ...analysisData,
        raw_content: linkedAnalysis,
        has_links: true,
        linked_at: new Date().toISOString()
      };

      await this.updateAnalysisWithLinks(movie.id, linkedAnalysisData);
      
      // Mark as complete in database  
      await markAnalysisComplete(movie.id, 1);
      
      // Record the zero-waste operation
      await recordZeroWasteOperation({
        operationType: 'tier3_fresh',
        contentType: 'movie_analysis',
        contentId: movie.id, 
        costIncurred: costEstimate,
        linksAdded: 1,
        metadata: { 
          movieTitle: movie.title, 
          movieYear: movie.year,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens 
        }
      });
      
      console.log(`✅ Fresh analysis with integrated linking saved and marked complete`);

      console.log(`🔄 Calling parseAnalysisWithTmdbLookup...`);
      return await this.parseAnalysisWithTmdbLookup(linkedAnalysis);
    } catch (claudeError) {
      console.error(`❌ Claude API error:`, claudeError);
      throw claudeError;
    }
  }

  /**
   * Parse Claude response into structured data
   * Simplified version of the original parsing logic
   */
  static parseAnalysis(responseText) {
    const sections = [];
    const exploreFurtherTopics = [];
    const moreIdeasMovies = [];

    const lines = responseText.split('\n');
    let currentSection = null;
    let currentMovies = [];
    let inMoreIdeas = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('PARAGRAPH:')) {
        // Save previous section
        if (currentSection) sections.push(currentSection);
        if (currentMovies.length > 0) {
          sections.push({ type: 'movies', movies: [...currentMovies] });
          currentMovies = [];
        }

        // Start new section
        currentSection = {
          type: 'text',
          content: trimmed.replace('PARAGRAPH:', '').trim(),
        };
      } else if (trimmed.startsWith('MOVIES:')) {
        const movieData = this.parseMovieLine(trimmed.replace('MOVIES:', '').trim());
        if (movieData) currentMovies.push(movieData);
      } else if (trimmed.startsWith('EXPLORE_FURTHER:')) {
        const topic = trimmed.replace('EXPLORE_FURTHER:', '').trim();
        if (topic) exploreFurtherTopics.push(topic);
      } else if (trimmed.startsWith('MORE_IDEAS:')) {
        inMoreIdeas = true;
        const movieData = this.parseMovieLine(trimmed.replace('MORE_IDEAS:', '').trim());
        if (movieData) moreIdeasMovies.push(movieData);
      } else if (inMoreIdeas && trimmed.includes('|')) {
        const movieData = this.parseMovieLine(trimmed);
        if (movieData) moreIdeasMovies.push(movieData);
      } else if (currentSection && trimmed) {
        currentSection.content += ' ' + trimmed;
      }
    }

    // Save final sections
    if (currentSection) sections.push(currentSection);
    if (currentMovies.length > 0) {
      sections.push({ type: 'movies', movies: currentMovies });
    }

    return {
      sections,
      exploreFurther: exploreFurtherTopics,
      moreIdeas: {
        title: 'Related Films',
        movies: moreIdeasMovies,
      },
    };
  }

  /**
   * Parse a single movie line (title|year|description|streaming)
   * Enhanced to look up TMDB IDs for proper navigation
   */
  static parseMovieLine(line) {
    if (!line) return null;

    const parts = line.split('|');
    if (parts.length < 2) return null;

    const [title, year, description, streaming] = parts;
    const movieObj = {
      title: title?.trim() || 'Unknown Title',
      year: parseInt(year?.trim()) || new Date().getFullYear(),
      slug: description?.trim() || null,
      poster: '/images/placeholder-poster.jpg',
      initialStreaming: streaming?.trim() || null,
      tmdb_id: null, // Will be enhanced by lookupTmdbIds
      needsTmdbLookup: true, // Flag for batch enhancement
    };
    console.log(
      '🎬 Parsed movie for enhancement:',
      `${movieObj.title} (${movieObj.year}) - needsTmdbLookup: ${movieObj.needsTmdbLookup}`
    );
    return movieObj;
  }

  /**
   * Enhanced parse that includes TMDB ID lookup for navigation
   */
  static async parseAnalysisWithTmdbLookup(responseText) {
    const analysis = this.parseAnalysis(responseText);

    // Collect all movies that need TMDB lookup
    const moviesNeedingLookup = [];

    // Get movies from sections
    analysis.sections.forEach(section => {
      if (section.type === 'movies' && section.movies) {
        moviesNeedingLookup.push(...section.movies.filter(m => m.needsTmdbLookup));
      }
    });

    // Get movies from moreIdeas
    if (analysis.moreIdeas && analysis.moreIdeas.movies) {
      moviesNeedingLookup.push(...analysis.moreIdeas.movies.filter(m => m.needsTmdbLookup));
    }

    // Batch lookup TMDB IDs
    console.log('🔍 TMDB Enhancement check: movies needing lookup:', moviesNeedingLookup.length);
    if (moviesNeedingLookup.length > 0) {
      console.log(
        '🚀 Calling enhanceMoviesWithTmdbIds for:',
        moviesNeedingLookup.map(m => `${m.title} (${m.year})`)
      );
      await this.enhanceMoviesWithTmdbIds(moviesNeedingLookup);
      console.log(
        '✅ Enhancement complete for:',
        moviesNeedingLookup.map(m => `${m.title} - TMDB:${m.tmdb_id}`)
      );
    } else {
      console.log('❌ No movies need TMDB lookup - enhancement skipped');
    }

    return analysis;
  }

  /**
   * Enhance movie objects with TMDB IDs and poster URLs from database
   * 🚀 PERFORMANCE CRITICAL: Use parallel processing and database-first approach
   */
  static async enhanceMoviesWithTmdbIds(movies) {
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 🚀 PERFORMANCE: Process all movies in parallel instead of sequential
    const promises = movies.map(async movie => {
      try {
        // First try database lookup for existing TMDB ID
        const { data: existingMovie } = await supabase
          .from('movies')
          .select('tmdb_id, poster_url')
          .ilike('title', movie.title)
          .eq('year', movie.year)
          .single();

        if (existingMovie?.tmdb_id) {
          movie.tmdb_id = existingMovie.tmdb_id;
          movie.poster_url = existingMovie.poster_url;
          movie.poster = existingMovie.poster_url;
          console.log(`✅ Database hit for "${movie.title}" TMDB:${movie.tmdb_id}`);
        } else {
          // Only do TMDB search if not in database
          const { searchAndCategorize } = await import('./tmdb-search.js');
          const searchQuery = `${movie.title} ${movie.year}`;
          const tmdbResult = await searchAndCategorize(searchQuery);

          console.log(`🔍 TMDB result for "${movie.title}":`, JSON.stringify(tmdbResult, null, 2));

          if (tmdbResult.type === 'single_match') {
            movie.tmdb_id = tmdbResult.movie.id;
            console.log(`✅ TMDB API for "${movie.title}" TMDB:${movie.tmdb_id}`);
          } else if (tmdbResult.type === 'multiple_matches' && tmdbResult.results.length > 0) {
            movie.tmdb_id = tmdbResult.results[0].id;
            console.log(`✅ TMDB API (first match) for "${movie.title}" TMDB:${movie.tmdb_id}`);
          } else {
            console.log(
              `❌ TMDB result type "${tmdbResult.type}" not handled for "${movie.title}"`
            );
          }
        }

        delete movie.needsTmdbLookup;
      } catch (error) {
        console.error(`Failed to lookup TMDB ID for "${movie.title}":`, error);
        delete movie.needsTmdbLookup;
      }
    });

    // Wait for all lookups to complete in parallel
    await Promise.all(promises);
  }

  /**
   * Update existing analysis with linked content
   */
  static async updateAnalysisWithLinks(movieId, updatedAnalysis) {
    try {
      const { error } = await supabase
        .from('movie_analyses')
        .update({ 
          claude_response: updatedAnalysis
        })
        .eq('movie_id', movieId)
        .eq('analysis_type', ANALYSIS_CONFIG.DATABASE.ANALYSIS_TYPE);

      if (error) {
        console.error(`❌ Failed to update analysis with links for movie ${movieId}:`, error);
        throw error;
      }

      console.log(`✅ Updated analysis with links for movie ${movieId}`);
    } catch (error) {
      console.error(`❌ Database error updating analysis for movie ${movieId}:`, error);
      throw error;
    }
  }
}
