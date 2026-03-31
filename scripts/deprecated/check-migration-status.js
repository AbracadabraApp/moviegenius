// Quick migration status checker
import fs from 'fs';
import { Client } from 'pg';

const progressFile = 'migration-progress.json';

async function checkMigrationStatus() {
  console.log('🔍 Migration Status Report');
  console.log('=' .repeat(50));

  // Check progress file
  let progress = null;
  try {
    if (fs.existsSync(progressFile)) {
      progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    }
  } catch (error) {
    console.log('❌ Could not read progress file');
  }

  if (progress) {
    const elapsed = progress.endTime ? (progress.endTime - progress.startTime) : (Date.now() - progress.startTime);
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const totalMovies = progress.stats.movies.success + progress.stats.movies.failed + progress.stats.movies.skipped;
    const successRate = totalMovies > 0 ? (progress.stats.movies.success / totalMovies * 100).toFixed(1) : 0;

    console.log(`📊 Progress File Status:`);
    console.log(`   Status: ${progress.isComplete ? '✅ COMPLETED' : '🔄 IN PROGRESS'}`);
    console.log(`   Last Batch: ${progress.lastCompletedBatch}`);
    console.log(`   Runtime: ${hours}h ${minutes}m`);
    console.log(`   Movies: ${progress.stats.movies.success}✅ ${progress.stats.movies.failed}❌ ${progress.stats.movies.skipped}⏭️`);
    console.log(`   Analyses: ${progress.stats.analyses.success}✅ ${progress.stats.analyses.failed}❌`);
    console.log(`   Success Rate: ${successRate}%`);
    
    if (progress.failures && progress.failures.length > 0) {
      console.log(`   Recent Failures: ${progress.failures.length} (showing last 3)`);
      progress.failures.slice(-3).forEach(f => {
        console.log(`     - ${f.type}: ${f.item} (${f.error})`);
      });
    }
  } else {
    console.log('📊 No progress file found - migration not started');
  }

  // Check actual database
  console.log('\n🗄️  Database Status:');
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
    });
    
    await client.connect();
    
    const movieCount = await client.query('SELECT COUNT(*) FROM movies');
    const analysisCount = await client.query('SELECT COUNT(*) FROM movie_analyses');
    
    console.log(`   Railway Movies: ${movieCount.rows[0].count}/19,872 (${((movieCount.rows[0].count / 19872) * 100).toFixed(1)}%)`);
    console.log(`   Railway Analyses: ${analysisCount.rows[0].count}/13,647 (${((analysisCount.rows[0].count / 13647) * 100).toFixed(1)}%)`);
    
    const remaining = 19872 - parseInt(movieCount.rows[0].count);
    if (remaining > 0) {
      console.log(`   Remaining: ${remaining} movies`);
      
      // Estimate completion time based on progress
      if (progress && !progress.isComplete) {
        const moviesPerHour = totalMovies / (elapsed / 3600000);
        const estimatedHours = remaining / moviesPerHour;
        console.log(`   Estimated completion: ${estimatedHours.toFixed(1)} hours`);
      }
    } else {
      console.log(`   🎉 Migration appears complete!`);
    }
    
    await client.end();
    
  } catch (error) {
    console.log(`   ❌ Database check failed: ${error.message}`);
  }

  // Check log file
  console.log('\n📋 Recent Log Activity:');
  try {
    if (fs.existsSync('migration.log')) {
      const logContent = fs.readFileSync('migration.log', 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      const recentLines = lines.slice(-5);
      
      recentLines.forEach(line => {
        console.log(`   ${line}`);
      });
    } else {
      console.log('   No log file found');
    }
  } catch (error) {
    console.log(`   ❌ Could not read log file: ${error.message}`);
  }
}

checkMigrationStatus().catch(console.error);