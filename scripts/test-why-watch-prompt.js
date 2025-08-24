#!/usr/bin/env node

/**
 * Test Why Watch prompt structure without API calls
 * Validates prompt formatting and examples
 */

import { buildWhyWatchPrompt, validateWhyWatchResponse } from '../lib/prompts/why-watch-generator.js';

// Test movies covering different quality levels
const TEST_MOVIES = [
  // Should get YES
  { title: "The Godfather (1972)", data: { director: "Francis Ford Coppola", genre: "Crime Drama" }},
  { title: "Parasite (2019)", data: { director: "Bong Joon-ho", genre: "Thriller" }},
  { title: "Citizen Kane (1941)", data: { director: "Orson Welles", genre: "Drama" }},
  
  // Should get NO  
  { title: "The Emoji Movie (2017)", data: { director: "Tony Leondis", genre: "Animation" }},
  { title: "Transformers: Age of Extinction (2014)", data: { director: "Michael Bay", genre: "Action" }},
  
  // Mixed bag
  { title: "Fight Club (1999)", data: { director: "David Fincher", genre: "Thriller" }},
  { title: "Avatar (2009)", data: { director: "James Cameron", genre: "Sci-Fi" }},
  { title: "The Matrix (1999)", data: { director: "The Wachowskis", genre: "Sci-Fi" }},
  { title: "Blade Runner (1982)", data: { director: "Ridley Scott", genre: "Sci-Fi" }},
  { title: "Se7en (1995)", data: { director: "David Fincher", genre: "Thriller" }}
];

console.log('🎬 Testing Why Watch Prompt Structure');
console.log('====================================\n');

// Test prompt building
console.log('1. Testing Prompt Building:');
TEST_MOVIES.slice(0, 3).forEach((movie, index) => {
  const prompt = buildWhyWatchPrompt(movie.title, movie.data);
  console.log(`✅ ${movie.title}: Prompt built (${prompt.length} chars)`);
  
  if (index === 0) {
    // Show first prompt sample
    console.log('\nSample Prompt Structure:');
    console.log('========================');
    const lines = prompt.split('\n').slice(0, 15);
    lines.forEach(line => console.log(line));
    console.log('...\n');
  }
});

console.log('\n2. Testing Validation Function:');

// Test validation with good examples
const goodExample = {
  whyWatch: {
    recommendation: "YES",
    reasons: [
      "Peak Brando performance",
      "Revolutionary crime storytelling", 
      "Essential film history"
    ]
  }
};

const validation1 = validateWhyWatchResponse(goodExample);
console.log(`✅ Good Example: ${validation1.valid ? 'PASSED' : 'FAILED'}`);
if (!validation1.valid) {
  console.log(`   Errors: ${validation1.errors.join(', ')}`);
}

// Test validation with bad examples
const badExample = {
  whyWatch: {
    recommendation: "MAYBE", // Should fail - no MAYBE allowed
    reasons: [
      "Masterful performance by the brilliant actor", // Too long + banned word
      "Stunning cinematography",  // Banned word
      "A compelling journey" // Banned word
    ]
  }
};

const validation2 = validateWhyWatchResponse(badExample);
console.log(`❌ Bad Example: ${validation2.valid ? 'UNEXPECTEDLY PASSED' : 'CORRECTLY FAILED'}`);
console.log(`   Detected Issues: ${validation2.errors.join(', ')}`);

// Test NO recommendation format
const noExample = {
  whyWatch: {
    recommendation: "NO",
    reasons: [
      "Terrible dialogue",
      "Boring pacing",
      "Watch Seven instead"
    ]
  }
};

const validation3 = validateWhyWatchResponse(noExample);
console.log(`✅ NO Example: ${validation3.valid ? 'PASSED' : 'FAILED'}`);
if (!validation3.valid) {
  console.log(`   Errors: ${validation3.errors.join(', ')}`);
}

console.log('\n3. Prompt Features Analysis:');

const samplePrompt = buildWhyWatchPrompt("Test Movie (2020)", { director: "Test Director" });

const features = {
  'Binary YES/NO only': samplePrompt.includes('YES|NO') && !samplePrompt.includes('MAYBE'),
  'Category variety': samplePrompt.includes('Performance quality') && samplePrompt.includes('Cultural impact'),
  'Anti-formulaic': samplePrompt.includes('RANDOMIZE') && samplePrompt.includes('patterns like'),
  'Better alternatives': samplePrompt.includes('Watch X instead'),
  'Word count control': samplePrompt.includes('3-6 words'),
  'Vocabulary bans': samplePrompt.includes('masterful') && samplePrompt.includes('avoid overused'),
  'Core voice included': samplePrompt.includes('You are a passionate film expert')
};

Object.entries(features).forEach(([feature, present]) => {
  console.log(`${present ? '✅' : '❌'} ${feature}`);
});

console.log('\n4. Mock API Response Examples:');
console.log('=============================');

console.log('\nYES Example (Fight Club):');
console.log({
  whyWatch: {
    recommendation: "YES",
    reasons: [
      "Predicted toxic masculinity debates", // Cultural (position 1)
      "Peak Norton career performance",      // Performance (position 2) 
      "Endlessly quotable dialogue"          // Entertainment (position 3)
    ]
  }
});

console.log('\nNO Example (Emoji Movie):');
console.log({
  whyWatch: {
    recommendation: "NO", 
    reasons: [
      "Terrible dialogue throughout",  // Problem 1
      "No creative vision",           // Problem 2
      "Watch Inside Out instead"      // Better alternative
    ]
  }
});

console.log('\n🎯 Prompt Structure Test Complete!');
console.log('Ready for API testing with proper authentication.');