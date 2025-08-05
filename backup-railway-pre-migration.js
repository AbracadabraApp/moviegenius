// Create backup of Railway database before migration
import { Client } from 'pg';
import fs from 'fs';

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
});

async function createBackup() {
  try {
    console.log('🔄 Creating Railway database backup...');
    await client.connect();
    
    // Get current data counts
    const movieCount = await client.query('SELECT COUNT(*) FROM movies');
    const analysisCount = await client.query('SELECT COUNT(*) FROM movie_analyses');
    
    console.log(`📊 Current Railway DB contents:`);
    console.log(`   Movies: ${movieCount.rows[0].count}`);
    console.log(`   Analyses: ${analysisCount.rows[0].count}`);
    
    // Export current movies
    const movies = await client.query('SELECT * FROM movies ORDER BY created_at');
    const analyses = await client.query('SELECT * FROM movie_analyses ORDER BY created_at');
    
    const backup = {
      timestamp: new Date().toISOString(),
      counts: {
        movies: parseInt(movieCount.rows[0].count),
        analyses: parseInt(analysisCount.rows[0].count)
      },
      movies: movies.rows,
      analyses: analyses.rows
    };
    
    // Write backup file
    const backupFile = 'railway_backup_pre_migration.json';
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`   File size: ${(fs.statSync(backupFile).size / 1024).toFixed(1)} KB`);
    
    return backup;
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createBackup();