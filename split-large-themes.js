#!/usr/bin/env node

/**
 * Split large rejected themes into focused sub-themes
 * Turn 211K rejected themes into thousands of quality lists
 */

import fs from 'fs';
import { getPool } from './lib/railway-db.js';

async function splitLargeThemes() {
  console.log('🔍 Analyzing rejected themes for intelligent splitting...');
  
  // Load aggregated data
  const aggregatedPath = './generated-lists-batch/aggregated-lists.json';
  const aggregatedData = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
  const rejectedLists = aggregatedData.rejectedLists || [];
  
  console.log(`📊 Found ${rejectedLists.length} rejected themes to analyze`);
  
  // Load movie metadata for intelligent splitting
  const pool = getPool();
  console.log('🎬 Loading movie metadata for splitting logic...');
  const movieResult = await pool.query(`
    SELECT tmdb_id, title, year, director, genres 
    FROM movies 
    WHERE tmdb_id IS NOT NULL
  `);
  
  const movieMetadata = {};
  movieResult.rows.forEach(row => {
    movieMetadata[row.tmdb_id] = {
      title: row.title,
      year: row.year,
      director: row.director,
      genres: row.genres || []
    };
  });
  
  console.log(`📋 Loaded metadata for ${Object.keys(movieMetadata).length} movies`);
  
  // Analyze splitting potential
  const splittableThemes = [];
  const decades = {};
  const directors = {};
  const genres = {};
  
  for (const theme of rejectedLists) {
    const movieCount = theme.movies?.length || 0;
    
    // Focus on themes with 31-200 movies (good splitting candidates)
    if (movieCount >= 31 && movieCount <= 200) {
      const movies = theme.movies.map(m => ({
        ...m,
        metadata: movieMetadata[m.tmdbId] || {}
      })).filter(m => m.metadata.title); // Only movies with metadata
      
      if (movies.length >= 31) {
        // Analyze splitting dimensions
        const themeAnalysis = analyzeThemeForSplitting(theme, movies);
        
        if (themeAnalysis.splittingPotential.total > 1) {
          splittableThemes.push({
            ...theme,
            movies,
            analysis: themeAnalysis
          });
        }
      }
    }
  }
  
  console.log(`\n📊 Splitting Analysis:`);
  console.log(`  Splittable themes: ${splittableThemes.length}`);
  console.log(`  Average movies per theme: ${Math.round(splittableThemes.reduce((sum, t) => sum + t.movies.length, 0) / splittableThemes.length)}`);
  
  // Generate split themes
  const splitThemes = [];
  
  for (const theme of splittableThemes.slice(0, 100)) { // Start with first 100 for testing
    const splits = generateThemeSplits(theme);
    splitThemes.push(...splits);
  }
  
  console.log(`\n🎯 Split Results:`);
  console.log(`  Original themes: ${Math.min(100, splittableThemes.length)}`);
  console.log(`  Generated splits: ${splitThemes.length}`);
  console.log(`  Average split size: ${Math.round(splitThemes.reduce((sum, t) => sum + t.movieCount, 0) / splitThemes.length)} movies`);
  
  // Filter to good size range (5-30 movies)
  const validSplits = splitThemes.filter(theme => 
    theme.movieCount >= 5 && theme.movieCount <= 30
  );
  
  console.log(`  Valid splits (5-30 movies): ${validSplits.length}`);
  
  // Show samples
  console.log(`\n🎬 Sample Split Themes:`);
  validSplits.slice(0, 10).forEach((theme, index) => {
    console.log(`${index + 1}. "${theme.listName}" (${theme.movieCount} movies)`);
    console.log(`   From: "${theme.originalTheme}" (${theme.originalCount} movies)`);
  });
  
  // Save results
  const splitResults = {
    analysis: {
      totalRejectedAnalyzed: rejectedLists.length,
      splittableCandidates: splittableThemes.length,
      processedForSplitting: Math.min(100, splittableThemes.length),
      totalSplitsGenerated: splitThemes.length,
      validSplits: validSplits.length,
      averageSplitSize: Math.round(validSplits.reduce((sum, t) => sum + t.movieCount, 0) / validSplits.length),
      potentialExtraLists: validSplits.length,
      generatedAt: new Date().toISOString()
    },
    splittableThemes: splittableThemes.slice(0, 20), // Sample for review
    validSplitThemes: validSplits,
    splitThemes: splitThemes
  };
  
  const outputPath = './generated-lists-batch/split-themes-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify(splitResults, null, 2));
  
  console.log(`\n💾 Split analysis saved: ${outputPath}`);
  console.log(`🎯 Potential to add ${validSplits.length} more quality lists from first 100 themes`);
  console.log(`📈 Extrapolated potential: ${Math.round(validSplits.length * (splittableThemes.length / 100))} additional lists`);
  
  await pool.end();
  return splitResults;
}

/**
 * Analyze a theme for splitting potential
 */
function analyzeThemeForSplitting(theme, movies) {
  const decades = {};
  const directors = {};
  const genres = {};
  const years = {};
  
  movies.forEach(movie => {
    const meta = movie.metadata;
    
    // Decade analysis
    if (meta.year) {
      const decade = Math.floor(meta.year / 10) * 10;
      decades[decade] = (decades[decade] || 0) + 1;
    }
    
    // Director analysis
    if (meta.director) {
      directors[meta.director] = (directors[meta.director] || 0) + 1;
    }
    
    // Genre analysis
    if (meta.genres && Array.isArray(meta.genres)) {
      meta.genres.forEach(genre => {
        genres[genre] = (genres[genre] || 0) + 1;
      });
    }
  });
  
  // Count viable splits (need at least 5 movies each)
  const viableDecades = Object.entries(decades).filter(([_, count]) => count >= 5).length;
  const viableDirectors = Object.entries(directors).filter(([_, count]) => count >= 5).length;
  const viableGenres = Object.entries(genres).filter(([_, count]) => count >= 5).length;
  
  return {
    decades,
    directors, 
    genres,
    splittingPotential: {
      byDecade: viableDecades,
      byDirector: Math.min(viableDirectors, 5), // Cap at 5 director splits
      byGenre: Math.min(viableGenres, 3), // Cap at 3 genre splits  
      total: Math.max(viableDecades, Math.min(viableDirectors, 5), Math.min(viableGenres, 3))
    }
  };
}

/**
 * Generate actual split themes from a large theme
 */
function generateThemeSplits(theme) {
  const splits = [];
  const movies = theme.movies;
  const analysis = theme.analysis;
  
  // Split by decade if viable
  if (analysis.splittingPotential.byDecade >= 2) {
    Object.entries(analysis.decades).forEach(([decade, count]) => {
      if (count >= 5 && count <= 30) {
        const decadeMovies = movies.filter(m => {
          const movieDecade = Math.floor((m.metadata.year || 0) / 10) * 10;
          return movieDecade == decade;
        });
        
        splits.push({
          listName: `${decade}s ${theme.listName}`,
          slug: `${decade}s-${theme.slug}`,
          description: `${theme.description} from the ${decade}s`,
          category: theme.category,
          movieCount: decadeMovies.length,
          movies: decadeMovies,
          splitType: 'decade',
          originalTheme: theme.listName,
          originalCount: movies.length
        });
      }
    });
  }
  
  // Split by director if no decade splits and viable
  else if (analysis.splittingPotential.byDirector >= 2) {
    const topDirectors = Object.entries(analysis.directors)
      .filter(([_, count]) => count >= 5 && count <= 30)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5); // Top 5 directors max
    
    topDirectors.forEach(([director, count]) => {
      const directorMovies = movies.filter(m => m.metadata.director === director);
      
      splits.push({
        listName: `${director} ${theme.listName}`,
        slug: `${director.toLowerCase().replace(/\s+/g, '-')}-${theme.slug}`,
        description: `${theme.description} directed by ${director}`,
        category: theme.category,
        movieCount: directorMovies.length,
        movies: directorMovies,
        splitType: 'director',
        originalTheme: theme.listName,
        originalCount: movies.length
      });
    });
  }
  
  // Split by genre if no other viable splits
  else if (analysis.splittingPotential.byGenre >= 2) {
    const topGenres = Object.entries(analysis.genres)
      .filter(([_, count]) => count >= 5 && count <= 30)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3); // Top 3 genres max
    
    topGenres.forEach(([genre, count]) => {
      const genreMovies = movies.filter(m => 
        m.metadata.genres && m.metadata.genres.includes(genre)
      );
      
      splits.push({
        listName: `${genre} ${theme.listName}`,
        slug: `${genre.toLowerCase()}-${theme.slug}`,
        description: `${theme.description} in the ${genre.toLowerCase()} genre`,
        category: theme.category,
        movieCount: genreMovies.length,
        movies: genreMovies,
        splitType: 'genre',
        originalTheme: theme.listName,
        originalCount: movies.length
      });
    });
  }
  
  return splits;
}

// Run the splitting analysis
splitLargeThemes()
  .then(results => {
    console.log('\n🎉 Theme splitting analysis complete!');
    console.log(`📈 Potential for ${results.analysis.potentialExtraLists} additional quality lists`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Theme splitting failed:', error.message);
    process.exit(1);
  });