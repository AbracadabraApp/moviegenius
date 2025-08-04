/**
 * Streaming Explore Further API
 * 
 * Generates detailed topic explorations in real-time with typewriter-friendly streaming.
 * Topics come from EXPLORE_FURTHER lines in movie analyses.
 * 
 * Usage: /api/explore-further/cyberpunk-visual-aesthetics-and-neon-noir-cinematography
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { EXPLORE_FURTHER_CONTEXT } from '../../../lib/prompts/explore-further-context.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  const { topic } = req.query;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic parameter required' });
  }

  // Set up streaming headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    console.log(`🎬 Starting streaming exploration for topic: ${topic}`);
    
    // Convert URL-safe topic back to readable format
    const readableTopic = topic
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    console.log(`📝 Generating exploration for: "${readableTopic}"`);
    
    // Create the prompt for this specific topic
    const prompt = `${EXPLORE_FURTHER_CONTEXT.structure}

Explore this specific film topic in detail: "${readableTopic}"

Write a comprehensive 400-600 word exploration that assumes readers are curious about this topic after seeing it mentioned in a movie analysis. Make it engaging, informative, and full of specific film examples that demonstrate the topic brilliantly.`;

    // Generate the exploration using Claude
    const message = await anthropic.messages.create({
      model: EXPLORE_FURTHER_CONTEXT.model,
      max_tokens: EXPLORE_FURTHER_CONTEXT.max_tokens,
      temperature: EXPLORE_FURTHER_CONTEXT.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const explorationContent = message.content[0].text;
    console.log(`✅ Generated ${explorationContent.length} characters of exploration content`);
    
    // Stream the content in natural chunks for typewriter effect
    await streamContentWithTypewriterTiming(res, explorationContent, readableTopic);
    
    console.log(`✅ Streaming complete for topic: ${readableTopic}`);
    
  } catch (error) {
    console.error(`❌ Streaming exploration failed for topic ${topic}:`, error);
    res.status(500).json({ 
      error: 'Failed to generate topic exploration',
      topic: topic,
      message: error.message 
    });
  }
}

/**
 * Stream content with natural timing for typewriter effect
 */
async function streamContentWithTypewriterTiming(res, content, topicTitle) {
  // Add topic header
  const header = `EXPLORING: ${topicTitle.toUpperCase()}\n\n`;
  
  // Start with header
  for (let i = 0; i < header.length; i++) {
    res.write(header[i]);
    await sleep(50); // Slower for header
  }
  
  // Brief pause before content
  await sleep(800);
  
  // Stream main content with natural paragraph breaks
  const paragraphs = content.split(/\n\s*\n/);
  
  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p].trim();
    if (!paragraph) continue;
    
    // Handle different content types
    if (paragraph.startsWith('PARAGRAPH:')) {
      // Main analysis paragraphs - stream sentence by sentence
      const text = paragraph.replace('PARAGRAPH:', '').trim();
      const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
      
      for (const sentence of sentences) {
        res.write(sentence.trim() + ' ');
        
        // Pause after each sentence based on punctuation
        const delay = sentence.includes('!') || sentence.includes('?') ? 600 : 
                     sentence.includes('.') ? 500 : 300;
        await sleep(delay);
      }
      
      // Paragraph break
      res.write('\n\n');
      await sleep(400);
      
    } else if (paragraph.startsWith('MOVIES:')) {
      // Movie recommendations - stream with slight delay
      res.write('\n' + paragraph + '\n');
      await sleep(200);
      
    } else if (paragraph.startsWith('CROSS-CONNECTIONS:')) {
      // Cross-connections section
      res.write('\n\n' + paragraph + '\n');
      await sleep(300);
      
    } else if (paragraph.startsWith('EXPLORE_FURTHER:')) {
      // Related topics
      res.write(paragraph + '\n');
      await sleep(150);
      
    } else {
      // Regular paragraph - stream naturally
      res.write(paragraph + '\n\n');
      await sleep(300);
    }
  }
  
  // Signal completion
  res.write('\n\n__EXPLORATION_COMPLETE__');
  res.end();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}