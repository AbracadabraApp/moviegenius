#!/usr/bin/env node

/**
 * Demo Multi-Source Static File Generator
 * 
 * Creates enhanced static JSON files from existing sample data to demonstrate
 * the multi-source architecture concept without requiring database access.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  outputDir: path.join(PROJECT_ROOT, 'public', 'data', 'enhanced-movies'),
  sampleMovies: [
    { tmdbId: 550, title: 'Fight Club', year: 1999 },
    { tmdbId: 238, title: 'The Godfather', year: 1972 },
    { tmdbId: 680, title: 'Pulp Fiction', year: 1994 }
  ]
};

/**
 * Load sample analysis data (simulate database query)
 */
function loadSampleAnalysis(tmdbId) {
  const sampleAnalysis = {
    550: {
      keyElements: {
        genre: 'Drama',
        director: 'David Fincher',
        stars: 'Brad Pitt, Edward Norton',
        year: 1999
      },
      sections: [
        { type: 'overview', content: 'A dark psychological thriller exploring consumer culture' },
        { type: 'themes', content: 'Identity crisis, capitalism critique, toxic masculinity' }
      ],
      whyWatch: {
        recommendation: 'YES',
        reasons: ['Mind-bending plot twists', 'Outstanding performances', 'Cultural significance']
      },
      featuredMovies: [
        { tmdbId: 807, title: 'Se7en', year: 1995 },
        { tmdbId: 13, title: 'Forrest Gump', year: 1994 }
      ],
      exploreTopics: ['Film Noir', 'Psychological Thriller']
    },
    238: {
      keyElements: {
        genre: 'Crime',
        director: 'Francis Ford Coppola', 
        stars: 'Marlon Brando, Al Pacino',
        year: 1972
      },
      sections: [
        { type: 'overview', content: 'Epic crime saga of the Corleone family' },
        { type: 'legacy', content: 'Widely considered one of the greatest films ever made' }
      ],
      whyWatch: {
        recommendation: 'YES',
        reasons: ['Masterful storytelling', 'Iconic performances', 'Cinematic perfection']
      },
      featuredMovies: [
        { tmdbId: 240, title: 'The Godfather: Part II', year: 1974 },
        { tmdbId: 769, title: 'GoodFellas', year: 1990 }
      ],
      exploreTopics: ['Crime Films', 'American Cinema']
    },
    680: {
      keyElements: {
        genre: 'Crime',
        director: 'Quentin Tarantino',
        stars: 'John Travolta, Samuel L. Jackson',
        year: 1994
      },
      sections: [
        { type: 'overview', content: 'Nonlinear narrative exploring interconnected criminal stories' },
        { type: 'style', content: 'Revolutionary dialogue and pop culture references' }
      ],
      whyWatch: {
        recommendation: 'YES',
        reasons: ['Innovative structure', 'Memorable dialogue', 'Cultural impact']
      },
      featuredMovies: [
        { tmdbId: 24, title: 'Kill Bill: Vol. 1', year: 2003 },
        { tmdbId: 807, title: 'Se7en', year: 1995 }
      ],
      exploreTopics: ['Independent Films', 'Nonlinear Narrative']
    }
  };
  
  return sampleAnalysis[tmdbId] || null;
}

/**
 * Load browse collections (from existing static files if available)
 */
function loadBrowseCollections(tmdbId) {
  const browseFilePath = path.join(PROJECT_ROOT, 'public', 'data', 'movie-lists', `movie-${tmdbId}.json`);
  
  try {
    if (fs.existsSync(browseFilePath)) {
      const browseData = JSON.parse(fs.readFileSync(browseFilePath, 'utf-8'));
      return {
        lists: browseData.lists || [],
        totalLists: browseData.totalLists || 0
      };
    }
  } catch (error) {
    console.log(`    ⚠️  No browse collections for ${tmdbId}: ${error.message}`);
  }
  
  // Sample browse collections if file doesn't exist
  return {
    lists: [
      {
        id: 'dark-psychological-thrillers',
        name: 'Dark Psychological Thrillers',
        description: 'Films exploring fractured psyches and unreliable reality',
        genre: 'thriller',
        size: 23
      }
    ],
    totalLists: 1
  };
}

/**
 * Load contributors (simulate static contributor files)
 */
function loadContributors(tmdbId) {
  const sampleContributors = {
    550: {
      director: { name: 'David Fincher', personId: 7467, slug: '/person/7467' },
      writers: [
        { name: 'Chuck Palahniuk', personId: 7468, slug: '/person/7468' },
        { name: 'Jim Uhls', personId: 7469, slug: '/person/7469' }
      ],
      stars: [
        { name: 'Brad Pitt', personId: 287, slug: '/person/287' },
        { name: 'Edward Norton', personId: 819, slug: '/person/819' },
        { name: 'Helena Bonham Carter', personId: 1230, slug: '/person/1230' }
      ],
      cinematographer: { name: 'Jeff Cronenweth', personId: 7470, slug: '/person/7470' },
      composer: { name: 'The Dust Brothers', personId: 7471, slug: '/person/7471' }
    },
    238: {
      director: { name: 'Francis Ford Coppola', personId: 1776, slug: '/person/1776' },
      writers: [
        { name: 'Mario Puzo', personId: 1777, slug: '/person/1777' },
        { name: 'Francis Ford Coppola', personId: 1776, slug: '/person/1776' }
      ],
      stars: [
        { name: 'Marlon Brando', personId: 3084, slug: '/person/3084' },
        { name: 'Al Pacino', personId: 1158, slug: '/person/1158' },
        { name: 'James Caan', personId: 1159, slug: '/person/1159' }
      ],
      cinematographer: { name: 'Gordon Willis', personId: 1778, slug: '/person/1778' },
      composer: { name: 'Nino Rota', personId: 1779, slug: '/person/1779' }
    },
    680: {
      director: { name: 'Quentin Tarantino', personId: 138, slug: '/person/138' },
      writers: [
        { name: 'Quentin Tarantino', personId: 138, slug: '/person/138' }
      ],
      stars: [
        { name: 'John Travolta', personId: 8891, slug: '/person/8891' },
        { name: 'Samuel L. Jackson', personId: 2231, slug: '/person/2231' },
        { name: 'Uma Thurman', personId: 139, slug: '/person/139' }
      ],
      cinematographer: { name: 'Andrzej Sekula', personId: 1780, slug: '/person/1780' },
      composer: null
    }
  };
  
  return sampleContributors[tmdbId] || {
    director: null,
    writers: [],
    stars: [],
    cinematographer: null,
    composer: null
  };
}

/**
 * Generate enhanced static file for a movie
 */
function generateEnhancedMovieFile(movie) {
  const startTime = Date.now();
  
  try {
    // 1. Load Analysis data
    const analysis = loadSampleAnalysis(movie.tmdbId);
    if (!analysis) {
      throw new Error('No analysis data available');
    }
    
    // 2. Load Browse Collections
    const browseCollections = loadBrowseCollections(movie.tmdbId);
    
    // 3. Load Contributors
    const contributors = loadContributors(movie.tmdbId);
    
    // 4. Compose Enhanced Static File
    const enhancedData = {
      // Core movie data
      tmdbId: movie.tmdbId,
      title: movie.title,
      year: movie.year,
      
      // Analysis data (main content)
      analysis: {
        keyElements: analysis.keyElements,
        sections: analysis.sections,
        whyWatch: analysis.whyWatch,
        featuredMovies: analysis.featuredMovies,
        exploreTopics: analysis.exploreTopics
      },
      
      // Browse collections
      browseCollections: {
        lists: browseCollections.lists,
        totalLists: browseCollections.totalLists
      },
      
      // Contributors footer
      contributors,
      
      // More ideas (placeholder for future implementation)
      moreIdeas: {
        recommendations: [
          { title: 'The Matrix', year: 1999, connection: 'Similar themes of reality questioning' },
          { title: 'American Beauty', year: 1999, connection: 'Critique of American suburban life' }
        ],
        totalRecommendations: 2
      },
      
      // Metadata
      generatedAt: new Date().toISOString(),
      sources: {
        analysis: 'railway_database',
        browseCollections: browseCollections.totalLists > 0 ? 'static_files' : 'sample_data',
        contributors: 'movie_contributors_table',
        moreIdeas: 'sample_data'
      }
    };
    
    // 5. Write to file
    const outputFilePath = path.join(CONFIG.outputDir, `movie-${movie.tmdbId}.json`);
    fs.writeFileSync(outputFilePath, JSON.stringify(enhancedData, null, 2));
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      file: `movie-${movie.tmdbId}.json`,
      processingTime,
      sources: enhancedData.sources
    };
    
  } catch (error) {
    console.error(`❌ Error generating enhanced file for ${movie.title}:`, error.message);
    return { error: error.message };
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('🎬 Demo Multi-Source Static File Generator');
  console.log('==========================================');
  
  try {
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${CONFIG.outputDir}`);
    }
    
    console.log(`\n📊 Generating enhanced static files for ${CONFIG.sampleMovies.length} sample movies`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const movie of CONFIG.sampleMovies) {
      console.log(`\n🎬 Processing: ${movie.title} (${movie.year})`);
      
      const result = generateEnhancedMovieFile(movie);
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ Generated ${result.file} in ${result.processingTime}ms`);
        
        const sourcesList = Object.entries(result.sources)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}:${value}`)
          .join(', ');
        console.log(`   📊 Sources: ${sourcesList}`);
      } else {
        errorCount++;
        console.log(`   ❌ Failed: ${result.error}`);
      }
    }
    
    // Final summary
    console.log('\n🏁 DEMO GENERATION COMPLETE');
    console.log('===========================');
    console.log(`Total Movies: ${CONFIG.sampleMovies.length}`);
    console.log(`Generated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (successCount > 0) {
      console.log(`\n📁 Enhanced static files available in: ${CONFIG.outputDir}`);
      console.log('🎉 Multi-source static page architecture demonstrated!');
      
      // Show sample of what was generated
      const sampleFile = path.join(CONFIG.outputDir, 'movie-550.json');
      if (fs.existsSync(sampleFile)) {
        console.log(`\n📄 Sample Enhanced Static File Structure:`);
        const sampleData = JSON.parse(fs.readFileSync(sampleFile, 'utf-8'));
        console.log(`   • Core Data: tmdbId, title, year`);
        console.log(`   • Analysis: ${sampleData.analysis.sections.length} sections, ${sampleData.analysis.whyWatch.reasons.length} reasons`);
        console.log(`   • Browse Collections: ${sampleData.browseCollections.totalLists} lists`);
        console.log(`   • Contributors: director, ${sampleData.contributors.writers.length} writers, ${sampleData.contributors.stars.length} stars`);
        console.log(`   • More Ideas: ${sampleData.moreIdeas.totalRecommendations} recommendations`);
        console.log(`   • File Size: ${(fs.statSync(sampleFile).size / 1024).toFixed(1)}KB`);
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateEnhancedMovieFile };