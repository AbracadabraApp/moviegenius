// Test with dramatically simplified prompt
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎵 Testing Simple Prompt\n');

try {
  const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
  console.log(`Loaded ${testData.movieCount} Musical movies`);
  
  // DRAMATICALLY SIMPLIFIED PROMPT
  const prompt = `Here are ${testData.movieCount} musical films:

${testData.movieList}

Create movie lists.`;

  console.log('📤 Sending simple prompt to Claude...');
  const startTime = Date.now();
  
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const endTime = Date.now();
  const response = message.content[0].text;
  
  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const inputCost = (inputTokens / 1000000) * 3;
  const outputCost = (outputTokens / 1000000) * 15;
  const totalCost = inputCost + outputCost;
  
  console.log('\\n💰 COST:');
  console.log(`Total cost: $${totalCost.toFixed(6)}`);
  console.log(`Time: ${(endTime - startTime) / 1000}s`);
  
  console.log('\\n📄 RESPONSE:');
  console.log(response);
  
  fs.writeFileSync('simple-prompt-response.txt', response);
  console.log('\\nSaved to simple-prompt-response.txt');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}