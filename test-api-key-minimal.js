import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';

// Test both loading methods
console.log('=== Testing dotenv/config ===');
await import('dotenv/config');
console.log('ANTHROPIC_API_KEY via dotenv/config:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');

console.log('\n=== Testing explicit .env.local loading ===');
dotenv.config({ path: '.env.local' });
console.log('ANTHROPIC_API_KEY via explicit loading:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');
console.log('First 20 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 20));

if (process.env.ANTHROPIC_API_KEY) {
  console.log('\n=== Testing API key format ===');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('Length:', apiKey.length);
  console.log('Starts with sk-ant:', apiKey.startsWith('sk-ant'));
  console.log('Contains dashes:', (apiKey.match(/-/g) || []).length, 'dashes');
  
  console.log('\n=== Testing actual API call ===');
  try {
    const anthropic = new Anthropic({ apiKey: apiKey });
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say hello' }]
    });
    console.log('✅ API call successful');
    console.log('Response:', message.content[0].text);
  } catch (error) {
    console.log('❌ API call failed:', error.message);
  }
}