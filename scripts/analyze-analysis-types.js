#!/usr/bin/env node
/**
 * Analysis Types Comparison
 * 
 * Investigates the difference between movie_analysis and page_analysis
 * to understand their purposes, creation timing, and relationship to nuclear phase.
 */

import { createClient } from '@supabase/supabase-js';

// Set environment variables first
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AnalysisTypesComparator {
  async compareTypes() {
    console.log('🔍 Analysis Types Comparison');
    console.log('============================\n');

    try {
      await this.compareBasicStats();
      await this.compareContentStructure();
      await this.compareCreationPatterns();
      await this.checkNuclearRelationship();
      await this.analyzeSampleContent();
      
    } catch (error) {
      console.error('💥 Comparison failed:', error.message);
      throw error;
    }
  }

  async compareBasicStats() {
    console.log('📊 Basic Statistics Comparison');
    console.log('------------------------------');

    // Get counts and date ranges for each type
    const { data: movieAnalyses } = await supabase
      .from('movie_analyses')
      .select('created_at, claude_response')
      .eq('analysis_type', 'movie_analysis')
      .order('created_at');

    const { data: pageAnalyses } = await supabase
      .from('movie_analyses')
      .select('created_at, claude_response')
      .eq('analysis_type', 'page_analysis')
      .order('created_at');

    console.log(`movie_analysis records: ${movieAnalyses.length}`);
    console.log(`page_analysis records: ${pageAnalyses.length}`);

    if (movieAnalyses.length > 0) {
      console.log(`movie_analysis date range: ${movieAnalyses[0].created_at} to ${movieAnalyses[movieAnalyses.length-1].created_at}`);
    }
    
    if (pageAnalyses.length > 0) {
      console.log(`page_analysis date range: ${pageAnalyses[0].created_at} to ${pageAnalyses[pageAnalyses.length-1].created_at}`);
    }

    // Compare content lengths
    const movieLengths = movieAnalyses
      .map(a => a.claude_response?.raw_content?.length || 0)
      .filter(l => l > 0);
    
    const pageLengths = pageAnalyses
      .map(a => a.claude_response?.raw_content?.length || 0)
      .filter(l => l > 0);

    if (movieLengths.length > 0) {
      const avgMovieLength = movieLengths.reduce((sum, len) => sum + len, 0) / movieLengths.length;
      console.log(`movie_analysis avg length: ${Math.round(avgMovieLength).toLocaleString()} characters`);
    }

    if (pageLengths.length > 0) {
      const avgPageLength = pageLengths.reduce((sum, len) => sum + len, 0) / pageLengths.length;
      console.log(`page_analysis avg length: ${Math.round(avgPageLength).toLocaleString()} characters`);
    }
    console.log('');
  }

  async compareContentStructure() {
    console.log('🏗️ Content Structure Comparison');
    console.log('--------------------------------');

    // Get sample content from each type
    const { data: movieSample } = await supabase
      .from('movie_analyses')
      .select('claude_response')
      .eq('analysis_type', 'movie_analysis')
      .not('claude_response', 'is', null)
      .limit(3);

    const { data: pageSample } = await supabase
      .from('movie_analyses')
      .select('claude_response')
      .eq('analysis_type', 'page_analysis')
      .not('claude_response', 'is', null)
      .limit(3);

    console.log('movie_analysis structure:');
    if (movieSample[0]?.claude_response) {
      const keys = Object.keys(movieSample[0].claude_response);
      console.log(`  Keys: ${keys.join(', ')}`);
      
      // Check for specific fields
      const response = movieSample[0].claude_response;
      console.log(`  Has raw_content: ${!!response.raw_content}`);
      console.log(`  Has model: ${!!response.model}`);
      console.log(`  Has cost_estimate: ${!!response.cost_estimate}`);
      console.log(`  Has has_links: ${!!response.has_links}`);
      console.log(`  Has linked_at: ${!!response.linked_at}`);
    }

    console.log('\\npage_analysis structure:');
    if (pageSample[0]?.claude_response) {
      const keys = Object.keys(pageSample[0].claude_response);
      console.log(`  Keys: ${keys.join(', ')}`);
      
      // Check for specific fields
      const response = pageSample[0].claude_response;
      console.log(`  Has raw_content: ${!!response.raw_content}`);
      console.log(`  Has model: ${!!response.model}`);
      console.log(`  Has cost_estimate: ${!!response.cost_estimate}`);
      console.log(`  Has has_links: ${!!response.has_links}`);
      console.log(`  Has linked_at: ${!!response.linked_at}`);
    }
    console.log('');
  }

  async compareCreationPatterns() {
    console.log('⏰ Creation Patterns Analysis');
    console.log('-----------------------------');

    // Check if there are movies with only one type
    const { data: onlyMovieAnalysis } = await supabase
      .from('movies')
      .select(`
        id, title, year,
        movie_analyses!inner(analysis_type)
      `)
      .eq('movie_analyses.analysis_type', 'movie_analysis')
      .limit(5);

    const { data: onlyPageAnalysis } = await supabase
      .from('movies')
      .select(`
        id, title, year,
        movie_analyses!inner(analysis_type)
      `)
      .eq('movie_analyses.analysis_type', 'page_analysis')
      .limit(5);

    // Check for movies with both types
    const { data: movieWithBoth } = await supabase
      .from('movies')
      .select(`
        id, title, year,
        movie_analyses(analysis_type, created_at)
      `)
      .eq('has_analysis', true)
      .limit(5);

    console.log('Creation patterns found:');
    
    if (movieWithBoth && movieWithBoth[0]?.movie_analyses) {
      const sample = movieWithBoth[0];
      console.log(`\\nSample movie with multiple analyses: ${sample.title} (${sample.year})`);
      sample.movie_analyses.forEach(analysis => {
        console.log(`  • ${analysis.analysis_type}: ${analysis.created_at}`);
      });
    }

    // Check temporal relationship
    const { data: bothTypes } = await supabase
      .from('movie_analyses')
      .select('movie_id, analysis_type, created_at')
      .in('movie_id', movieWithBoth.slice(0, 3).map(m => m.id));

    if (bothTypes.length > 0) {
      console.log('\\nTemporal analysis (same movie, different types):');
      const grouped = {};
      bothTypes.forEach(analysis => {
        if (!grouped[analysis.movie_id]) grouped[analysis.movie_id] = {};
        grouped[analysis.movie_id][analysis.analysis_type] = analysis.created_at;
      });

      Object.entries(grouped).forEach(([movieId, types]) => {
        if (types.movie_analysis && types.page_analysis) {
          const movieFirst = new Date(types.movie_analysis) < new Date(types.page_analysis);
          console.log(`  Movie ${movieId}: ${movieFirst ? 'movie_analysis FIRST' : 'page_analysis FIRST'}`);
          console.log(`    movie_analysis: ${types.movie_analysis}`);
          console.log(`    page_analysis: ${types.page_analysis}`);
        }
      });
    }
    console.log('');
  }

  async checkNuclearRelationship() {
    console.log('☢️ Nuclear Phase Relationship Check');
    console.log('-----------------------------------');

    // Look for nuclear-related terms in content or metadata
    const { data: recentPageAnalyses } = await supabase
      .from('movie_analyses')
      .select('claude_response, query_text, created_at')
      .eq('analysis_type', 'page_analysis')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentMovieAnalyses } = await supabase
      .from('movie_analyses')
      .select('claude_response, query_text, created_at')
      .eq('analysis_type', 'movie_analysis')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Recent page_analysis query patterns:');
    recentPageAnalyses.forEach((analysis, i) => {
      console.log(`  ${i+1}. Query: "${analysis.query_text || 'null'}"`);
      if (analysis.claude_response?.batch_processed) {
        console.log(`     Batch processed: ${analysis.claude_response.batch_processed}`);
      }
      if (analysis.claude_response?.nuclear_static) {
        console.log(`     Nuclear static: ${analysis.claude_response.nuclear_static}`);
      }
    });

    console.log('\\nRecent movie_analysis query patterns:');
    recentMovieAnalyses.forEach((analysis, i) => {
      console.log(`  ${i+1}. Query: "${analysis.query_text || 'null'}"`);
      if (analysis.claude_response?.batch_processed) {
        console.log(`     Batch processed: ${analysis.claude_response.batch_processed}`);
      }
      if (analysis.claude_response?.nuclear_static) {
        console.log(`     Nuclear static: ${analysis.claude_response.nuclear_static}`);
      }
    });
    console.log('');
  }

  async analyzeSampleContent() {
    console.log('📝 Sample Content Analysis');
    console.log('--------------------------');

    // Get one sample of each type for the same movie if possible
    const { data: bothTypeSample } = await supabase
      .from('movie_analyses')
      .select('analysis_type, claude_response, movie_id')
      .limit(10);

    // Find a movie with both types
    const movieIds = {};
    bothTypeSample.forEach(analysis => {
      if (!movieIds[analysis.movie_id]) movieIds[analysis.movie_id] = {};
      movieIds[analysis.movie_id][analysis.analysis_type] = analysis.claude_response;
    });

    const movieWithBoth = Object.entries(movieIds).find(([id, types]) => 
      types.movie_analysis && types.page_analysis
    );

    if (movieWithBoth) {
      const [movieId, types] = movieWithBoth;
      
      console.log(`Comparing content for same movie (ID: ${movieId.substring(0, 8)}...):`);
      
      const movieContent = types.movie_analysis?.raw_content || '';
      const pageContent = types.page_analysis?.raw_content || '';
      
      console.log(`\\nmovie_analysis preview (${movieContent.length} chars):`);
      console.log(`"${movieContent.substring(0, 200)}..."`);
      
      console.log(`\\npage_analysis preview (${pageContent.length} chars):`);
      console.log(`"${pageContent.substring(0, 200)}..."`);

      // Check for format differences
      const movieHasParagraphs = movieContent.includes('PARAGRAPH:');
      const pageHasParagraphs = pageContent.includes('PARAGRAPH:');
      const movieHasMovies = movieContent.includes('MOVIES:');
      const pageHasMovies = pageContent.includes('MOVIES:');

      console.log('\\nFormat comparison:');
      console.log(`  movie_analysis has PARAGRAPH: ${movieHasParagraphs}`);
      console.log(`  page_analysis has PARAGRAPH: ${pageHasParagraphs}`);
      console.log(`  movie_analysis has MOVIES: ${movieHasMovies}`);
      console.log(`  page_analysis has MOVIES: ${pageHasMovies}`);

      // Check if content is identical
      const identical = movieContent === pageContent;
      console.log(`  Content identical: ${identical}`);
      
      if (!identical) {
        const similarity = this.calculateSimilarity(movieContent, pageContent);
        console.log(`  Content similarity: ${similarity.toFixed(1)}%`);
      }
    }
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Run comparison
if (import.meta.url === `file://${process.argv[1]}`) {
  const comparator = new AnalysisTypesComparator();
  
  comparator.compareTypes()
    .then(() => {
      console.log('✅ Analysis types comparison completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Comparison failed:', error.message);
      process.exit(1);
    });
}