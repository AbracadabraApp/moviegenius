// Test musical list generation with creativity and humor
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎵 Testing Creative Musical Lists with Humor\n');

try {
  const dataset = JSON.parse(fs.readFileSync('musical-uuid-normalized.json', 'utf8'));
  console.log(`Loaded ${dataset.movieCount} normalized musical movies`);
  
  const promptData = dataset.normalizedMovies.join('\n');
  
  const creativePrompt = `You are a witty film enthusiast with encyclopedic knowledge and a great sense of humor. Below are musical films with rich metadata. Use your creativity and sense of humor to create delightfully unexpected thematic movie lists that will make users smile while discovering films through clever connections.

Be playful with your list names - think of connections that are both insightful and amusing. Use your wit to find patterns that are genuinely helpful but also entertaining. Make the lists feel like discoveries that cinephiles would love to stumble upon.

Create as many creative lists as possible using meaningful 2-4 word titles. Lists should have 3-8 films each. Use every single film provided - no movie left behind!

Format:
{
  "lists": [
    {"name": "Jazz Age Rebels", "movieIds": ["uuid1", "uuid2"]}
  ]
}

Movies with rich metadata:
${promptData}`;

  console.log('📤 Sending creative prompt to Claude...');
  const startTime = Date.now();
  
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 3000,
    temperature: 0.7, // Higher temperature for more creativity
    messages: [{ role: 'user', content: creativePrompt }],
  });

  const endTime = Date.now();
  const response = message.content[0].text;
  
  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const inputCost = (inputTokens / 1000000) * 3;
  const outputCost = (outputTokens / 1000000) * 15;
  const totalCost = inputCost + outputCost;
  
  console.log('\n💰 COST:');
  console.log(`Total cost: $${totalCost.toFixed(6)}`);
  console.log(`Time: ${(endTime - startTime) / 1000}s`);
  
  console.log('\n📄 CREATIVE RESPONSE:');
  console.log(response);
  
  fs.writeFileSync('creative-musical-response.txt', response);
  console.log('\nSaved to creative-musical-response.txt');
  
  // Try to parse JSON if it's there
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.lists) {
        console.log(`\n🎭 Generated ${parsed.lists.length} creative lists:`);
        parsed.lists.forEach(list => {
          console.log(`  - ${list.name} (${list.movieIds?.length || 0} movies)`);
        });
      }
    }
  } catch (parseError) {
    console.log('\n(Response includes explanatory text - check file for full creative response)');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}