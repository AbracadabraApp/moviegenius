/**
 * Test movie recommendations without overusing "masterful"
 */

import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

const testMovies = [
  "The Shawshank Redemption (1994)",
  "Pulp Fiction (1994)",
  "The Dark Knight (2008)",
  "Fight Club (1999)",
  "The Matrix (1999)"
];

async function analyzeWithConstraints(movie) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Is "${movie}" worth watching? Answer YES/NO with two reasons (6-10 words each). Avoid overused words like "masterful", "outstanding", "brilliant" - use more varied, specific language.`
    }]
  });

  return message.content[0].text.trim();
}

async function testDiversity() {
  console.log('🎬 TESTING VOCABULARY DIVERSITY\n');
  
  for (const movie of testMovies) {
    try {
      const result = await analyzeWithConstraints(movie);
      console.log(`• **${movie}**`);
      console.log(`${result}\n`);
    } catch (error) {
      console.log(`• **${movie}** - ERROR: ${error.message}\n`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testDiversity().catch(console.error);