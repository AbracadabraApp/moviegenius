#!/usr/bin/env node

// Cache warming script for MovieGenius
// Progressively warms all 8k movies for instant UX

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CACHE_WARMING_TOKEN = process.env.CACHE_WARMING_TOKEN || 'dev-token';

class CacheWarmer {
  constructor() {
    this.baseUrl = BASE_URL;
    this.headers = {
      'Authorization': `Bearer ${CACHE_WARMING_TOKEN}`,
      'Content-Type': 'application/json'
    };
    this.stats = {
      moviesWarmed: 0,
      postersWarmed: 0,
      analysesWarmed: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const requestOptions = {
        method: options.method || 'GET',
        headers: { ...this.headers, ...options.headers }
      };

      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async warmMovies(batchSize = 50, maxBatches = 0) {
    console.log('🔥 Starting movie cache warming...');
    
    let offset = 0;
    let batch = 1;
    
    while (true) {
      try {
        const response = await this.makeRequest('/api/cache-warming', {
          method: 'POST',
          body: {
            type: 'all-movies',
            batchSize,
            offset
          }
        });

        if (response.status !== 200) {
          console.error(`❌ Batch ${batch} failed:`, response.data);
          this.stats.errors++;
          break;
        }

        const result = response.data;
        this.stats.moviesWarmed += result.batch.warmed;
        
        console.log(`✅ Batch ${batch}: Warmed ${result.batch.warmed}/${result.batch.processed} movies (${result.duration})`);

        // Stop if we processed fewer movies than batch size (end of data)
        if (result.batch.processed < batchSize) {
          console.log('🎉 All movies cached!');
          break;
        }

        // Stop if we hit max batches limit
        if (maxBatches > 0 && batch >= maxBatches) {
          console.log(`🛑 Reached max batches limit (${maxBatches})`);
          break;
        }

        offset += batchSize;
        batch++;
        
        // Rate limiting delay
        await this.sleep(1000);
        
      } catch (error) {
        console.error(`❌ Batch ${batch} error:`, error.message);
        this.stats.errors++;
        break;
      }
    }
  }

  async warmPosters(batchSize = 20, maxBatches = 0) {
    console.log('🖼️  Starting poster cache warming...');
    
    let offset = 0;
    let batch = 1;
    
    while (true) {
      try {
        const response = await this.makeRequest('/api/cache-warming', {
          method: 'POST',
          body: {
            type: 'posters',
            batchSize,
            offset
          }
        });

        if (response.status !== 200) {
          console.error(`❌ Poster batch ${batch} failed:`, response.data);
          this.stats.errors++;
          break;
        }

        const result = response.data;
        this.stats.postersWarmed += result.batch.warmed;
        
        console.log(`✅ Poster batch ${batch}: Warmed ${result.batch.warmed}/${result.batch.processed} posters (${result.duration})`);

        if (result.batch.processed < batchSize) {
          console.log('🎉 All posters cached!');
          break;
        }

        if (maxBatches > 0 && batch >= maxBatches) {
          console.log(`🛑 Reached max poster batches limit (${maxBatches})`);
          break;
        }

        offset += batchSize;
        batch++;
        
        // Rate limiting delay for poster optimization
        await this.sleep(2000);
        
      } catch (error) {
        console.error(`❌ Poster batch ${batch} error:`, error.message);
        this.stats.errors++;
        break;
      }
    }
  }

  async warmPopular() {
    console.log('⭐ Warming popular content...');
    
    try {
      const response = await this.makeRequest('/api/cache-warming', {
        method: 'POST',
        body: { type: 'popular' }
      });

      if (response.status === 200) {
        console.log(`✅ Popular content warmed: ${response.data.totalWarmed} movies`);
        this.stats.moviesWarmed += response.data.totalWarmed;
      } else {
        console.error('❌ Popular warming failed:', response.data);
        this.stats.errors++;
      }
    } catch (error) {
      console.error('❌ Popular warming error:', error.message);
      this.stats.errors++;
    }
  }

  async warmSeries() {
    console.log('📺 Warming series content...');
    
    try {
      const response = await this.makeRequest('/api/cache-warming', {
        method: 'POST',
        body: { type: 'series' }
      });

      if (response.status === 200) {
        console.log(`✅ Series content warmed: ${response.data.totalWarmed} movies`);
        this.stats.moviesWarmed += response.data.totalWarmed;
      } else {
        console.error('❌ Series warming failed:', response.data);
        this.stats.errors++;
      }
    } catch (error) {
      console.error('❌ Series warming error:', error.message);
      this.stats.errors++;
    }
  }

  async getCacheStatus() {
    try {
      const response = await this.makeRequest('/api/cache-warming', {
        method: 'POST',
        body: { type: 'status' }
      });

      if (response.status === 200) {
        return response.data.cache;
      }
    } catch (error) {
      console.error('❌ Cache status error:', error.message);
    }
    
    return null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printStats() {
    const duration = Date.now() - this.stats.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log('\n📊 Cache Warming Summary:');
    console.log(`⏱️  Duration: ${minutes}m ${seconds}s`);
    console.log(`🎬 Movies warmed: ${this.stats.moviesWarmed}`);
    console.log(`🖼️  Posters warmed: ${this.stats.postersWarmed}`);
    console.log(`🧠 Analyses warmed: ${this.stats.analysesWarmed}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const warmer = new CacheWarmer();

  switch (command) {
    case 'popular':
      await warmer.warmPopular();
      break;
      
    case 'series':
      await warmer.warmSeries();
      break;
      
    case 'movies':
      const movieBatches = parseInt(args[1]) || 0;
      await warmer.warmMovies(50, movieBatches);
      break;
      
    case 'posters':
      const posterBatches = parseInt(args[1]) || 0;
      await warmer.warmPosters(20, posterBatches);
      break;
      
    case 'all':
      await warmer.warmPopular();
      await warmer.warmSeries();
      await warmer.warmMovies(50, 10); // First 500 movies
      await warmer.warmPosters(20, 10); // First 200 posters
      break;
      
    case 'status':
      const status = await warmer.getCacheStatus();
      if (status) {
        console.log('📊 Cache Status:', JSON.stringify(status, null, 2));
      }
      break;
      
    case 'help':
    default:
      console.log(`
🔥 MovieGenius Cache Warmer

Usage: node scripts/warm-cache.js <command> [options]

Commands:
  popular          Warm AFI and recent movies (high priority)
  series           Warm all Cinema Through Time series movies
  movies [limit]   Warm all movie data (optional: max batches)
  posters [limit]  Warm all poster images (optional: max batches)
  all              Warm popular + series + subset of movies/posters
  status           Show current cache statistics
  help             Show this help

Examples:
  node scripts/warm-cache.js popular
  node scripts/warm-cache.js movies 5
  node scripts/warm-cache.js all
  
Environment Variables:
  BASE_URL              Target URL (default: http://localhost:3000)
  CACHE_WARMING_TOKEN   Auth token for warming API
      `);
      return;
  }

  warmer.printStats();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CacheWarmer;