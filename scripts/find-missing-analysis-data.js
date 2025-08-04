#!/usr/bin/env node
/**
 * Find Missing Analysis Data Investigation
 * 
 * Deep investigation to find all sources of analysis data that may have been missed
 */

import { createClient } from '@supabase/supabase-js';

// Set environment variables first
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class MissingAnalysisInvestigator {
  async investigate() {
    console.log('🔍 Deep Analysis Data Investigation');
    console.log('===================================\n');

    try {
      await this.checkAllAnalysisTypes();
      await this.checkMoviesTableForAnalysis();
      await this.checkAllTables();
      await this.checkHasAnalysisFlag();
      await this.checkSpecificMovieExamples();
    } catch (error) {
      console.error('Investigation failed:', error.message);
    }
  }

  async checkAllAnalysisTypes() {
    console.log('📊 ALL Analysis Types in movie_analyses');
    console.log('---------------------------------------');

    const { data: allAnalyses } = await supabase
      .from('movie_analyses')
      .select('analysis_type');

    const typeCounts = {};
    allAnalyses.forEach(a => {
      typeCounts[a.analysis_type] = (typeCounts[a.analysis_type] || 0) + 1;
    });

    console.log('Analysis types found:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count.toLocaleString()}`);
    });
    
    console.log(`Total analysis records: ${allAnalyses.length.toLocaleString()}\n`);
  }

  async checkMoviesTableForAnalysis() {
    console.log('🎬 Movies Table Analysis Data Check');
    console.log('-----------------------------------');

    // Get sample movie to see all columns
    const { data: movieSample } = await supabase
      .from('movies')
      .select('*')
      .limit(1);

    if (movieSample[0]) {
      console.log('Movies table columns with content:');
      Object.entries(movieSample[0]).forEach(([column, value]) => {
        let description = 'empty/null';
        if (value) {
          if (typeof value === 'string' && value.length > 50) {
            description = `STRING (${value.length} chars)`;
          } else if (typeof value === 'object') {
            description = `OBJECT/JSON`;
          } else {
            description = `${typeof value} (${value.toString().substring(0, 30)})`;
          }
        }
        console.log(`  • ${column}: ${description}`);
      });
    }

    // Check how many movies have has_analysis = true
    const { count: analyzedCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('has_analysis', true);

    console.log(`\nMovies with has_analysis=true: ${analyzedCount?.toLocaleString()}\n`);
  }

  async checkAllTables() {
    console.log('🗃️ All Database Tables');
    console.log('----------------------');

    // Since information_schema might not be accessible, let's try a different approach
    // Check for other potential analysis tables by trying common patterns
    const potentialTables = [
      'movie_analyses',
      'analyses', 
      'movie_analysis',
      'film_analyses',
      'content',
      'movie_content',
      'static_content',
      'nuclear_content',
      'page_content'
    ];

    for (const tableName of potentialTables) {
      try {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (count !== null) {
          console.log(`  ✅ ${tableName}: ${count.toLocaleString()} records`);
          
          // If we find a new table with data, sample it
          if (count > 0 && tableName !== 'movie_analyses') {
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (sample && sample[0]) {
              console.log(`     Sample columns: ${Object.keys(sample[0]).join(', ')}`);
            }
          }
        }
      } catch (error) {
        // Table doesn't exist or not accessible
        console.log(`  ❌ ${tableName}: not found`);
      }
    }
    console.log('');
  }

  async checkHasAnalysisFlag() {
    console.log('🏁 has_analysis Flag Deep Dive');
    console.log('------------------------------');

    // Get movies where has_analysis = true but we didn't find analysis records
    const { data: flaggedMovies } = await supabase
      .from('movies')
      .select('id, title, year, has_analysis')
      .eq('has_analysis', true)
      .limit(10);

    console.log('Sample movies flagged as analyzed:');
    for (const movie of flaggedMovies) {
      // Check if they have analysis records
      const { data: analyses } = await supabase
        .from('movie_analyses')
        .select('analysis_type')
        .eq('movie_id', movie.id);

      console.log(`  • ${movie.title} (${movie.year}): ${analyses.length} analysis records`);
      if (analyses.length > 0) {
        console.log(`    Types: ${analyses.map(a => a.analysis_type).join(', ')}`);
      }
    }
    console.log('');
  }

  async checkSpecificMovieExamples() {
    console.log('🎯 Checking Specific Movie Examples');
    console.log('-----------------------------------');

    // Check some well-known movies that should have analysis
    const famousMovies = [
      'The Godfather',
      'Citizen Kane', 
      'Casablanca',
      'Pulp Fiction',
      'The Shawshank Redemption'
    ];

    for (const title of famousMovies) {
      const { data: movie } = await supabase
        .from('movies')
        .select('id, title, year, has_analysis')
        .ilike('title', title)
        .limit(1);

      if (movie && movie[0]) {
        const { data: analyses } = await supabase
          .from('movie_analyses')
          .select('analysis_type, claude_response')
          .eq('movie_id', movie[0].id);

        console.log(`${movie[0].title} (${movie[0].year}):`);
        console.log(`  • has_analysis flag: ${movie[0].has_analysis}`);
        console.log(`  • analysis records: ${analyses.length}`);
        
        if (analyses[0]) {
          const contentLength = analyses[0].claude_response?.raw_content?.length || 0;
          console.log(`  • content length: ${contentLength} characters`);
        }
      } else {
        console.log(`${title}: not found in database`);
      }
    }
  }
}

// Run investigation
if (import.meta.url === `file://${process.argv[1]}`) {
  const investigator = new MissingAnalysisInvestigator();
  
  investigator.investigate()
    .then(() => {
      console.log('\n✅ Deep investigation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Investigation failed:', error.message);
      process.exit(1);
    });
}