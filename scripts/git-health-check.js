#!/usr/bin/env node
/**
 * Git Repository Health Monitor
 * Checks repository status and alerts for potential issues
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_DIR = process.cwd();
const HEALTH_LOG = join(PROJECT_DIR, '.git', 'health.json');

class GitHealthMonitor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.info = [];
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message };
    
    switch(level) {
      case 'error':
        this.issues.push(entry);
        console.error(`❌ ${message}`);
        break;
      case 'warning':
        this.warnings.push(entry);
        console.warn(`⚠️  ${message}`);
        break;
      case 'info':
        this.info.push(entry);
        console.log(`ℹ️  ${message}`);
        break;
    }
  }

  checkGitDirectory() {
    if (!existsSync(join(PROJECT_DIR, '.git'))) {
      this.log('error', 'Git directory not found! Repository may be lost.');
      return false;
    }
    this.log('info', 'Git directory exists');
    return true;
  }

  checkRepositoryIntegrity() {
    try {
      // Run git fsck (no --quiet option exists)
      execSync('git fsck', { cwd: PROJECT_DIR, stdio: 'ignore' });
      this.log('info', 'Repository integrity check passed');
      return true;
    } catch (error) {
      // If git fsck fails, it means there are integrity issues
      this.log('error', `Repository integrity check failed with exit code ${error.status}`);
      return false;
    }
  }

  checkUnpushedCommits() {
    try {
      const unpushed = execSync('git log origin/main..HEAD --oneline', { 
        cwd: PROJECT_DIR, 
        encoding: 'utf8' 
      }).trim();
      
      if (unpushed) {
        const count = unpushed.split('\n').length;
        this.log('warning', `${count} unpushed commits found`);
        return count;
      } else {
        this.log('info', 'All commits are pushed to remote');
        return 0;
      }
    } catch (error) {
      this.log('warning', 'Could not check unpushed commits');
      return -1;
    }
  }

  checkUncommittedChanges() {
    try {
      const status = execSync('git status --porcelain', { 
        cwd: PROJECT_DIR, 
        encoding: 'utf8' 
      }).trim();
      
      if (status) {
        const lines = status.split('\n').length;
        this.log('warning', `${lines} uncommitted changes found`);
        return lines;
      } else {
        this.log('info', 'Working directory is clean');
        return 0;
      }
    } catch (error) {
      this.log('error', 'Could not check git status');
      return -1;
    }
  }

  checkRemoteConnectivity() {
    try {
      execSync('git remote -v', { cwd: PROJECT_DIR, stdio: 'ignore' });
      execSync('git ls-remote origin HEAD', { cwd: PROJECT_DIR, stdio: 'ignore' });
      this.log('info', 'Remote repository is accessible');
      return true;
    } catch (error) {
      this.log('warning', 'Remote repository connectivity issues');
      return false;
    }
  }

  checkLastBackup() {
    const backupDir = '/Users/josh.petersen/.git-backups/moviegenius';
    try {
      const backups = execSync(`ls -1t ${backupDir}/backup_*.tar.gz 2>/dev/null || echo ""`, {
        encoding: 'utf8'
      }).trim();
      
      if (backups) {
        const latestBackup = backups.split('\n')[0];
        const backupDate = latestBackup.match(/backup_(\d{8}_\d{6})/)?.[1];
        if (backupDate) {
          const date = new Date(
            backupDate.slice(0,4) + '-' + 
            backupDate.slice(4,6) + '-' + 
            backupDate.slice(6,8) + 'T' + 
            backupDate.slice(9,11) + ':' + 
            backupDate.slice(11,13) + ':' + 
            backupDate.slice(13,15)
          );
          const hoursSince = (Date.now() - date.getTime()) / (1000 * 60 * 60);
          
          if (hoursSince > 24) {
            this.log('warning', `Last backup was ${Math.round(hoursSince)} hours ago`);
          } else {
            this.log('info', `Last backup was ${Math.round(hoursSince)} hours ago`);
          }
        }
      } else {
        this.log('warning', 'No backups found');
      }
    } catch (error) {
      this.log('warning', 'Could not check backup status');
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      issues: this.issues,
      warnings: this.warnings,
      info: this.info,
      summary: {
        critical_issues: this.issues.length,
        warnings: this.warnings.length,
        status: this.issues.length === 0 ? 'healthy' : 'issues_detected'
      }
    };

    // Save to log file
    writeFileSync(HEALTH_LOG, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📊 Git Repository Health Summary:');
    console.log(`Status: ${report.summary.status.toUpperCase()}`);
    console.log(`Critical Issues: ${report.summary.critical_issues}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    
    if (this.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION!');
      process.exit(1);
    }
    
    return report;
  }

  async runHealthCheck() {
    console.log('🔍 Running Git Repository Health Check...\n');
    
    this.checkGitDirectory();
    this.checkRepositoryIntegrity();
    this.checkUnpushedCommits();
    this.checkUncommittedChanges();
    this.checkRemoteConnectivity();
    this.checkLastBackup();
    
    return this.generateReport();
  }
}

// Run the health check
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new GitHealthMonitor();
  monitor.runHealthCheck().catch(console.error);
}

export { GitHealthMonitor };