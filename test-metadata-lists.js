// Test musical list generation using rich metadata as text strings
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎵 Testing Musical Lists with Rich Metadata\n');

// Sample movies with rich metadata as text strings (normalized format)
const sampleMovies = [
  'TMDB:550 "Fight Club" (1999) - Topics: unreliable_narration, visual_symbolism, social_commentary | Audience: cinephiles, film_students | Context: millennial_anxiety_era | Why: Innovative narrative structure challenges conventional storytelling',
  'TMDB:238 "The Godfather" (1972) - Topics: family_dynamics, power_structures, moral_corruption | Audience: general_audiences, genre_enthusiasts | Context: new_hollywood_era | Why: Masterful character development and political allegory',
  'TMDB:424 "Schindlers List" (1993) - Topics: historical_drama, moral_courage, human_dignity | Audience: cinephiles, history_enthusiasts | Context: holocaust_remembrance | Why: Essential historical perspective with profound emotional impact'
];

const testPrompt = `You are a film enthusiast with encyclopedic knowledge. Below are musical films with rich metadata including thematic topics, target audiences, historical context, and viewing reasons.

Create thematic movie lists using this rich data. Focus on unexpected connections through topics, contexts, and audience appeal. Use meaningful 2-4 word titles. Lists must have at least 3 items for this test.

Format: 
{
  "lists": [
    {"name": "Unreliable Narrators", "tmdbIds": ["550", "238"]}
  ]
}

Movies with metadata:
${sampleMovies.join('\n')}`;

try {
  console.log('📤 Testing metadata approach...');
  const startTime = Date.now();
  
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    temperature: 0.3,
    messages: [{ role: 'user', content: testPrompt }],
  });

  const endTime = Date.now();
  const response = message.content[0].text;
  
  console.log('✅ Response received');
  console.log('Time:', (endTime - startTime) / 1000, 'seconds');
  console.log('\n📄 RESPONSE:');
  console.log(response);
  
  fs.writeFileSync('metadata-test-response.txt', response);
  console.log('\nSaved to metadata-test-response.txt');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}