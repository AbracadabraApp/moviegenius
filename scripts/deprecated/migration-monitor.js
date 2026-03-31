// Migration monitor and restart script
import fs from 'fs';
import { spawn } from 'child_process';

const CONFIG = {
  checkInterval: 60000, // Check every minute
  maxRestarts: 10,
  progressFile: 'migration-progress.json',
  logFile: 'migration.log'
};

class MigrationMonitor {
  constructor() {
    this.restartCount = 0;
    this.migrationProcess = null;
    this.isRunning = false;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [MONITOR] ${message}`);
    
    try {
      fs.appendFileSync('monitor.log', `${timestamp} [MONITOR] ${message}\n`);
    } catch (err) {
      console.error('Failed to write to monitor log:', err.message);
    }
  }

  getProgress() {
    try {
      if (fs.existsSync(CONFIG.progressFile)) {
        return JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
      }
    } catch (error) {
      this.log(`Failed to read progress: ${error.message}`);
    }
    return null;
  }

  async startMigration() {
    if (this.isRunning) {
      this.log('Migration already running, skipping start');
      return;
    }

    this.log(`Starting migration (restart #${this.restartCount})`);
    this.isRunning = true;

    // Check if we need to resume
    const progress = this.getProgress();
    const resumeFromBatch = progress && !progress.isComplete ? progress.lastCompletedBatch + 1 : null;

    const args = ['migrate-full-dataset-to-railway-robust.js'];
    if (resumeFromBatch) {
      args.push(`--resume=${resumeFromBatch}`);
      this.log(`Resuming from batch ${resumeFromBatch}`);
    }

    this.migrationProcess = spawn('node', args, {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: process.env
    });

    this.migrationProcess.on('close', (code) => {
      this.isRunning = false;
      this.log(`Migration process exited with code ${code}`);

      if (code === 0) {
        this.log('✅ Migration completed successfully!');
        this.printFinalSummary();
      } else {
        this.log(`❌ Migration failed with exit code ${code}`);
        this.handleMigrationFailure();
      }
    });

    this.migrationProcess.on('error', (error) => {
      this.isRunning = false;
      this.log(`Migration process error: ${error.message}`);
      this.handleMigrationFailure();
    });
  }

  handleMigrationFailure() {
    if (this.restartCount >= CONFIG.maxRestarts) {
      this.log(`❌ Max restarts (${CONFIG.maxRestarts}) reached. Giving up.`);
      this.printFinalSummary();
      process.exit(1);
    }

    this.restartCount++;
    this.log(`⏰ Restarting in 30 seconds... (attempt ${this.restartCount}/${CONFIG.maxRestarts})`);
    
    setTimeout(() => {
      this.startMigration();
    }, 30000);
  }

  printFinalSummary() {
    const progress = this.getProgress();
    if (progress) {
      const elapsed = progress.endTime ? (progress.endTime - progress.startTime) : (Date.now() - progress.startTime);
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      
      this.log('📊 FINAL SUMMARY:');
      this.log(`   Total Time: ${hours}h ${minutes}m`);
      this.log(`   Movies: ${progress.stats.movies.success}✅ ${progress.stats.movies.failed}❌`);
      this.log(`   Analyses: ${progress.stats.analyses.success}✅ ${progress.stats.analyses.failed}❌`);
      this.log(`   Batches: ${progress.stats.batches.completed}/${progress.stats.batches.completed + progress.stats.batches.failed}`);
      this.log(`   Status: ${progress.isComplete ? 'COMPLETED' : 'INCOMPLETE'}`);
    }
  }

  async monitor() {
    this.log('🔍 Migration monitor started');
    
    // Start initial migration
    await this.startMigration();

    // Set up periodic health checks
    const healthCheck = setInterval(() => {
      if (!this.isRunning) {
        const progress = this.getProgress();
        if (progress && !progress.isComplete) {
          this.log('⚠️  Migration not running but incomplete - restarting...');
          this.startMigration();
        } else if (progress && progress.isComplete) {
          this.log('✅ Migration completed - stopping monitor');
          clearInterval(healthCheck);
        }
      } else {
        // Migration is running - log progress
        const progress = this.getProgress();
        if (progress) {
          const totalMovies = progress.stats.movies.success + progress.stats.movies.failed + progress.stats.movies.skipped;
          const successRate = totalMovies > 0 ? (progress.stats.movies.success / totalMovies * 100).toFixed(1) : 0;
          this.log(`📈 Progress: Batch ${progress.lastCompletedBatch}, ${totalMovies} movies (${successRate}% success)`);
        }
      }
    }, CONFIG.checkInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('🛑 Monitor shutdown requested');
      clearInterval(healthCheck);
      if (this.migrationProcess) {
        this.migrationProcess.kill('SIGTERM');
      }
      setTimeout(() => process.exit(0), 5000);
    });
  }
}

// Start monitoring if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new MigrationMonitor();
  monitor.monitor().catch(console.error);
}