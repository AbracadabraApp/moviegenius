#!/usr/bin/env node

/**
 * Expand list generation by relaxing size constraints
 * Reprocess existing theme suggestions with more permissive rules
 */

import fs from 'fs';

async function expandListGeneration() {
  console.log('🔍 Expanding movie list generation from existing themes...');
  
  // Load existing theme suggestions
  const themesPath = './generated-lists-batch/all-themes.json';
  const allThemes = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
  
  console.log(`📊 Processing ${allThemes.length} theme suggestions`);
  
  // Group by exact list name
  const themeGroups = {};
  
  for (const theme of allThemes) {
    const listName = theme.listName;
    if (!themeGroups[listName]) {
      themeGroups[listName] = {
        listName: listName,
        slug: theme.slug,
        description: theme.description,
        category: theme.category,
        movies: []
      };
    }
    
    // Add movie (avoid duplicates)
    const existingMovie = themeGroups[listName].movies.find(m => m.tmdbId === theme.tmdbId);
    if (!existingMovie) {
      themeGroups[listName].movies.push({
        tmdbId: theme.tmdbId,
        connectionReason: theme.connectionReason
      });
    }
  }
  
  console.log(`📋 Found ${Object.keys(themeGroups).length} unique theme names`);
  
  // Apply EXPANDED size constraints
  const EXPANDED_CONSTRAINTS = {
    MIN_SIZE_MICRO: 2,    // Micro-lists (very specific themes)
    MIN_SIZE_SMALL: 3,    // Small lists  
    MIN_SIZE_MEDIUM: 5,   // Medium lists (original min)
    MAX_SIZE_LARGE: 50,   // Large lists (was 30)
    MAX_SIZE_MEGA: 100    // Mega lists (new category)
  };
  
  const validLists = [];
  const microLists = [];
  const megaLists = [];
  const rejectedLists = [];
  
  for (const [listName, listData] of Object.entries(themeGroups)) {
    const movieCount = listData.movies.length;
    
    if (movieCount < EXPANDED_CONSTRAINTS.MIN_SIZE_MICRO) {
      rejectedLists.push({
        ...listData,
        rejectionReason: `Too few movies: ${movieCount} < ${EXPANDED_CONSTRAINTS.MIN_SIZE_MICRO}`
      });
    } else if (movieCount >= 2 && movieCount <= 4) {
      // Micro-lists: Very specific themes
      microLists.push({
        ...listData,
        movieCount: movieCount,
        listType: 'micro'
      });
    } else if (movieCount >= 5 && movieCount <= EXPANDED_CONSTRAINTS.MAX_SIZE_LARGE) {
      // Regular lists: Good size range  
      validLists.push({
        ...listData,
        movieCount: movieCount,
        listType: 'regular'
      });
    } else if (movieCount > EXPANDED_CONSTRAINTS.MAX_SIZE_LARGE && movieCount <= EXPANDED_CONSTRAINTS.MAX_SIZE_MEGA) {
      // Mega-lists: Broad themes with many movies
      megaLists.push({
        ...listData,
        movieCount: movieCount,
        listType: 'mega'
      });
    } else {
      rejectedLists.push({
        ...listData,
        rejectionReason: `Too many movies: ${movieCount} > ${EXPANDED_CONSTRAINTS.MAX_SIZE_MEGA} (suggest algorithmic splitting)`
      });
    }
  }
  
  // Combine all valid categories
  const allValidLists = [
    ...validLists,
    ...microLists,
    ...megaLists
  ];
  
  // Sort by type and size
  allValidLists.sort((a, b) => {
    const typeOrder = { 'mega': 0, 'regular': 1, 'micro': 2 };
    const aOrder = typeOrder[a.listType];
    const bOrder = typeOrder[b.listType];
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.movieCount - a.movieCount; // Then by size desc
  });
  
  console.log(`\n📊 EXPANDED Results:`);
  console.log(`✅ Micro lists (2-4 movies): ${microLists.length}`);
  console.log(`✅ Regular lists (5-50 movies): ${validLists.length}`);
  console.log(`✅ Mega lists (51-100 movies): ${megaLists.length}`);
  console.log(`🎯 TOTAL VALID: ${allValidLists.length} (was 524)`);
  console.log(`❌ Still rejected: ${rejectedLists.length}`);
  console.log(`📈 Improvement: ${Math.round(allValidLists.length / 524 * 100)}% increase`);
  
  // Show distribution by type
  console.log('\\n📋 List Type Distribution:');
  const typeDistribution = {};
  allValidLists.forEach(list => {
    typeDistribution[list.listType] = (typeDistribution[list.listType] || 0) + 1;
  });
  Object.entries(typeDistribution).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} lists`);
  });
  
  // Show size distribution
  console.log('\\n📊 Size Distribution:');
  const sizeRanges = {
    '2-4': allValidLists.filter(l => l.movieCount >= 2 && l.movieCount <= 4).length,
    '5-10': allValidLists.filter(l => l.movieCount >= 5 && l.movieCount <= 10).length,
    '11-20': allValidLists.filter(l => l.movieCount >= 11 && l.movieCount <= 20).length,
    '21-50': allValidLists.filter(l => l.movieCount >= 21 && l.movieCount <= 50).length,
    '51-100': allValidLists.filter(l => l.movieCount >= 51 && l.movieCount <= 100).length,
  };
  
  Object.entries(sizeRanges).forEach(([range, count]) => {
    console.log(`  ${range} movies: ${count} lists`);
  });
  
  // Sample lists by type
  console.log('\\n🎬 Sample Lists by Type:');
  
  console.log('\\nMICRO LISTS (2-4 movies):');
  microLists.slice(0, 5).forEach((list, index) => {
    console.log(`${index + 1}. "${list.listName}" (${list.movieCount} movies)`);
  });
  
  console.log('\\nMEGA LISTS (51+ movies):');
  megaLists.slice(0, 5).forEach((list, index) => {
    console.log(`${index + 1}. "${list.listName}" (${list.movieCount} movies)`);
  });
  
  // Save expanded results
  const expandedResults = {
    generationSummary: {
      totalThemesSuggested: allThemes.length,
      uniqueThemeNames: Object.keys(themeGroups).length,
      totalValidLists: allValidLists.length,
      microLists: microLists.length,
      regularLists: validLists.length,
      megaLists: megaLists.length,
      rejectedLists: rejectedLists.length,
      improvementMultiplier: Math.round(allValidLists.length / 524 * 10) / 10,
      generatedAt: new Date().toISOString()
    },
    constraints: EXPANDED_CONSTRAINTS,
    allValidLists: allValidLists,
    microLists: microLists,
    regularLists: validLists,
    megaLists: megaLists,
    rejectedLists: rejectedLists.slice(0, 100) // Limit for file size
  };
  
  const outputPath = './generated-lists-batch/expanded-lists.json';
  fs.writeFileSync(outputPath, JSON.stringify(expandedResults, null, 2));
  
  console.log(`\\n💾 Saved expanded results to: ${outputPath}`);
  console.log(`🎯 Ready to deploy ${allValidLists.length} lists (${Math.round(allValidLists.length / 524)}x increase)`);
  
  return expandedResults;
}

// Run expansion
expandListGeneration()
  .then(results => {
    console.log(`\\n🎉 List expansion complete!`);
    console.log(`📈 Generated ${results.generationSummary.totalValidLists} lists`);
    console.log(`🚀 Improvement: ${results.generationSummary.improvementMultiplier}x more lists`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\\n💥 Expansion failed:', error.message);
    process.exit(1);
  });