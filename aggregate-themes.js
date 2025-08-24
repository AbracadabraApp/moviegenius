#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

async function aggregateThemes() {
  console.log('🔍 Aggregating themes into final movie lists...');
  
  try {
    // Load all theme suggestions
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
      
      // Add movie to this theme (avoid duplicates)
      const existingMovie = themeGroups[listName].movies.find(m => m.tmdbId === theme.tmdbId);
      if (!existingMovie) {
        themeGroups[listName].movies.push({
          tmdbId: theme.tmdbId,
          connectionReason: theme.connectionReason
        });
      }
    }
    
    console.log(`📋 Found ${Object.keys(themeGroups).length} unique theme names`);
    
    // Filter lists by size (5-30 movies as specified)
    const validLists = [];
    const rejectedLists = [];
    
    for (const [listName, listData] of Object.entries(themeGroups)) {
      const movieCount = listData.movies.length;
      
      if (movieCount < 5) {
        rejectedLists.push({
          ...listData,
          rejectionReason: `Too few movies: ${movieCount} < 5`
        });
      } else if (movieCount > 30) {
        rejectedLists.push({
          ...listData,
          rejectionReason: `Too many movies: ${movieCount} > 30 (suggest splitting)`
        });
      } else {
        validLists.push({
          ...listData,
          movieCount: movieCount
        });
      }
    }
    
    // Sort valid lists by movie count for easier review
    validLists.sort((a, b) => b.movieCount - a.movieCount);
    
    console.log(`✅ Valid lists (5-30 movies): ${validLists.length}`);
    console.log(`❌ Rejected lists: ${rejectedLists.length}`);
    
    // Show distribution
    const sizeDistribution = {};
    validLists.forEach(list => {
      const size = list.movieCount;
      sizeDistribution[size] = (sizeDistribution[size] || 0) + 1;
    });
    
    console.log('\n📊 List Size Distribution:');
    Object.keys(sizeDistribution)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(size => {
        console.log(`  ${size} movies: ${sizeDistribution[size]} lists`);
      });
    
    // Sample lists
    console.log('\n🎬 Top 10 Largest Valid Lists:');
    validLists.slice(0, 10).forEach((list, index) => {
      console.log(`${index + 1}. "${list.listName}" (${list.movieCount} movies)`);
    });
    
    // Save results
    const finalResults = {
      generationSummary: {
        totalThemesSuggested: allThemes.length,
        uniqueThemeNames: Object.keys(themeGroups).length,
        validLists: validLists.length,
        rejectedLists: rejectedLists.length,
        averageListSize: Math.round(validLists.reduce((sum, list) => sum + list.movieCount, 0) / validLists.length),
        generatedAt: new Date().toISOString()
      },
      validLists: validLists,
      rejectedLists: rejectedLists.slice(0, 50), // Limit rejected for file size
      sizeDistribution: sizeDistribution
    };
    
    const outputPath = './generated-lists-batch/aggregated-lists.json';
    fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
    
    console.log(`\n💾 Saved aggregated results to: ${outputPath}`);
    
    return finalResults.generationSummary;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

aggregateThemes()
  .then(summary => {
    console.log('\n🎉 Theme aggregation successful!');
    console.log(`📊 Generated ${summary.validLists} valid movie lists`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Theme aggregation failed');
    process.exit(1);
  });