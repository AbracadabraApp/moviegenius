#!/usr/bin/env node
/**
 * Test Movie Links Processing
 * 
 * Tests the conversion of **Movie Title** patterns to proper TMDB links
 * Using existing lookup infrastructure
 */

import fs from 'fs';

// Test with nuclear static file that has good **Movie Title** patterns
const TEST_FILE = 'nuclear-static/100.json';

async function testMovieLinking() {
  console.log('🎬 Testing Movie Link Processing');
  console.log('=====================================\n');
  
  // Read test file
  const content = fs.readFileSync(TEST_FILE, 'utf8');
  const data = JSON.parse(content);
  
  console.log(`📁 Testing file: ${TEST_FILE}`);
  console.log(`🎭 Movie: ${data.props.title} (${data.props.year})\n`);
  
  // Find all **Movie Title** patterns in text sections
  const moviePatterns = [];
  
  data.props.sections.forEach((section, index) => {
    if (section.type === 'text') {
      const pattern = /\*\*([^*]+)\*\* \((\d{4})\)/g;
      let match;
      
      while ((match = pattern.exec(section.content)) !== null) {
        const title = match[1].trim();
        const year = parseInt(match[2]);
        
        moviePatterns.push({
          fullMatch: match[0],
          title: title,
          year: year,
          sectionIndex: index,
          isSelfReference: title.toLowerCase() === data.props.title.toLowerCase()
        });
      }
    }
  });
  
  console.log(`🔍 Found ${moviePatterns.length} movie patterns:`);
  moviePatterns.forEach((movie, index) => {
    const selfRef = movie.isSelfReference ? ' (SELF-REF)' : '';
    console.log(`  ${index + 1}. "${movie.title}" (${movie.year})${selfRef}`);
  });
  
  console.log('\n🔗 Testing TMDB Lookups:');
  console.log('-------------------------');
  
  // Test each movie lookup
  for (const movie of moviePatterns) {
    if (movie.isSelfReference) {
      console.log(`⏭️  Skipping self-reference: "${movie.title}"`);
      continue;
    }
    
    console.log(`\n🔍 Looking up: "${movie.title}" (${movie.year})`);
    
    try {
      const response = await fetch('http://localhost:3001/api/lookup-movie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: movie.title,
          year: movie.year
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Found: TMDB ID ${result.tmdb_id} - Link: /movie/${result.tmdb_id}`);
      } else {
        console.log(`❌ Not found: ${response.status}`);
      }
    } catch (error) {
      console.log(`💥 Error: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Link Transformation Test:');
  console.log('----------------------------');
  
  // Show what the transformed text would look like
  const firstTextSection = data.props.sections.find(s => s.type === 'text');
  if (firstTextSection) {
    console.log('\n📝 Original text:');
    console.log(firstTextSection.content.substring(0, 200) + '...\n');
    
    console.log('📝 After processing (example):');
    let processedText = firstTextSection.content;
    
    // Simple example transformation (would use real TMDB IDs in actual implementation)
    processedText = processedText.replace(
      /\*\*Reservoir Dogs\*\* \(1992\)/g, 
      '<a href="/movie/500">Reservoir Dogs</a> (1992)'
    );
    
    console.log(processedText.substring(0, 200) + '...');
  }
}

// Run test
testMovieLinking().catch(console.error);