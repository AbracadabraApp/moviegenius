#!/usr/bin/env node

/**
 * Detect which nuclear-static files have been processed by movie-analysis-linker.js
 * 
 * Processed files contain: <a href="/movie/XXX" class="movie-title">
 * Unprocessed files contain: **Movie Title** patterns
 */

import fs from 'fs';
import path from 'path';

const nuclearDir = path.join(process.cwd(), 'nuclear-static');

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.props || !data.props.sections) {
      return { processed: false, reason: 'No sections found' };
    }
    
    let hasMovieLinks = false;
    let hasBoldPatterns = false;
    
    // Check all text sections for movie links and bold patterns
    for (const section of data.props.sections) {
      if (section.type === 'text' && section.content) {
        // Check for processed movie links
        if (section.content.includes('<a href="/movie/') && section.content.includes('class="movie-title"')) {
          hasMovieLinks = true;
        }
        
        // Check for unprocessed bold patterns
        if (section.content.includes('**') && section.content.match(/\*\*[^*]+\*\*/)) {
          hasBoldPatterns = true;
        }
      }
    }
    
    // Also check exploreFurther section
    if (data.props.exploreFurther && Array.isArray(data.props.exploreFurther)) {
      for (const item of data.props.exploreFurther) {
        if (item.content) {
          if (item.content.includes('<a href="/movie/') && item.content.includes('class="movie-title"')) {
            hasMovieLinks = true;
          }
          if (item.content.includes('**') && item.content.match(/\*\*[^*]+\*\*/)) {
            hasBoldPatterns = true;
          }
        }
      }
    }
    
    if (hasMovieLinks) {
      return { 
        processed: true, 
        reason: 'Contains movie-title links',
        hasBoldPatterns: hasBoldPatterns ? 'Also has unprocessed patterns' : false
      };
    }
    
    if (hasBoldPatterns) {
      return { 
        processed: false, 
        reason: 'Contains unprocessed **Movie** patterns' 
      };
    }
    
    return { 
      processed: 'unclear', 
      reason: 'No movie patterns found' 
    };
    
  } catch (error) {
    return { 
      processed: 'error', 
      reason: `Parse error: ${error.message}` 
    };
  }
}

function main() {
  if (!fs.existsSync(nuclearDir)) {
    console.error('Nuclear static directory not found');
    process.exit(1);
  }
  
  const files = fs.readdirSync(nuclearDir)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => parseInt(a.replace('.json', '')) - parseInt(b.replace('.json', '')));
  
  console.log(`Analyzing ${files.length} nuclear-static files...\n`);
  
  let processed = 0;
  let unprocessed = 0;
  let unclear = 0;
  let errors = 0;
  
  const results = [];
  
  for (const filename of files) {
    const filePath = path.join(nuclearDir, filename);
    const tmdbId = filename.replace('.json', '');
    const analysis = analyzeFile(filePath);
    
    results.push({
      tmdbId,
      filename,
      ...analysis
    });
    
    switch (analysis.processed) {
      case true:
        processed++;
        break;
      case false:
        unprocessed++;
        break;
      case 'unclear':
        unclear++;
        break;
      case 'error':
        errors++;
        break;
    }
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total files: ${files.length}`);
  console.log(`Processed (has movie links): ${processed}`);
  console.log(`Unprocessed (has **bold** patterns): ${unprocessed}`);
  console.log(`Unclear (no movie patterns): ${unclear}`);
  console.log(`Errors: ${errors}`);
  console.log(`Processing rate: ${((processed / files.length) * 100).toFixed(1)}%\n`);
  
  // Show first 10 of each category
  console.log('PROCESSED FILES (first 10):');
  console.log('-'.repeat(30));
  results.filter(r => r.processed === true).slice(0, 10).forEach(r => {
    console.log(`${r.tmdbId}.json - ${r.reason}${r.hasBoldPatterns ? ' ⚠️  ' + r.hasBoldPatterns : ''}`);
  });
  
  console.log('\nUNPROCESSED FILES (first 10):');
  console.log('-'.repeat(30));
  results.filter(r => r.processed === false).slice(0, 10).forEach(r => {
    console.log(`${r.tmdbId}.json - ${r.reason}`);
  });
  
  if (unclear > 0) {
    console.log('\nUNCLEAR FILES (first 10):');
    console.log('-'.repeat(30));
    results.filter(r => r.processed === 'unclear').slice(0, 10).forEach(r => {
      console.log(`${r.tmdbId}.json - ${r.reason}`);
    });
  }
  
  if (errors > 0) {
    console.log('\nERROR FILES:');
    console.log('-'.repeat(30));
    results.filter(r => r.processed === 'error').forEach(r => {
      console.log(`${r.tmdbId}.json - ${r.reason}`);
    });
  }
}

main();