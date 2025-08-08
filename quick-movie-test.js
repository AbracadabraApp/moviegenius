/**
 * Quick Movie Recommendation Test
 * Tests our analysis system with simple yes/no + brief reasoning
 */

import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

const classicMovies = [
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

async function quickAnalyze(movie) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Is "${movie}" worth watching? Answer with YES/NO followed by two reasons, each 6-10 words.`
    }]
  });

  return message.content[0].text.trim();
}

function formatResult(movie, result) {
  const lines = result.split('\n');
  const decision = lines[0];
  const reasons = lines.slice(1).filter(line => line.trim());
  
  let output = `• **${movie}** - ${decision}\n`;
  reasons.forEach(reason => {
    output += `  - ${reason.replace(/^\d+\.\s*/, '')}\n`;
  });
  return output;
}

async function testMovies() {
  console.log('# 🎬 MOVIE RECOMMENDATION TEST (100 Movies)\n');
  
  console.log('## 🏆 CLASSIC/ACCLAIMED MOVIES (50)\n');
  
  let classicYes = 0;
  for (const movie of classicMovies) {
    try {
      const result = await quickAnalyze(movie);
      console.log(formatResult(movie, result));
      if (result.startsWith('YES')) classicYes++;
    } catch (error) {
      console.log(`• **${movie}** - ERROR: ${error.message}\n`);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n## 🎲 RANDOM/MIXED MOVIES (50)\n');
  
  let randomYes = 0;
  for (const movie of randomMovies) {
    try {
      const result = await quickAnalyze(movie);
      console.log(formatResult(movie, result));
      if (result.startsWith('YES')) randomYes++;
    } catch (error) {
      console.log(`• **${movie}** - ERROR: ${error.message}\n`);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n## 📊 SUMMARY\n');
  console.log(`• Classic Movies Recommended: ${classicYes}/50 (${(classicYes/50*100).toFixed(0)}%)`);
  console.log(`• Random Movies Recommended: ${randomYes}/50 (${(randomYes/50*100).toFixed(0)}%)`);
  console.log(`• Total Recommended: ${classicYes + randomYes}/100 (${((classicYes + randomYes)/100*100).toFixed(0)}%)`);
}

testMovies().catch(console.error);