/**
 * Simple Streaming Analysis Proof of Concept
 * 
 * Basic endpoint that streams a pre-written analysis chunk by chunk
 * to test the typewriter effect concept
 */

export default async function handler(req, res) {
  // Set up streaming headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Sample analysis text for proof of concept
    const sampleAnalysis = `The haunting opening scene where HAL 9000 calmly states "I'm sorry Dave, I'm afraid I can't do that" establishes 2001: A Space Odyssey as Stanley Kubrick's cosmic masterpiece that redefined science fiction forever.

This 1968 epic doesn't just show space exploration - it creates a visual meditation on evolution, technology, and humanity's place in the universe that influenced Interstellar (2014), Arrival (2016), and Blade Runner (1982).

Kubrick's revolutionary cinematography employs front projection and centrifuge sets that make the Discovery One sequences feel genuinely weightless. The famous bone-to-spaceship match cut spans four million years of evolution in a single edit.

Watch 2001: A Space Odyssey for Kubrick's unmatched visual poetry and philosophical depth that challenges our understanding of consciousness, technology, and humanity's cosmic destiny. This isn't just entertainment - it's essential viewing that reveals new layers with each watch.`;

    // Split into chunks for streaming (by sentences)
    const sentences = sampleAnalysis.match(/[^\.!?]+[\.!?]+/g) || [];
    
    console.log(`🎬 Starting streaming analysis with ${sentences.length} chunks`);
    
    // Stream each sentence with realistic typing delays
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim() + ' ';
      
      // Write the sentence
      res.write(sentence);
      
      console.log(`📝 Streamed chunk ${i + 1}/${sentences.length}: ${sentence.substring(0, 50)}...`);
      
      // Add realistic pause between sentences (shorter for commas, longer for periods)
      const delay = sentence.includes('!') || sentence.includes('?') ? 800 : 
                   sentence.includes('.') ? 600 : 300;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Signal completion
    res.write('\n\n__STREAMING_COMPLETE__');
    console.log('✅ Streaming analysis complete');
    res.end();
    
  } catch (error) {
    console.error('❌ Streaming failed:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
}