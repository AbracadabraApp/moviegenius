#!/usr/bin/env node

/**
 * Cache Health Check for MovieGenius
 * 
 * Monitors cache performance and provides insights for optimization.
 * Perfect for low-traffic sites to ensure maximum speed.
 */

import { getCache } from '../lib/cache.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

class CacheHealthChecker {
  constructor() {
    this.cache = getCache();
  }

  async checkRedisConnection() {
    console.log('🔗 Checking Redis connection...');
    
    try {
      const isAvailable = await this.cache.isRedisAvailable();
      
      if (isAvailable) {
        console.log('✅ Redis connection: HEALTHY');
        
        // Test basic operations
        const testKey = 'health_check_' + Date.now();
        const testValue = { test: 'data', timestamp: new Date().toISOString() };
        
        await this.cache.set(testKey, testValue, 60); // 1 minute TTL
        const retrieved = await this.cache.get(testKey);
        
        if (retrieved && retrieved.test === 'data') {
          console.log('✅ Redis operations: HEALTHY');
        } else {
          console.log('⚠️  Redis operations: DEGRADED');
        }
        
        return true;
      } else {
        console.log('❌ Redis connection: UNAVAILABLE');
        console.log('💡 Site will work but without caching benefits');
        return false;
      }
    } catch (error) {
      console.log('❌ Redis connection: ERROR');
      console.log(`   Error: ${error.message}`);
      return false;
    }
  }

  async checkCacheStats() {
    console.log('\n📊 Cache Performance Stats:');
    console.log('─'.repeat(30));
    
    try {
      const stats = this.cache.stats;
      
      const totalRequests = stats.totalRequests || 0;
      const hits = stats.hits || 0;
      const misses = stats.misses || 0;
      const errors = stats.errors || 0;
      
      const hitRate = totalRequests > 0 ? (hits / totalRequests * 100).toFixed(1) : '0.0';
      
      console.log(`Total Requests: ${totalRequests.toLocaleString()}`);
      console.log(`Cache Hits: ${hits.toLocaleString()}`);
      console.log(`Cache Misses: ${misses.toLocaleString()}`);
      console.log(`Cache Errors: ${errors.toLocaleString()}`);
      console.log(`Hit Rate: ${hitRate}%`);
      
      // Performance assessment
      if (parseFloat(hitRate) >= 80) {
        console.log('🚀 Performance: EXCELLENT');
      } else if (parseFloat(hitRate) >= 60) {
        console.log('👍 Performance: GOOD');
      } else if (parseFloat(hitRate) >= 40) {
        console.log('⚠️  Performance: NEEDS IMPROVEMENT');
      } else {
        console.log('❌ Performance: POOR - Consider cache warming');
      }
      
    } catch (error) {
      console.log('❌ Unable to retrieve cache stats');
      console.log(`   Error: ${error.message}`);
    }
  }

  async sampleCacheContents() {
    console.log('\n🔍 Sample Cache Contents:');
    console.log('─'.repeat(25));
    
    try {
      // Try to find some cached movie analysis
      const testMovies = [
        'Fight Club_1999',
        'The Matrix_1999', 
        'Pulp Fiction_1994',
        'The Godfather_1972',
        'Inception_2010'
      ];
      
      let foundCached = 0;
      
      for (const movieKey of testMovies) {
        const cacheKey = `movie_analysis:${movieKey}:complete_analysis`;
        const cached = await this.cache.get(cacheKey);
        
        if (cached) {
          console.log(`✅ ${movieKey.replace('_', ' (')}) - CACHED`);
          foundCached++;
        } else {
          console.log(`❌ ${movieKey.replace('_', ' (')}) - NOT CACHED`);
        }
      }
      
      if (foundCached === 0) {
        console.log('💡 No sample movies cached. Consider running cache warming:');
        console.log('   node scripts/cache-warming.js');
      } else {
        console.log(`📊 Found ${foundCached}/${testMovies.length} sample movies cached`);
      }
      
    } catch (error) {
      console.log('❌ Unable to sample cache contents');
      console.log(`   Error: ${error.message}`);
    }
  }

  async generateRecommendations() {
    console.log('\n💡 Optimization Recommendations:');
    console.log('─'.repeat(35));
    
    const isRedisHealthy = await this.cache.isRedisAvailable();
    
    if (!isRedisHealthy) {
      console.log('🔧 Fix Redis connection for caching benefits');
      console.log('🔧 Check REDIS_URL environment variable');
      return;
    }
    
    const stats = this.cache.stats;
    const hitRate = stats.totalRequests > 0 ? (stats.hits / stats.totalRequests * 100) : 0;
    
    if (hitRate < 60) {
      console.log('🔥 Run cache warming for popular content:');
      console.log('   node scripts/cache-warming.js 100');
    }
    
    if (stats.errors > 0) {
      console.log('🔧 Investigate cache errors in application logs');
    }
    
    if (hitRate >= 80) {
      console.log('🎉 Cache is performing excellently!');
      console.log('🚀 Site is optimized for maximum speed');
    }
    
    console.log('\n📈 For low-traffic sites (1-50 users):');
    console.log('   • Current aggressive caching is optimal');
    console.log('   • 30-day TTLs maximize hit rates');
    console.log('   • Cache warming ensures instant responses');
  }

  async runFullHealthCheck() {
    console.log('🏥 MovieGenius Cache Health Check');
    console.log('════════════════════════════════════');
    
    await this.checkRedisConnection();
    await this.checkCacheStats();
    await this.sampleCacheContents();
    await this.generateRecommendations();
    
    console.log('\n✅ Health check complete!');
  }
}

async function main() {
  const checker = new CacheHealthChecker();
  await checker.runFullHealthCheck();
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  });
}

export default CacheHealthChecker;