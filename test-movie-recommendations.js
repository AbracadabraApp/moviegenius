/**
 * Test Movie Recommendation Analysis
 * 
 * Tests 100 movies through our analysis system to see which ones
 * our Movie Analyst prompt recommends as "worth watching"
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from './lib/prompts/builder.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

// Top-rated movies list
const topRatedMovies = [
  "The Shawshank Redemption (1994)",
  "Pulp Fiction (1994)",
  "The Godfather (1972)",
  "The Dark Knight (2008)",
  "Schindler's List (1993)",
  "12 Angry Men (1957)",
  "The Lord of the Rings: The Return of the King (2003)",
  "The Good, the Bad and the Ugly (1966)",
  "Fight Club (1999)",
  "The Lord of the Rings: The Fellowship of the Ring (2001)",
  "Forrest Gump (1994)",
  "Inception (2010)",
  "The Empire Strikes Back (1980)",
  "The Matrix (1999)",
  "Goodfellas (1990)",
  "One Flew Over the Cuckoo's Nest (1975)",
  "Se7en (1995)",
  "The Silence of the Lambs (1991)",
  "It's a Wonderful Life (1946)",
  "Life Is Beautiful (1997)",
  "The Usual Suspects (1995)",
  "Léon: The Professional (1994)",
  "Spirited Away (2001)",
  "Saving Private Ryan (1998)",
  "American History X (1998)",
  "Interstellar (2014)",
  "Casablanca (1942)",
  "City of God (2002)",
  "Once Upon a Time in the West (1968)",
  "The Green Mile (1999)",
  "Psycho (1960)",
  "The Pianist (2002)",
  "Parasite (2019)",
  "The Lion King (1994)",
  "Gladiator (2000)",
  "The Departed (2006)",
  "Whiplash (2014)",
  "The Prestige (2006)",
  "Apocalypse Now (1979)",
  "Alien (1979)",
  "Sunset Boulevard (1950)",
  "Dr. Strangelove (1964)",
  "The Great Dictator (1940)",
  "Cinema Paradiso (1988)",
  "The Lives of Others (2006)",
  "Grave of the Fireflies (1988)",
  "Paths of Glory (1957)",
  "Django Unchained (2012)",
  "WALL-E (2008)",
  "The Shining (1980)"
];

// Random movies list
const randomMovies = [
  "The Meg (2018)",
  "Paul Blart: Mall Cop (2009)",
  "Speed Racer (2008)",
  "The Princess Diaries (2001)",
  "Kindergarten Cop (1990)",
  "Van Helsing (2004)",
  "The Love Guru (2008)",
  "Junior (1994)",
  "Cats & Dogs (2001)",
  "The Time Machine (2002)",
  "Wild Wild West (1999)",
  "Battlefield Earth (2000)",
  "Mortal Kombat (1995)",
  "Ghost Rider (2007)",
  "National Treasure (2004)",
  "Honey, I Shrunk the Kids (1989)",
  "The Scorpion King (2002)",
  "Judge Dredd (1995)",
  "Space Jam (1996)",
  "Fantastic Four (2005)",
  "The Santa Clause (1994)",
  "Beethoven (1992)",
  "Jumanji (1995)",
  "Small Soldiers (1998)",
  "Congo (1995)",
  "Waterworld (1995)",
  "Hook (1991)",
  "Lost in Space (1998)",
  "The Mummy Returns (2001)",
  "Charlie's Angels (2000)",
  "Rush Hour 2 (2001)",
  "Big Daddy (1999)",
  "Inspector Gadget (1999)",
  "The Mask (1994)",
  "Demolition Man (1993)",
  "Last Action Hero (1993)",
  "Cliffhanger (1993)",
  "The Specialist (1994)",
  "Eraser (1996)",
  "Face/Off (1997)",
  "Con Air (1997)",
  "The Rock (1996)",
  "Armageddon (1998)",
  "Deep Impact (1998)",
  "Godzilla (1998)",
  "Independence Day (1996)",
  "Twister (1996)",
  "Volcano (1997)",
  "Dante's Peak (1997)",
  "Speed 2: Cruise Control (1997)"
];

async function analyzeMovie(movieTitle, anthropic) {
  try {
    console.log(`🎬 Analyzing: ${movieTitle}`);
    
    // Use our movie analysis prompt system
    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Focus on whether this movie is worth watching and why'
    );
    
    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [{
        role: 'user',
        content: movieTitle,
      }],
    });

    const analysis = message.content[0].text;
    
    // Simple heuristic to check if it's recommended as "worth watching"
    const worthWatchingIndicators = [
      'worth watching',
      'highly recommend',
      'must-watch',
      'essential viewing',
      'definitely watch',
      'strongly recommend',
      'outstanding',
      'exceptional',
      'masterpiece',
      'brilliant',
      'excellent'
    ];
    
    const notWorthWatchingIndicators = [
      'not worth watching',
      'avoid',
      'disappointing',
      'waste of time',
      'poorly made',
      'terrible',
      'awful',
      'skip this',
      'not recommended'
    ];
    
    const analysisLower = analysis.toLowerCase();
    
    let recommendation = 'NEUTRAL';
    let confidence = 0;
    
    // Check for positive indicators
    const positiveMatches = worthWatchingIndicators.filter(indicator => 
      analysisLower.includes(indicator)
    );
    
    // Check for negative indicators
    const negativeMatches = notWorthWatchingIndicators.filter(indicator => 
      analysisLower.includes(indicator)
    );
    
    if (positiveMatches.length > negativeMatches.length) {
      recommendation = 'WORTH WATCHING';
      confidence = positiveMatches.length;
    } else if (negativeMatches.length > positiveMatches.length) {
      recommendation = 'NOT RECOMMENDED';
      confidence = negativeMatches.length;
    }
    
    // Extract a brief snippet of the "why watch" reasoning
    const whyWatchMatch = analysis.match(/(?:worth watching|recommend|why watch)[^.]*[.!]/i);
    const reasoning = whyWatchMatch ? whyWatchMatch[0] : 'No clear reasoning found';
    
    return {
      movie: movieTitle,
      recommendation,
      confidence,
      reasoning,
      cost: (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000
    };
    
  } catch (error) {
    console.error(`❌ Error analyzing ${movieTitle}: ${error.message}`);
    return {
      movie: movieTitle,
      recommendation: 'ERROR',
      confidence: 0,
      reasoning: `Analysis failed: ${error.message}`,
      cost: 0
    };
  }
}

async function testMovieRecommendations() {
  console.log('🎭 Testing Movie Recommendations with Our Analysis System');
  console.log('========================================================\n');
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  const results = {
    topRated: [],
    random: [],
    summary: {
      topRatedRecommended: 0,
      randomRecommended: 0,
      totalCost: 0
    }
  };
  
  console.log('📊 TESTING TOP-RATED MOVIES (Expected: Most should be recommended)');
  console.log('================================================================\n');
  
  for (let i = 0; i < Math.min(10, topRatedMovies.length); i++) { // Test first 10 to start
    const result = await analyzeMovie(topRatedMovies[i], anthropic);
    results.topRated.push(result);
    results.summary.totalCost += result.cost;
    
    if (result.recommendation === 'WORTH WATCHING') {
      results.summary.topRatedRecommended++;
    }
    
    console.log(`${result.recommendation} - ${result.movie}`);
    console.log(`  Reasoning: ${result.reasoning.substring(0, 100)}...`);
    console.log(`  Cost: $${result.cost.toFixed(4)}\n`);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎲 TESTING RANDOM MOVIES (Expected: Mixed results)');
  console.log('================================================\n');
  
  for (let i = 0; i < Math.min(10, randomMovies.length); i++) { // Test first 10 to start
    const result = await analyzeMovie(randomMovies[i], anthropic);
    results.random.push(result);
    results.summary.totalCost += result.cost;
    
    if (result.recommendation === 'WORTH WATCHING') {
      results.summary.randomRecommended++;
    }
    
    console.log(`${result.recommendation} - ${result.movie}`);
    console.log(`  Reasoning: ${result.reasoning.substring(0, 100)}...`);
    console.log(`  Cost: $${result.cost.toFixed(4)}\n`);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📈 RECOMMENDATION ANALYSIS SUMMARY');
  console.log('================================');
  console.log(`Top-Rated Movies Recommended: ${results.summary.topRatedRecommended}/10`);
  console.log(`Random Movies Recommended: ${results.summary.randomRecommended}/10`);
  console.log(`Total Analysis Cost: $${results.summary.totalCost.toFixed(4)}`);
  
  const topRatedRate = (results.summary.topRatedRecommended / 10) * 100;
  const randomRate = (results.summary.randomRecommended / 10) * 100;
  
  console.log(`\n🎯 Analysis Quality Check:`);
  console.log(`  - Top-Rated Recommendation Rate: ${topRatedRate}%`);
  console.log(`  - Random Movies Recommendation Rate: ${randomRate}%`);
  
  if (topRatedRate > randomRate) {
    console.log(`✅ GOOD: Our analyst correctly identifies quality movies more often`);
  } else {
    console.log(`⚠️  CONCERNING: Random movies getting recommended as much as top-rated`);
  }
  
  return results;
}

// Run the test
testMovieRecommendations().catch(error => {
  console.error('Test failed:', error.message);
});