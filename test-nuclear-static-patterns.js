/**
 * Test Nuclear Static Movie Patterns - Standalone Validation
 * 
 * Scans nuclear static files to find **Movie Title** patterns
 * without requiring database access.
 * Run with: node test-nuclear-static-patterns.js
 */

import fs from 'fs';
import path from 'path';

// Pattern detection logic
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];
  
  const mentions = [];
  
  // Pattern 1: **Movie Title** (Year) - Bold with year
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  let match;
  
  while ((match = boldWithYearPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    
    mentions.push({
      original: match[0],
      title,
      year,
      type: 'bold_with_year'
    });
  }
  
  // Pattern 2: **Movie Title** - Bold without year
  const boldWithoutYearPattern = /\*\*([^*]+)\*\*/g;
  boldWithoutYearPattern.lastIndex = 0;
  
  while ((match = boldWithoutYearPattern.exec(content)) !== null) {
    const title = match[1].trim();
    
    // Check for overlap with bold+year patterns
    const overlaps = mentions.some(existing => 
      Math.abs(match.index - existing.start) < existing.original.length
    );
    
    if (!overlaps) {
      mentions.push({
        original: match[0],
        title,
        year: null,
        type: 'bold_without_year'
      });
    }
  }
  
  return mentions;
}

// Process nuclear static files
function processNuclearStatic(maxFiles = 20) {
  console.log('🎬 Nuclear Static Movie Pattern Analysis');
  console.log('==========================================\n');
  
  const nuclearDir = path.join(process.cwd(), 'nuclear-static');
  
  if (!fs.existsSync(nuclearDir)) {
    console.error('❌ Nuclear static directory not found');
    return;
  }
  
  const files = fs.readdirSync(nuclearDir)
    .filter(f => f.endsWith('.json'))
    .slice(0, maxFiles);
  
  console.log(`📁 Found ${files.length} nuclear static files (testing first ${maxFiles})\n`);
  
  let totalFiles = 0;
  let filesWithPatterns = 0;
  let totalPatterns = 0;
  let patternsByType = {
    bold_with_year: 0,
    bold_without_year: 0
  };
  let allPatterns = [];
  
  for (const filename of files) {
    try {
      const filePath = path.join(nuclearDir, filename);
      const staticData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const tmdbId = filename.replace('.json', '');
      const movieTitle = staticData.props?.title || 'Unknown';
      const movieYear = staticData.props?.year || 'Unknown';
      
      totalFiles++;
      let filePatterns = [];
      
      // Check sections content
      if (staticData.props?.sections) {
        for (const section of staticData.props.sections) {
          if (section.type === 'text' && section.content) {
            const mentions = extractMovieMentions(section.content);
            filePatterns.push(...mentions);
          }
        }
      }
      
      // Check exploreFurther content
      if (staticData.props?.exploreFurther) {
        for (const item of staticData.props.exploreFurther) {
          if (item.content) {
            const mentions = extractMovieMentions(item.content);
            filePatterns.push(...mentions);
          }
        }
      }
      
      if (filePatterns.length > 0) {
        filesWithPatterns++;
        totalPatterns += filePatterns.length;
        
        console.log(`📄 ${movieTitle} (${movieYear}) - TMDB ${tmdbId}:`);
        filePatterns.forEach(pattern => {
          console.log(`   ${pattern.type}: ${pattern.original}`);
          patternsByType[pattern.type]++;
          allPatterns.push({
            movie: movieTitle,
            tmdbId,
            ...pattern
          });
        });
        console.log();
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }
  
  console.log(`📊 Analysis Summary:`);
  console.log(`  • Files processed: ${totalFiles}`);
  console.log(`  • Files with movie patterns: ${filesWithPatterns}`);
  console.log(`  • Total movie patterns found: ${totalPatterns}`);
  console.log(`  • Bold with year (**Movie** (Year)): ${patternsByType.bold_with_year}`);
  console.log(`  • Bold without year (**Movie**): ${patternsByType.bold_without_year}`);
  console.log(`  • Coverage: ${((filesWithPatterns / totalFiles) * 100).toFixed(1)}% of files have movie patterns`);
  
  // Show most common patterns
  const titleCounts = {};
  allPatterns.forEach(p => {
    titleCounts[p.title] = (titleCounts[p.title] || 0) + 1;
  });
  
  const topTitles = Object.entries(titleCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  if (topTitles.length > 0) {
    console.log(`\n🏆 Most Referenced Movies:`);
    topTitles.forEach(([title, count], index) => {
      console.log(`  ${index + 1}. "${title}" (${count} references)`);
    });
  }
  
  console.log(`\n✅ Movie Analysis Linking System will process ${totalPatterns} patterns across ${filesWithPatterns} static pages!`);
  
  return {
    totalFiles,
    filesWithPatterns,
    totalPatterns,
    patternsByType
  };
}

// Run the analysis
const result = processNuclearStatic(20);