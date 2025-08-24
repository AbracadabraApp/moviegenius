// Simple API test
import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🧪 Simple API test...');

try {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Respond with: {"test": "success", "cost": "calculated"}',
      },
    ],
  });

  const response = message.content[0].text;
  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const cost = (inputTokens * 0.000003) + (outputTokens * 0.000015);
  
  console.log('✅ API working!');
  console.log(`Response: ${response}`);
  console.log(`Tokens: ${inputTokens}/${outputTokens}`);
  console.log(`Cost: $${cost.toFixed(6)}`);
  
} catch (error) {
  console.error('❌ Failed:', error.message);
}