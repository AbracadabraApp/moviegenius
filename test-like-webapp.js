// Test using exact same pattern as web app
const { Anthropic } = await import('@anthropic-ai/sdk');

// Load environment the same way Next.js does
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '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';

console.log('Testing with web app approach...');
console.log('API Key (first 20):', process.env.ANTHROPIC_API_KEY.substring(0, 20));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

try {
  console.log('Making API call...');
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 20,
    messages: [
      {
        role: 'user',
        content: 'Say "test successful"',
      },
    ],
  });

  console.log('✅ SUCCESS:', message.content[0].text);
  console.log('Tokens:', message.usage.input_tokens, '/', message.usage.output_tokens);
} catch (error) {
  console.log('❌ FAILED:', error.message);
}