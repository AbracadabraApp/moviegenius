/**
 * Integration Test Setup
 * Manages database connections and cleanup for integration tests
 */

const { Pool } = require('pg');

let globalPool = null;

// Setup database connection before all tests
beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for integration tests');
  }

  globalPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // Limit connections for tests
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test database connection
  const client = await globalPool.connect();
  const result = await client.query('SELECT NOW()');
  client.release();

  console.log(`✅ Database connected at ${result.rows[0].now}`);
});

// Cleanup after all tests
afterAll(async () => {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
    console.log('🔌 Database pool closed');
  }
});

// Make pool available to tests
global.getTestPool = () => {
  if (!globalPool) {
    throw new Error('Database pool not initialized');
  }
  return globalPool;
};