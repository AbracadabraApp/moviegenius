#!/usr/bin/env node

/**
 * Convert Missing Nuclear Movies Script
 * 
 * This script converts movies that have analysis but no nuclear static files.
 * It uses the nuclear-static-generator.js to create static files for specific TMDB IDs.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read the report to get missing nuclear IDs
const reportPath = path.join(__dirname, 'nuclear-conversion-report.json');

if (!fs.existsSync(reportPath)) {
  console.error('❌ nuclear-conversion-report.json not found. Run nuclear-conversion-report.js first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const missingNuclearIds = report.missingNuclearIds || [];

console.log(`🚀 Converting ${missingNuclearIds.length} movies with analysis to nuclear static files...\n`);

if (missingNuclearIds.length === 0) {
  console.log('✅ No movies need nuclear conversion!');
  process.exit(0);
}

// Process in batches of 10
const batchSize = 10;
let batchNum = 1;

async function processBatch(ids) {
  return new Promise((resolve, reject) => {
    const command = `node scripts/nuclear-static-generator.js --tmdb-ids=${ids.join(',')}`;
    
    console.log(`📦 Batch ${batchNum}: Processing ${ids.length} movies...`);
    console.log(`   Command: ${command}`);
    
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message);
        reject(error);
      } else {
        console.log(`✅ Batch ${batchNum} completed successfully`);
        resolve({ stdout, stderr });
      }
    });
    
    // Stream output in real-time
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    batchNum++;
  });
}

async function convertMissingNuclear() {
  console.log('Movies to convert:');
  report.missingNuclearMovies.slice(0, 10).forEach((movie, index) => {
    console.log(`  ${index + 1}. ${movie.title} (${movie.year}) - TMDB: ${movie.tmdbId}`);
  });
  
  if (report.missingNuclearMovies.length > 10) {
    console.log(`  ... and ${report.missingNuclearMovies.length - 10} more`);
  }
  
  console.log('\\n' + '='.repeat(50));
  
  const totalBatches = Math.ceil(missingNuclearIds.length / batchSize);
  
  for (let i = 0; i < missingNuclearIds.length; i += batchSize) {
    const batchIds = missingNuclearIds.slice(i, i + batchSize);
    
    try {
      await processBatch(batchIds);
      
      // Brief pause between batches
      if (i + batchSize < missingNuclearIds.length) {
        console.log('⏳ Pausing 2 seconds between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`💥 Batch failed, continuing with next batch...`);
    }
  }
  
  console.log('\\n' + '='.repeat(50));
  console.log(`🎉 Nuclear conversion process complete!`);
  console.log(`   Check nuclear-static/ directory for new files`);
  console.log(`   Run nuclear-conversion-report.js again to verify results`);
}

// Check if nuclear-static-generator.js exists
const generatorPath = path.join(__dirname, 'scripts', 'nuclear-static-generator.js');
if (!fs.existsSync(generatorPath)) {
  console.error('❌ nuclear-static-generator.js not found in scripts/ directory');
  process.exit(1);
}

convertMissingNuclear().catch(console.error);