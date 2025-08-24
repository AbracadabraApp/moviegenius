/**
 * Test the updated production prompt with explicit word counting instructions
 */

import { buildPrompt } from './lib/prompts/builder.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testPrompt(movieTitle, movieYear) {
  const testMovie = `${movieTitle} (${movieYear})`;
  console.log(`🎬 Testing updated production prompt: ${testMovie}`);
  
  try {
    const prompt = buildPrompt('MOVIE_ANALYSIS', '', false);
    const start = Date.now();
    
    const response = await anthropic.messages.create({
      ...prompt,
      messages: [{ role: 'user', content: testMovie }],
    });
    
    const processingTime = Date.now() - start;
    const content = response.content[0].text;
    
    // Parse and analyze
    const analysis = JSON.parse(content);
    
    console.log(`\n📊 RESULTS:`);
    console.log(`Title: ${analysis.metadata.title}`);
    console.log(`Claude's reported word count: ${analysis.metadata.wordCount}`);
    console.log(`Target range: ${analysis.metadata.targetRange}`);
    
    // Count actual words in content sections
    let actualWords = 0;
    analysis.content.forEach((section, index) => {
      const words = section.text.split(/\s+/).length;
      console.log(`Section ${index + 1} (${section.type}): ${words} words`);
      actualWords += words;
    });
    
    console.log(`\n✅ ACTUAL word count: ${actualWords} words`);
    console.log(`🎯 Target adherence: ${actualWords >= 400 && actualWords <= 550 ? '✅ In range' : '❌ Out of range'}`);
    console.log(`📈 Accuracy: Claude reported ${analysis.metadata.wordCount}, actual is ${actualWords} (${Math.abs(analysis.metadata.wordCount - actualWords)} word difference)`);
    
    console.log(`\n💰 Cost: $${((response.usage.input_tokens * 0.003 + response.usage.output_tokens * 0.015) / 1000).toFixed(4)}`);
    console.log(`⏱️  Time: ${processingTime}ms`);
    
    // Check film references
    const filmRefs = (content.match(/\*\*[^*]+\*\*\s*\(\d{4}\)/g) || []).length;
    console.log(`🎭 Film references: ${filmRefs}`);
    console.log(`📽️  Featured movies: ${analysis.featuredMovies.length}`);
    
    console.log(`\n📄 ANALYSIS CONTENT:`);
    console.log(`=====================`);
    analysis.content.forEach((section, index) => {
      console.log(`\n**Section ${index + 1}: ${section.type}**`);
      console.log(section.text);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test with a mid-tier film
const TEST_MOVIE = 'After Hours';
const TEST_YEAR = 1985;

testPrompt(TEST_MOVIE, TEST_YEAR).then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});