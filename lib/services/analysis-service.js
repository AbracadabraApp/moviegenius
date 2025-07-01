/**
 * Analysis Service - Simplified Claude analysis management
 * 
 * Single responsibility: Get or generate movie analysis
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildPrompt } from '../prompts/builder.js';
// Analysis service configuration
const ANALYSIS_CONFIG = {
  DATABASE: {
    ANALYSIS_TYPE: 'movie_analysis'
  },
  CLAUDE: {
    MAX_TOKENS: 4000
  }
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
   * Get existing analysis or generate new one
   */
  static async getOrGenerate(movie, options = {}) {
    try {
      // Try to get existing analysis first
      const existing = await this.getExisting(movie.id);
      if (existing && !options.forceRegenerate) {
        return await this.parseAnalysisWithTmdbLookup(existing.claude_response.raw_content);
      }
      
      // Generate new analysis
      return await this.generate(movie);
      
    } catch (error) {
      console.error(`Failed to get/generate analysis for ${movie.title}:`, error);
      return null; // Graceful degradation
    }
  }
  
  /**
   * Get existing analysis from database
   */
  static async getExisting(movieId) {
    const { data: analysis } = await supabase
      .from('movie_analyses')
      .select('claude_response')
      .eq('movie_id', movieId)
      .eq('analysis_type', ANALYSIS_CONFIG.DATABASE.ANALYSIS_TYPE)
      .single();
    
    return analysis;
  }
  
  /**
   * Generate new Claude analysis
   */
  static async generate(movie) {
    const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Include 3-4 accessibly written Explore Further topics');
    const userPrompt = `${movie.title} (${movie.year})`;

    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: ANALYSIS_CONFIG.CLAUDE.MAX_TOKENS
    });

    const analysis = message.content[0].text;
    const costEstimate = (message.usage.input_tokens * 3 / 1000000) + (message.usage.output_tokens * 15 / 1000000);
    
    // Save to database
    const analysisData = {
      raw_content: analysis,
      generated_at: new Date().toISOString(),
      cost_estimate: costEstimate,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      model: promptConfig.model,
    };

    await supabase
      .from('movie_analyses')
      .insert({
        movie_id: movie.id,
        analysis_type: ANALYSIS_CONFIG.DATABASE.ANALYSIS_TYPE,
        claude_response: analysisData,
        query_text: `Analysis for ${movie.title} (${movie.year})`
      });

    return await this.parseAnalysisWithTmdbLookup(analysis);
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
          content: trimmed.replace('PARAGRAPH:', '').trim()
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
        movies: moreIdeasMovies
      }
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
    return {
      title: title?.trim() || 'Unknown Title',
      year: parseInt(year?.trim()) || new Date().getFullYear(),
      slug: description?.trim() || null,
      poster: '/images/placeholder-poster.jpg',
      initialStreaming: streaming?.trim() || null,
      tmdb_id: null, // Will be enhanced by lookupTmdbIds
      needsTmdbLookup: true // Flag for batch enhancement
    };
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
    if (moviesNeedingLookup.length > 0) {
      await this.enhanceMoviesWithTmdbIds(moviesNeedingLookup);
    }
    
    return analysis;
  }
  
  /**
   * Enhance movie objects with TMDB IDs for navigation
   */
  static async enhanceMoviesWithTmdbIds(movies) {
    const { searchAndCategorize } = await import('./tmdb-search');
    
    for (const movie of movies) {
      try {
        const searchQuery = `${movie.title} ${movie.year}`;
        const tmdbResult = await searchAndCategorize(searchQuery);
        
        if (tmdbResult.type === 'single_match') {
          movie.tmdb_id = tmdbResult.movie.id;
          console.log(`✅ Found TMDB ID ${movie.tmdb_id} for "${movie.title}" (${movie.year})`);
        } else {
          console.warn(`⚠️  No TMDB match for "${movie.title}" (${movie.year})`);
        }
        
        delete movie.needsTmdbLookup;
        
      } catch (error) {
        console.error(`Failed to lookup TMDB ID for "${movie.title}":`, error);
        delete movie.needsTmdbLookup;
      }
    }
  }
}