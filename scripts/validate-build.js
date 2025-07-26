#!/usr/bin/env node

// scripts/validate-build.js
// Railway filesystem validation for nuclear-static files

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildValidator {
  constructor() {
    this.startTime = Date.now();
    this.errors = [];
    this.warnings = [];
  }

  log(message, data = {}) {
    console.log(`[BUILD-VALIDATE] ${message}`, data);
  }

  error(message, data = {}) {
    this.errors.push({ message, data });
    console.error(`[BUILD-VALIDATE] ERROR: ${message}`, data);
  }

  warn(message, data = {}) {
    this.warnings.push({ message, data });
    console.warn(`[BUILD-VALIDATE] WARN: ${message}`, data);
  }

  async validateNuclearStatic() {
    this.log('Validating nuclear-static directory...');
    
    try {
      const nuclearDir = path.join(process.cwd(), 'nuclear-static');
      
      // Check directory exists
      const dirStats = await fs.stat(nuclearDir);
      if (!dirStats.isDirectory()) {
        this.error('nuclear-static is not a directory');
        return false;
      }

      // Count files
      const files = await fs.readdir(nuclearDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      this.log('Nuclear static directory validated', {
        totalFiles: files.length,
        jsonFiles: jsonFiles.length,
        directory: nuclearDir
      });

      // Validate key movie files exist
      const keyMovieIds = ['11', '550', '238', '348', '78', '120'];
      let missingFiles = 0;
      
      for (const movieId of keyMovieIds) {
        try {
          const filePath = path.join(nuclearDir, `${movieId}.json`);
          await fs.access(filePath, fs.constants.R_OK);
          
          // Validate JSON structure
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          
          if (!data.title || (!data.tmdb_id && !data.tmdbId)) {
            this.warn(`Invalid structure in ${movieId}.json`, {
              hasTitle: !!data.title,
              hasTmdbId: !!(data.tmdb_id || data.tmdbId)
            });
          }
        } catch (error) {
          missingFiles++;
          this.warn(`Key movie file missing or invalid: ${movieId}.json`, {
            error: error.message
          });
        }
      }

      if (missingFiles > keyMovieIds.length / 2) {
        this.error('Too many key movie files missing', {
          missing: missingFiles,
          total: keyMovieIds.length
        });
        return false;
      }

      return true;
    } catch (error) {
      this.error('Nuclear static validation failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }
  }

  async validateEnvironment() {
    this.log('Validating environment...');
    
    const requiredEnvVars = ['NEXT_PUBLIC_TMDB_API_KEY'];
    let missingVars = 0;
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        // Make TMDB key warning instead of error for Railway builds
        if (process.env.RAILWAY_ENVIRONMENT_NAME) {
          this.warn(`Missing environment variable in Railway: ${envVar}`);
        } else {
          this.error(`Missing environment variable: ${envVar}`);
          missingVars++;
        }
      }
    }

    // Check Railway environment
    if (process.env.RAILWAY_ENVIRONMENT_NAME) {
      this.log('Railway environment detected', {
        env: process.env.RAILWAY_ENVIRONMENT_NAME,
        project: process.env.RAILWAY_PROJECT_NAME || 'unknown'
      });
    }

    return missingVars === 0;
  }

  async validateFilesystem() {
    this.log('Validating filesystem permissions...');
    
    try {
      const testDir = path.join(process.cwd(), 'temp-build-test');
      
      // Test write permissions
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'test.txt'), 'build validation test');
      await fs.unlink(path.join(testDir, 'test.txt'));
      await fs.rmdir(testDir);
      
      this.log('Filesystem write permissions validated');
      return true;
    } catch (error) {
      this.error('Filesystem validation failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }
  }

  async validatePackageStructure() {
    this.log('Validating package structure...');
    
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      // Check required dependencies
      const requiredDeps = ['next', 'react', 'react-dom'];
      const missing = requiredDeps.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      );
      
      if (missing.length > 0) {
        this.error('Missing required dependencies', { missing });
        return false;
      }

      // Check build script exists
      if (!packageJson.scripts?.build) {
        this.error('No build script found in package.json');
        return false;
      }

      this.log('Package structure validated', {
        nextVersion: packageJson.dependencies?.next || packageJson.devDependencies?.next,
        hasValidateBuild: !!packageJson.scripts?.['validate-build']
      });
      
      return true;
    } catch (error) {
      this.error('Package validation failed', {
        error: error.message
      });
      return false;
    }
  }

  async run() {
    this.log('Starting build validation...');
    
    const validations = [
      { name: 'Environment', fn: () => this.validateEnvironment() },
      { name: 'Filesystem', fn: () => this.validateFilesystem() },
      { name: 'Package Structure', fn: () => this.validatePackageStructure() },
      { name: 'Nuclear Static', fn: () => this.validateNuclearStatic() }
    ];

    let allPassed = true;
    const results = {};

    for (const validation of validations) {
      try {
        const result = await validation.fn();
        results[validation.name] = result;
        if (!result) allPassed = false;
      } catch (error) {
        this.error(`Validation ${validation.name} threw error`, {
          error: error.message
        });
        results[validation.name] = false;
        allPassed = false;
      }
    }

    const duration = Date.now() - this.startTime;
    
    if (allPassed) {
      this.log('Validation passed', {
        duration: `${duration}ms`,
        results,
        errors: this.errors.length,
        warnings: this.warnings.length
      });
      process.exit(0);
    } else {
      this.error('Validation failed', {
        duration: `${duration}ms`,
        results,
        errors: this.errors.length,
        warnings: this.warnings.length,
        errorDetails: this.errors,
        warningDetails: this.warnings
      });
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new BuildValidator();
  validator.run().catch(error => {
    console.error('[BUILD-VALIDATE] Fatal error:', error);
    process.exit(1);
  });
}

export default BuildValidator;