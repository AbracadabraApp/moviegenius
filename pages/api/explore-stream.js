import Anthropic from '@anthropic-ai/sdk';

/**
 * Streaming Explore Content API
 * 
 * Returns real-time streaming analysis for explore topics
 * Used by the enhanced StreamingAnalysisDisplay on explore pages
 */
export default async function handler(req, res) {
  const { topic, context } = req.query;

  // Set up streaming headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!topic) {
    res.status(400).json({ error: 'Topic required' });
    return;
  }

  try {
    console.log(`🎬 Starting streaming explore content for: ${topic}${context ? ` (context: ${context})` : ''}`);

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Create explore-specific prompt
    const fullTopic = context ? `${topic} in relation to ${context}` : topic;
    const explorePrompt = `Create comprehensive, engaging educational content about "${fullTopic}" for film enthusiasts.

Write in a flowing, narrative style that would work well with a typewriter effect. Include:
- Historical context and origins
- Key films and directors with specific examples
- Technical and artistic innovations  
- Cultural and social impact
- Modern influence and contemporary relevance
- Specific viewing recommendations

Format naturally with paragraphs, not sections. Use *Movie Title* (Year) format for films. Write 500-800 words that will be engaging to read as it types out character by character.

Make it educational but accessible, with concrete examples and specific film references throughout.`;

    console.log(`🤖 Requesting explore content from Claude`);

    // Create streaming request
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: explorePrompt,
      }],
      stream: true,
    });

    console.log(`📡 Claude streaming started for explore topic`);

    // Stream the response
    let fullText = '';
    let chunkCount = 0;

    for await (const messageStreamEvent of stream) {
      if (messageStreamEvent.type === 'content_block_delta') {
        const chunk = messageStreamEvent.delta.text;
        if (chunk) {
          fullText += chunk;
          chunkCount++;
          
          // Write chunk to response
          res.write(chunk);
          
          // Log progress occasionally
          if (chunkCount % 10 === 0) {
            console.log(`📝 Streamed ${chunkCount} chunks (${fullText.length} chars)`);
          }
        }
      }
    }

    // Signal completion
    res.write('\n\n__STREAMING_COMPLETE__');
    console.log(`✅ Explore streaming complete: ${chunkCount} chunks, ${fullText.length} characters`);
    
    res.end();

  } catch (error) {
    console.error('❌ Streaming explore content failed:', error);
    
    // Fallback to demo content for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Using explore fallback content');
      
      const fallbackContent = `${topic.replace(/-/g, ' ')} represents a fascinating and influential area of cinema that has shaped countless films and filmmakers throughout the history of motion pictures.

This cinematic approach encompasses a rich variety of techniques, themes, and visual styles that have fundamentally influenced the art of moviemaking. From the pioneering work of early cinema to contemporary digital filmmaking, this subject reveals the ongoing evolution of cinematic language and storytelling methods.

The technical innovations and artistic choices associated with this topic have created a lasting impact on film culture worldwide. Directors like *Christopher Nolan*, *Denis Villeneuve*, and *Rian Johnson* continue to draw inspiration from these foundational cinematic elements, creating works that both honor tradition and push boundaries.

Key films that exemplify this approach include seminal works that demonstrate the power of visual storytelling and narrative innovation. These movies showcase how technical mastery combines with artistic vision to create memorable cinematic experiences that resonate with audiences across generations.

The historical context surrounding this topic reveals how social, cultural, and technological changes have influenced its development. Understanding this background provides valuable insight into why certain techniques emerged when they did and how they reflected the concerns and possibilities of their time.

Modern filmmakers continue to explore and expand upon these concepts, using new technologies and contemporary perspectives to create fresh interpretations while maintaining connections to the rich cinematic heritage that came before.

For film enthusiasts seeking to deepen their understanding of cinema, studying this topic offers a masterclass in the fundamental principles that make movies powerful and enduring art forms.`;

      // Stream the fallback content with delays
      const sentences = fallbackContent.match(/[^\.!?]+[\.!?]+/g) || [];
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim() + ' ';
        res.write(sentence);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      res.write('\n\n__STREAMING_COMPLETE__');
      res.end();
    } else {
      res.status(500).json({ error: 'Explore content failed: ' + error.message });
    }
  }
}