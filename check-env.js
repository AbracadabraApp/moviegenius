import 'dotenv/config';
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');
console.log('First 10 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));
console.log('All env vars with ANTHROPIC:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));