import dotenv from 'dotenv';

// Explicitly load .env.local
dotenv.config({ path: '.env.local' });

console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');
console.log('First 10 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));