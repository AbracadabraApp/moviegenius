#!/usr/bin/env node
/**
 * Nuclear Static Validation Script
 * 
 * Validates existing nuclear static files for:
 * - No search-based links
 * - No unprocessed movie mentions
 * - No self-referential links
 * - No placeholder posters
 * - Proper link structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const NUCLEAR_DIR = path.join(PROJECT_ROOT, 'nuclear-static');

// Import validation function from utils
import { validateStaticData } from '../lib/utils/nuclear-link-utils.js';

/**
 * Load and validate a nuclear static file
 */
function validateNuclearFile(filename) {
  try {
    const filePath = path.join(NUCLEAR_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.props || !data.props.title) {
      return {
        filename,
        valid: false,
        issues: ['Invalid file structure: missing props.title']
      };
    }
    
    const validation = validateStaticData(data, data.props.title);
    
    return {
      filename,
      tmdbId: data.props.tmdbId,
      title: data.props.title,
      year: data.props.year,
      valid: validation.valid,
      issues: validation.issues
    };
    
  } catch (error) {
    return {
      filename,
      valid: false,
      issues: [`Parse error: ${error.message}`]
    };
  }
}

/**
 * Get all nuclear static files
 */
function getNuclearFiles() {
  if (!fs.existsSync(NUCLEAR_DIR)) {
    console.error(`❌ Nuclear static directory not found: ${NUCLEAR_DIR}`);
    process.exit(1);
  }
  
  return fs.readdirSync(NUCLEAR_DIR)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Main validation function
 */
async function validateAllNuclearFiles() {
  console.log('🔍 Nuclear Static File Validation');
  console.log('==================================\n');
  
  const files = getNuclearFiles();
  console.log(`📁 Found ${files.length} nuclear static files\n`);
  
  const results = [];
  let validCount = 0;
  let invalidCount = 0;
  
  // Process files in batches to avoid memory issues
  const batchSize = 50;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    for (const filename of batch) {
      const result = validateNuclearFile(filename);
      results.push(result);
      
      if (result.valid) {
        validCount++;
        console.log(`✅ ${result.title} (${result.year}) - ${filename}`);
      } else {
        invalidCount++;
        console.log(`❌ ${result.title || 'Unknown'} - ${filename}`);
        result.issues.forEach(issue => {
          console.log(`   🔸 ${issue}`);
        });
      }
    }
    
    // Progress update
    console.log(`\n📊 Processed ${Math.min(i + batchSize, files.length)}/${files.length} files\n`);
  }
  
  // Summary report
  console.log('\n📋 VALIDATION SUMMARY');
  console.log('=====================');
  console.log(`✅ Valid files: ${validCount}`);
  console.log(`❌ Invalid files: ${invalidCount}`);
  console.log(`📁 Total files: ${files.length}`);
  console.log(`📈 Success rate: ${((validCount / files.length) * 100).toFixed(1)}%`);
  
  // Detailed issue breakdown
  if (invalidCount > 0) {
    console.log('\n🔍 ISSUE BREAKDOWN');
    console.log('==================');
    
    const issueTypes = {};
    results.filter(r => !r.valid).forEach(result => {
      result.issues.forEach(issue => {
        const issueType = issue.split(':')[0];
        issueTypes[issueType] = (issueTypes[issueType] || 0) + 1;
      });
    });
    
    Object.entries(issueTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([issueType, count]) => {
        console.log(`📌 ${issueType}: ${count} occurrences`);
      });
  }
  
  // Sample of problematic files
  const problematicFiles = results.filter(r => !r.valid).slice(0, 5);
  if (problematicFiles.length > 0) {
    console.log('\n🚨 SAMPLE PROBLEMATIC FILES');
    console.log('===========================');
    problematicFiles.forEach(file => {
      console.log(`\n📄 ${file.title} (${file.filename})`);
      file.issues.slice(0, 3).forEach(issue => {
        console.log(`   • ${issue}`);
      });
      if (file.issues.length > 3) {
        console.log(`   ... and ${file.issues.length - 3} more issues`);
      }
    });
  }
  
  return {
    total: files.length,
    valid: validCount,
    invalid: invalidCount,
    successRate: (validCount / files.length) * 100
  };
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateAllNuclearFiles()
    .then(summary => {
      if (summary.invalid > 0) {
        console.log(`\n⚠️  Found ${summary.invalid} files with validation issues`);
        process.exit(1);
      } else {
        console.log('\n🎉 All nuclear static files are valid!');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('💥 Validation failed:', error);
      process.exit(1);
    });
}

export { validateAllNuclearFiles };