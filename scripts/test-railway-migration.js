#!/usr/bin/env node
// Railway Migration Testing Script
// Comprehensive testing of all Railway PostgreSQL endpoints after migration

import { MovieService, EpisodeService, CacheService, PersonService, getPool } from '../lib/railway-db.js';

class RailwayMigrationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: []
    };
  }

  async runAllTests() {
    console.log('🧪 Railway Migration Testing Suite');
    console.log('==================================');
    console.log('');

    await this.testDatabaseConnection();
    await this.testMovieService();
    await this.testEpisodeService();
    await this.testPersonService();
    await this.testCacheService();
    await this.testAPIEndpoints();

    this.printSummary();
    
    return this.results.failed === 0;
  }

  async testDatabaseConnection() {
    console.log('🔌 Testing Database Connection');
    console.log('------------------------------');

    try {
      const pool = getPool();
      const client = await pool.connect();
      
      // Test basic query
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      client.release();
      
      if (result.rows.length > 0) {
        console.log('✅ Database connection successful');
        console.log(`   Database time: ${result.rows[0].current_time}`);
        console.log(`   Version: ${result.rows[0].db_version.split(' ')[0]}`);
        this.results.passed++;
      } else {
        throw new Error('No result from database query');
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.results.failed++;
      this.results.errors.push(`Database connection: ${error.message}`);
    }
    
    console.log('');
  }

  async testMovieService() {
    console.log('🎬 Testing MovieService');
    console.log('-----------------------');

    const tests = [
      {
        name: 'Get movie by TMDB ID',
        test: async () => {
          const movie = await MovieService.getMovieByTMDBId(550); // Fight Club
          return movie && movie.title && movie.tmdb_id === 550;
        }
      },
      {
        name: 'Search movies',
        test: async () => {
          const movies = await MovieService.searchMovies('matrix', 5);
          return Array.isArray(movies) && movies.length >= 0;
        }
      },
      {
        name: 'Get movies with TMDB data',
        test: async () => {
          const movies = await MovieService.getMoviesWithTMDB();
          return Array.isArray(movies);
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result) {
          console.log(`✅ ${test.name}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${test.name} - returned false`);
          this.results.failed++;
        }
      } catch (error) {
        console.error(`❌ ${test.name} - error: ${error.message}`);
        this.results.failed++;
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }

    console.log('');
  }

  async testEpisodeService() {
    console.log('📺 Testing EpisodeService');
    console.log('-------------------------');

    const tests = [
      {
        name: 'Get all episodes',
        test: async () => {
          const episodes = await EpisodeService.getAllEpisodes();
          return Array.isArray(episodes);
        }
      },
      {
        name: 'Search episodes',
        test: async () => {
          const episodes = await EpisodeService.searchEpisodes('action', 5);
          return Array.isArray(episodes);
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result) {
          console.log(`✅ ${test.name}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${test.name} - returned false`);
          this.results.failed++;
        }
      } catch (error) {
        console.error(`❌ ${test.name} - error: ${error.message}`);
        this.results.failed++;
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }

    console.log('');
  }

  async testPersonService() {
    console.log('👥 Testing PersonService');
    console.log('------------------------');

    const tests = [
      {
        name: 'Search persons',
        test: async () => {
          const persons = await PersonService.searchPersons('smith', 5);
          return Array.isArray(persons);
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result) {
          console.log(`✅ ${test.name}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${test.name} - returned false`);
          this.results.failed++;
        }
      } catch (error) {
        console.error(`❌ ${test.name} - error: ${error.message}`);
        this.results.failed++;
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }

    console.log('');
  }

  async testCacheService() {
    console.log('🗄️  Testing CacheService');
    console.log('------------------------');

    const tests = [
      {
        name: 'Set and get cache',
        test: async () => {
          const testHash = 'test-' + Date.now();
          const testData = { test: true, timestamp: Date.now() };
          const expires = new Date(Date.now() + 3600000); // 1 hour
          
          // Set cache
          await CacheService.setCache(testHash, 'test query', testData, 'test', expires);
          
          // Get cache
          const cached = await CacheService.getCache(testHash);
          return cached && cached.query_hash === testHash;
        }
      },
      {
        name: 'Clear expired cache',
        test: async () => {
          const cleared = await CacheService.clearExpiredCache();
          return typeof cleared === 'number'; // Should return count of deleted rows
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result) {
          console.log(`✅ ${test.name}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${test.name} - returned false`);
          this.results.failed++;
        }
      } catch (error) {
        console.error(`❌ ${test.name} - error: ${error.message}`);
        this.results.failed++;
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }

    console.log('');
  }

  async testAPIEndpoints() {
    console.log('🌐 Testing API Endpoints');
    console.log('------------------------');

    if (typeof fetch === 'undefined') {
      console.log('⚠️  Skipping API tests - fetch not available in Node.js environment');
      console.log('   Run these tests in a browser or with node --experimental-fetch');
      this.results.warnings.push('API endpoint tests skipped - fetch not available');
      return;
    }

    const baseUrl = process.env.HOST || 'http://localhost:3000';
    
    const endpoints = [
      {
        name: 'Movie Analysis API',
        url: `${baseUrl}/api/movie-analysis?tmdbId=550`,
        validate: (data) => data.success && data.movie && data.movie.tmdb_id === 550
      },
      {
        name: 'Nuclear Status API', 
        url: `${baseUrl}/api/nuclear-status`,
        validate: (data) => data && typeof data === 'object'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();
        
        if (response.ok && endpoint.validate(data)) {
          console.log(`✅ ${endpoint.name}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${endpoint.name} - status: ${response.status}`);
          this.results.failed++;
          this.results.errors.push(`${endpoint.name}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ ${endpoint.name} - error: ${error.message}`);
        this.results.failed++;
        this.results.errors.push(`${endpoint.name}: ${error.message}`);
      }
    }

    console.log('');
  }

  printSummary() {
    console.log('📊 Test Results Summary');
    console.log('=======================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings.length}`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Railway migration is successful.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the errors below:');
      this.results.errors.forEach(error => console.log(`   • ${error}`));
    }

    if (this.results.warnings.length > 0) {
      console.log('\nWarnings:');
      this.results.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    console.log('\n🔧 Recommended next steps:');
    if (this.results.failed === 0) {
      console.log('1. Remove Supabase dependencies from package.json');
      console.log('2. Update production environment variables');
      console.log('3. Deploy to Railway');
      console.log('4. Run production smoke tests');
    } else {
      console.log('1. Fix failing tests before proceeding');
      console.log('2. Check database schema and data migration');
      console.log('3. Verify environment variables');
      console.log('4. Re-run tests');
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log('Railway Migration Testing Script');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/test-railway-migration.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h       Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  RAILWAY_DATABASE_URL    Railway PostgreSQL connection string');
    console.log('  HOST                   Base URL for API testing (default: http://localhost:3000)');
    console.log('');
    return;
  }

  const tester = new RailwayMigrationTester();
  const success = await tester.runAllTests();
  
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RailwayMigrationTester };