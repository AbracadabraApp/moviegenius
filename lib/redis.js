// Redis Cache Service for MovieGenius
// Provides high-performance caching with intelligent TTL and error handling

import Redis from 'ioredis';
import crypto from 'crypto';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Cache configuration by content type
    this.TTL = {
      CLAUDE_ANALYSIS: 30 * 24 * 60 * 60, // 30 days - Claude responses are stable (was 24h)
      TMDB_DATA: 90 * 24 * 60 * 60, // 90 days - Movie metadata is permanent (was 7d)
      PERSON_DATA: 90 * 24 * 60 * 60, // 90 days - Cast/crew data is stable (was 7d)
      MOVIE_LOOKUPS: 7 * 24 * 60 * 60, // 7 days - Movie queries (was 24h)
      DATABASE_QUERIES: 12 * 60 * 60, // 12 hours - Database results (was 1h)
      SEARCH_RESULTS: 24 * 60 * 60, // 24 hours - Search queries (was 30m)
      TAG_CLOUD: 7 * 24 * 60 * 60, // 7 days - Tag cloud data (was 6h)
      STREAMING_DATA: 7 * 24 * 60 * 60, // 7 days - Streaming availability (was 12h)
    };

    this.connect();
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

      if (!redisUrl) {
        console.warn('🔴 Redis URL not configured - caching disabled');
        return;
      }

      // Configure Redis client with optimized settings
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Connection pool settings
        family: 6,
        showFriendlyErrorStack: process.env.NODE_ENV === 'development',
      });

      // Event handlers
      this.client.on('connect', () => {
        console.log('🔗 Redis connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('error', error => {
        console.error('🔴 Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++;
        console.log(`🔄 Redis reconnecting (attempt ${this.reconnectAttempts})`);

        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          console.error('🔴 Max Redis reconnection attempts reached - disabling cache');
          this.client.disconnect();
        }
      });

      // Test connection
      await this.client.ping();
      console.log('✅ Redis cache service initialized');
    } catch (error) {
      console.error('🔴 Failed to initialize Redis:', error.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  // Generate consistent cache keys
  generateKey(type, identifier, version = 'v1') {
    const safeId =
      typeof identifier === 'object'
        ? this.hashObject(identifier)
        : String(identifier).replace(/[^a-zA-Z0-9-_]/g, '_');

    return `moviegenius:${version}:${type}:${safeId}`;
  }

  // Hash objects for consistent keys
  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 16);
  }

  // Get cached data with error handling
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const startTime = Date.now();
      const data = await this.client.get(key);
      const responseTime = Date.now() - startTime;

      if (data) {
        console.log(`✅ Cache HIT: ${key} (${responseTime}ms)`);
        return JSON.parse(data);
      } else {
        console.log(`❌ Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      console.error(`🔴 Redis GET error for ${key}:`, error.message);
      return null;
    }
  }

  // Set cached data with TTL
  async set(key, data, ttlSeconds = this.TTL.DATABASE_QUERIES) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const startTime = Date.now();
      const serialized = JSON.stringify(data);

      // Add metadata for debugging
      const cacheEntry = {
        data: data,
        cached_at: new Date().toISOString(),
        ttl: ttlSeconds,
        size: serialized.length,
      };

      await this.client.setex(key, ttlSeconds, JSON.stringify(cacheEntry));
      const responseTime = Date.now() - startTime;

      console.log(
        `💾 Cache SET: ${key} (${responseTime}ms, TTL: ${ttlSeconds}s, Size: ${serialized.length} bytes)`
      );
      return true;
    } catch (error) {
      console.error(`🔴 Redis SET error for ${key}:`, error.message);
      return false;
    }
  }

  // Delete cached data
  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      console.log(`🗑️  Cache DELETE: ${key} (${result ? 'success' : 'not found'})`);
      return result > 0;
    } catch (error) {
      console.error(`🔴 Redis DELETE error for ${key}:`, error.message);
      return false;
    }
  }

  // Bulk delete by pattern
  async deletePattern(pattern) {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        const result = await this.client.del(...keys);
        console.log(`🗑️  Cache BULK DELETE: ${keys.length} keys matching ${pattern}`);
        return result;
      }
      return 0;
    } catch (error) {
      console.error(`🔴 Redis BULK DELETE error for ${pattern}:`, error.message);
      return 0;
    }
  }

  // Get cache statistics
  async getStats() {
    if (!this.isConnected || !this.client) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbsize();

      return {
        connected: true,
        memory_usage: this.parseMemoryInfo(info),
        total_keys: dbSize,
        connection_status: 'healthy',
      };
    } catch (error) {
      console.error('🔴 Redis STATS error:', error.message);
      return { connected: false, error: error.message };
    }
  }

  parseMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memory = {};

    lines.forEach(line => {
      if (line.includes('used_memory_human')) {
        memory.used = line.split(':')[1];
      }
      if (line.includes('used_memory_peak_human')) {
        memory.peak = line.split(':')[1];
      }
    });

    return memory;
  }

  // Graceful shutdown
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      console.log('🔌 Redis disconnected gracefully');
    }
  }

  // Health check
  async isHealthy() {
    try {
      if (!this.client) return false;
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let redisInstance = null;

export function getRedis() {
  if (!redisInstance) {
    redisInstance = new RedisService();
  }
  return redisInstance;
}

export default getRedis;
