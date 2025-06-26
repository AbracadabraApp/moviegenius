/**
 * Streaming Response Handler
 * 
 * Implements streaming responses for real-time text generation,
 * providing immediate feedback to users and significantly improving
 * perceived performance.
 */

/**
 * Creates a streaming response handler for Claude API
 * @param {Object} anthropic - Anthropic client instance
 * @param {Object} promptConfig - Prompt configuration
 * @param {string} question - User's question
 * @param {Function} onChunk - Callback for each text chunk
 * @param {Function} onComplete - Callback when streaming completes
 * @returns {Promise<string>} - Complete response text
 */
export async function streamClaudeResponse(anthropic, promptConfig, question, onChunk, onComplete) {
  let fullResponse = '';
  
  try {
    const stream = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: question
        }
      ],
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.text) {
        const text = chunk.delta.text;
        fullResponse += text;
        
        // Send chunk to frontend for real-time display
        if (onChunk) {
          onChunk(text);
        }
      }
    }

    if (onComplete) {
      onComplete(fullResponse);
    }

    return fullResponse;
  } catch (error) {
    console.error('Streaming error:', error);
    throw error;
  }
}

/**
 * Optimized chunk processing for better UX
 * Accumulates words to send complete words rather than character fragments
 */
export class WordBufferedStreamer {
  constructor(onWordComplete) {
    this.buffer = '';
    this.onWordComplete = onWordComplete;
  }

  processChunk(chunk) {
    this.buffer += chunk;
    
    // Split on spaces and send complete words
    const parts = this.buffer.split(' ');
    
    // Keep the last part in buffer (might be incomplete word)
    this.buffer = parts.pop();
    
    // Send complete words
    parts.forEach((word, index) => {
      if (word.trim()) {
        this.onWordComplete(word + (index < parts.length - 1 ? ' ' : ''));
      }
    });
  }

  flush() {
    // Send any remaining text in buffer
    if (this.buffer.trim()) {
      this.onWordComplete(this.buffer);
      this.buffer = '';
    }
  }
}

/**
 * Server-Sent Events (SSE) streaming for Ask responses
 * Enables real-time text streaming to frontend
 */
export function createSSEStream(res) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sendText = (text) => {
    sendEvent('text', { chunk: text });
  };

  const sendComplete = (fullText) => {
    sendEvent('complete', { fullText });
    res.end();
  };

  const sendError = (error) => {
    sendEvent('error', { error: error.message });
    res.end();
  };

  return { sendText, sendComplete, sendError };
}

/**
 * Fallback for non-streaming responses
 * Simulates streaming by chunking pre-generated text
 */
export function simulateStreaming(text, onChunk, chunkSize = 5, delayMs = 50) {
  const words = text.split(' ');
  let index = 0;

  const sendNextChunk = () => {
    if (index < words.length) {
      const chunk = words.slice(index, index + chunkSize).join(' ') + ' ';
      onChunk(chunk);
      index += chunkSize;
      
      setTimeout(sendNextChunk, delayMs);
    }
  };

  sendNextChunk();
}