#!/usr/bin/env node

/**
 * Transform Musical Build Data to Production Browse Structure
 * 
 * Converts musical-master-lists.json (501 raw lists) into production
 * browse_lists and list_movies database tables.
 * 
 * Process:
 * 1. Load musical build data 
 * 2. Filter lists with <6 movies
 * 3. Generate browse UUIDs and descriptions
 * 4. Map movie UUIDs to database movie IDs  
 * 5. Insert into production browse schema
 * 6. Create indexes for fast lookups
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getPool } from './lib/railway-db.js';

class MusicalBrowseTransformer {
  constructor() {
    this.pool = getPool();
    this.movieIdMap = new Map(); // UUID to database ID mapping
    this.transformedLists = [];
    this.skippedLists = [];
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [${level}] ${message}${Object.keys(data).length ? ' ' + JSON.stringify(data) : ''}`);
  }

  // Load and validate build data
  loadBuildData() {
    const buildFile = path.join(__dirname, 'musical-fresh-start', 'musical-master-lists.json');
    
    if (!fs.existsSync(buildFile)) {
      throw new Error(`Build data not found: ${buildFile}`);
    }
    
    const data = JSON.parse(fs.readFileSync(buildFile, 'utf8'));
    this.log('INFO', `Loaded build data: ${data.totalLists} lists, ${data.totalMoviesProcessed} movies processed`);
    
    return data.allLists;
  }

  // Create movie UUID to database ID mapping
  async buildMovieIdMapping(movieUuids) {
    const uniqueUuids = [...new Set(movieUuids)];
    this.log('INFO', `Building movie ID mapping for ${uniqueUuids.length} unique UUIDs`);
    
    // Query database for movie records by UUID
    // Note: Assuming the UUID in categorization matches a field in the database
    // We may need to adjust this query based on actual database structure
    const query = `
      SELECT id, tmdb_id, title, year 
      FROM movies 
      WHERE id = ANY($1::uuid[])
    `;
    
    try {
      const result = await this.pool.query(query, [uniqueUuids]);
      
      result.rows.forEach(movie => {
        this.movieIdMap.set(movie.id, {
          db_id: movie.id,
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year
        });
      });
      
      this.log('INFO', `Mapped ${result.rows.length}/${uniqueUuids.length} movie UUIDs to database records`);
      
      // Log missing movies
      const foundUuids = new Set(result.rows.map(row => row.id));
      const missingUuids = uniqueUuids.filter(uuid => !foundUuids.has(uuid));
      if (missingUuids.length > 0) {
        this.log('WARN', `Missing movies in database: ${missingUuids.length} UUIDs not found`);
      }
      
    } catch (error) {
      this.log('ERROR', `Failed to build movie ID mapping: ${error.message}`);
      throw error;
    }
  }

  // Generate description for browse list based on name and sample movies
  generateDescription(listName, movieSample) {
    // Simple description generation - could be enhanced with AI
    const sampleTitles = movieSample.slice(0, 3).map(movie => 
      `"${movie.title}" (${movie.year})`
    ).join(', ');
    
    return `${listName}. Featured films include: ${sampleTitles}${movieSample.length > 3 ? ` and ${movieSample.length - 3} more` : ''}.`;
  }

  // Create slug from list name
  createSlug(listName) {
    return listName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Transform raw list to production format
  transformList(rawList) {
    // Filter out movies not found in database
    const validMovies = rawList.movieIds
      .map(uuid => this.movieIdMap.get(uuid))
      .filter(movie => movie !== undefined);
    
    // Skip lists with <6 valid movies
    if (validMovies.length < 6) {
      this.skippedLists.push({
        name: rawList.name,
        originalCount: rawList.movieIds.length,
        validCount: validMovies.length,
        reason: 'too_few_movies'
      });
      return null;
    }
    
    const browseId = crypto.randomUUID();
    const slug = this.createSlug(rawList.name);
    const description = this.generateDescription(rawList.name, validMovies);
    
    return {
      id: browseId,
      title: rawList.name,
      description: description,
      slug: slug,
      genre: 'Musical', // Primary facet
      total_movies: validMovies.length,
      status: 'active',
      movies: validMovies.map((movie, index) => ({
        movie_id: movie.db_id,
        tmdb_id: movie.tmdb_id, // For reference
        title: movie.title,     // For reference
        year: movie.year,       // For reference
        relevance_score: 1.0,   // Default - could be enhanced
        display_order: index + 1
      }))
    };
  }

  // Insert transformed lists into database
  async insertProductionData() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      this.log('INFO', `Inserting ${this.transformedLists.length} browse lists into database`);
      
      for (const list of this.transformedLists) {
        // Insert browse list
        const browseQuery = `
          INSERT INTO browse_lists (
            id, title, description, total_movies, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `;
        
        await client.query(browseQuery, [
          list.id,
          list.title, 
          list.description,
          list.total_movies,
          list.status
        ]);
        
        // Insert list movies
        for (const movie of list.movies) {
          const movieQuery = `
            INSERT INTO list_movies (
              list_id, movie_id, relevance_score, display_order, added_at
            ) VALUES ($1, $2, $3, $4, NOW())
          `;
          
          await client.query(movieQuery, [
            list.id,
            movie.movie_id,
            movie.relevance_score,
            movie.display_order
          ]);
        }
        
        this.log('INFO', `Inserted: "${list.title}" (${list.total_movies} movies)`);
      }
      
      await client.query('COMMIT');
      this.log('INFO', '✅ All browse lists inserted successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.log('ERROR', `Database insertion failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create lookup indexes for fast queries
  async createIndexes() {
    this.log('INFO', 'Creating lookup indexes...');
    
    const indexes = [
      // TMDB → Browse lists lookup
      'CREATE INDEX IF NOT EXISTS idx_tmdb_to_browse ON list_movies(movie_id)',
      
      // Browse → Movies lookup  
      'CREATE INDEX IF NOT EXISTS idx_browse_to_movies ON list_movies(list_id, display_order)',
      
      // Browse list title search
      'CREATE INDEX IF NOT EXISTS idx_browse_title_search ON browse_lists USING gin(to_tsvector(\'english\', title))',
      
      // Active browse lists
      'CREATE INDEX IF NOT EXISTS idx_browse_active ON browse_lists(status) WHERE status = \'active\''
    ];
    
    for (const indexSql of indexes) {
      try {
        await this.pool.query(indexSql);
        this.log('INFO', `✅ Index created: ${indexSql.match(/idx_[a-z_]+/)?.[0] || 'unknown'}`);
      } catch (error) {
        this.log('WARN', `Index creation warning: ${error.message}`);
      }
    }
  }

  // Generate transformation report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      transformation_summary: {
        total_raw_lists: this.transformedLists.length + this.skippedLists.length,
        production_lists_created: this.transformedLists.length,
        lists_filtered_out: this.skippedLists.length,
        total_movies_in_production: this.transformedLists.reduce((sum, list) => sum + list.total_movies, 0),
        unique_movies_count: new Set(
          this.transformedLists.flatMap(list => list.movies.map(movie => movie.movie_id))
        ).size
      },
      filtered_lists: this.skippedLists,
      sample_production_lists: this.transformedLists.slice(0, 5).map(list => ({
        title: list.title,
        movie_count: list.total_movies,
        sample_movies: list.movies.slice(0, 3).map(m => `${m.title} (${m.year})`)
      }))
    };
    
    // Save report
    const reportFile = path.join(__dirname, 'musical-transformation-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log('INFO', '📊 Transformation Report:');
    this.log('INFO', `  Raw lists: ${report.transformation_summary.total_raw_lists}`);
    this.log('INFO', `  Production lists: ${report.transformation_summary.production_lists_created}`);
    this.log('INFO', `  Filtered out: ${report.transformation_summary.lists_filtered_out}`);
    this.log('INFO', `  Total movies: ${report.transformation_summary.total_movies_in_production}`);
    this.log('INFO', `  Unique movies: ${report.transformation_summary.unique_movies_count}`);
    this.log('INFO', `  Report saved: ${reportFile}`);
    
    return report;
  }

  // Main transformation process
  async transform() {
    this.log('INFO', '🎵 Starting Musical browse list transformation...');
    
    try {
      // Load build data
      const rawLists = this.loadBuildData();
      
      // Extract all movie UUIDs
      const allMovieUuids = rawLists.flatMap(list => list.movieIds);
      
      // Build movie mapping
      await this.buildMovieIdMapping(allMovieUuids);
      
      // Transform lists
      this.log('INFO', `Transforming ${rawLists.length} raw lists...`);
      for (const rawList of rawLists) {
        const transformedList = this.transformList(rawList);
        if (transformedList) {
          this.transformedLists.push(transformedList);
        }
      }
      
      // Insert into database
      if (this.transformedLists.length > 0) {
        await this.insertProductionData();
        await this.createIndexes();
      } else {
        this.log('WARN', 'No lists to insert into database');
      }
      
      // Generate report
      const report = this.generateReport();
      
      this.log('INFO', '🎉 Musical transformation completed successfully!');
      return report;
      
    } catch (error) {
      this.log('ERROR', `Transformation failed: ${error.message}`);
      throw error;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const transformer = new MusicalBrowseTransformer();
  
  transformer.transform()
    .then(report => {
      console.log('\n✅ Transformation successful!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Transformation failed:', error.message);
      process.exit(1);
    });
}

export default MusicalBrowseTransformer;