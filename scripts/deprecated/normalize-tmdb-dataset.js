// Normalize TMDB data for all movies in production database
// Creates a unified dataset with UUID -> TMDB ID -> Movie Details mapping

import dotenv from 'dotenv';
import fs from 'fs';
import { getPool } from './lib/railway-db.js';

dotenv.config({ path: '.env.local' });

class TMDBDataNormalizer {
  constructor() {
    this.pool = getPool();
    this.progress = {
      totalMovies: 0,
      processed: 0,
      withTMDB: 0,
      withoutTMDB: 0,
      categories: {}
    };
  }

  async normalizeAllMovies() {
    console.log('🎬 TMDB Data Normalization Starting...');
    console.log('═══════════════════════════════════════');
    
    // Get total count
    const countResult = await this.pool.query('SELECT COUNT(*) as total FROM movies');
    this.progress.totalMovies = parseInt(countResult.rows[0].total);
    
    console.log(`📊 Total movies in database: ${this.progress.totalMovies.toLocaleString()}`);
    
    // Load existing categorization
    const categorization = JSON.parse(fs.readFileSync('./movie-categorization.json', 'utf8'));
    console.log(`📊 Categories: ${Object.keys(categorization.categories).length}`);
    
    // Create normalized dataset
    const normalizedData = {
      movies: {},
      categories: {},
      stats: {
        totalMovies: 0,
        moviesWithTMDB: 0,
        moviesWithoutTMDB: 0,
        categories: 0
      }
    };
    
    console.log('\n🔄 Fetching all movie data...');
    
    // Batch fetch all movies
    const batchSize = 1000;
    let offset = 0;
    
    while (offset < this.progress.totalMovies) {
      const query = `
        SELECT 
          id,
          title,
          year,
          tmdb_id,
          created_at
        FROM movies 
        ORDER BY title
        LIMIT $1 OFFSET $2
      `;
      
      const result = await this.pool.query(query, [batchSize, offset]);
      
      for (const movie of result.rows) {
        const movieData = {
          id: movie.id,
          title: movie.title,
          year: movie.year,
          tmdbId: movie.tmdb_id,
          createdAt: movie.created_at
        };
        
        normalizedData.movies[movie.id] = movieData;
        
        if (movie.tmdb_id) {
          this.progress.withTMDB++;
        } else {
          this.progress.withoutTMDB++;
        }
        
        this.progress.processed++;
      }
      
      offset += batchSize;
      const percent = Math.round((offset / this.progress.totalMovies) * 100);
      console.log(`📝 Processed ${offset.toLocaleString()}/${this.progress.totalMovies.toLocaleString()} movies (${percent}%) - TMDB: ${this.progress.withTMDB}, No TMDB: ${this.progress.withoutTMDB}`);
    }
    
    console.log('\n🔄 Normalizing categories...');
    
    // Normalize categories with full movie data
    for (const [categoryName, movieUUIDs] of Object.entries(categorization.categories)) {
      // Skip Animation - will be handled separately
      if (categoryName === 'Animation') {
        console.log(`📝 ${categoryName}: Skipped (will be handled separately)`);
        continue;
      }
      
      const categoryMovies = [];
      const seenTMDBIds = new Set();
      let foundMovies = 0;
      let missingMovies = 0;
      let duplicates = 0;
      
      for (const uuid of movieUUIDs) {
        const movieData = normalizedData.movies[uuid];
        if (movieData) {
          // Dedupe by TMDB ID
          if (movieData.tmdbId && seenTMDBIds.has(movieData.tmdbId)) {
            duplicates++;
            continue;
          }
          
          categoryMovies.push(movieData);
          if (movieData.tmdbId) {
            seenTMDBIds.add(movieData.tmdbId);
          }
          foundMovies++;
        } else {
          missingMovies++;
        }
      }
      
      normalizedData.categories[categoryName] = {
        movieCount: categoryMovies.length,
        moviesWithTMDB: categoryMovies.filter(m => m.tmdbId).length,
        movies: categoryMovies.sort((a, b) => a.title.localeCompare(b.title))
      };
      
      const dupMsg = duplicates > 0 ? `, ${duplicates} duplicates removed` : '';
      console.log(`📝 ${categoryName}: ${foundMovies} movies found, ${missingMovies} missing from DB${dupMsg}`);
      this.progress.categories[categoryName] = { found: foundMovies, missing: missingMovies, duplicates };
    }
    
    // Update stats
    normalizedData.stats = {
      totalMovies: this.progress.processed,
      moviesWithTMDB: this.progress.withTMDB,
      moviesWithoutTMDB: this.progress.withoutTMDB,
      categories: Object.keys(normalizedData.categories).length,
      generatedAt: new Date().toISOString()
    };
    
    // Save normalized dataset
    console.log('\n💾 Saving normalized dataset...');
    fs.writeFileSync('./tmdb-normalized-dataset.json', JSON.stringify(normalizedData, null, 2));
    
    // Generate category-specific files for the browse collection system
    console.log('\n📁 Generating category files...');
    const categoryDir = './normalized-categories';
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir);
    }
    
    for (const [categoryName, categoryData] of Object.entries(normalizedData.categories)) {
      const categoryFile = {
        movieCount: categoryData.movieCount,
        category: categoryName,
        movieData: categoryData.movies.map(movie => ({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          tmdbId: movie.tmdbId
        }))
      };
      
      const filename = `${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-normalized.json`;
      fs.writeFileSync(`${categoryDir}/${filename}`, JSON.stringify(categoryFile, null, 2));
    }
    
    this.printSummary(normalizedData);
    return normalizedData;
  }
  
  printSummary(data) {
    console.log('\n🎯 NORMALIZATION COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total Movies: ${data.stats.totalMovies.toLocaleString()}`);
    console.log(`✅ With TMDB ID: ${data.stats.moviesWithTMDB.toLocaleString()} (${Math.round(data.stats.moviesWithTMDB/data.stats.totalMovies*100)}%)`);
    console.log(`❌ Without TMDB ID: ${data.stats.moviesWithoutTMDB.toLocaleString()} (${Math.round(data.stats.moviesWithoutTMDB/data.stats.totalMovies*100)}%)`);
    console.log(`📂 Categories: ${data.stats.categories}`);
    console.log('');
    console.log('📁 Files created:');
    console.log('  - tmdb-normalized-dataset.json (complete dataset)');
    console.log('  - normalized-categories/ (individual category files)');
    console.log('');
    console.log('🚀 Ready for browse collection generation!');
  }
}

async function main() {
  const normalizer = new TMDBDataNormalizer();
  
  try {
    await normalizer.normalizeAllMovies();
    process.exit(0);
  } catch (error) {
    console.error('💥 Normalization failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}