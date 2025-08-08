// Test Enhanced WhyWatch Prompt on 50 Films
// Tests new Yes/No/Maybe scoring system with varied vocabulary

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Diverse test dataset covering different eras, genres, and quality levels
const TEST_FILMS = [
  // CLASSICS - Should get YES
  "The Godfather (1972)",
  "Citizen Kane (1941)", 
  "Casablanca (1942)",
  "2001: A Space Odyssey (1968)",
  "Vertigo (1958)",
  
  // ACCLAIMED MODERN - Should get YES
  "Parasite (2019)",
  "Moonlight (2016)",
  "There Will Be Blood (2007)",
  "No Country for Old Men (2007)",
  "The Social Network (2010)",
  
  // POPULAR BLOCKBUSTERS - Should get MAYBE
  "Avatar (2009)",
  "Top Gun: Maverick (2022)",
  "Black Panther (2018)",
  "The Dark Knight (2008)",
  "Inception (2010)",
  
  // ENTERTAINMENT VALUE - Should get MAYBE  
  "John Wick (2014)",
  "Mad Max: Fury Road (2015)",
  "The Grand Budapest Hotel (2014)",
  "Knives Out (2019)",
  "Everything Everywhere All at Once (2022)",
  
  // CULT/GENRE - Mixed scoring expected
  "Blade Runner (1982)",
  "Pulp Fiction (1994)",
  "The Big Lebowski (1998)",
  "Fight Club (1999)",
  "Shawshank Redemption (1994)",
  
  // OLDER HOLLYWOOD - Mixed scoring
  "Singin' in the Rain (1952)",
  "North by Northwest (1959)",
  "Some Like It Hot (1959)",
  "Lawrence of Arabia (1962)",
  "The Apartment (1960)",
  
  // FOREIGN CLASSICS - Should get YES
  "8½ (1963)",
  "Seven Samurai (1954)",
  "Tokyo Story (1953)",
  "Bicycle Thieves (1948)",
  "The Rules of the Game (1939)",
  
  // QUESTIONABLE CHOICES - Should get NO
  "Transformers: Age of Extinction (2014)",
  "The Emoji Movie (2017)",
  "Cats (2019)",
  "The Last Airbender (2010)",
  "Battlefield Earth (2000)",
  
  // MIXED BAG - Various scores expected
  "La La Land (2016)",
  "Once Upon a Time in Hollywood (2019)",
  "Dune (2021)",
  "Joker (2019)",
  "Bohemian Rhapsody (2018)",
  "Green Book (2018)",
  "Crash (2004)",
  "Shakespeare in Love (1998)",
  "Forrest Gump (1994)",
  "Titanic (1997)",
  "Avatar: The Way of Water (2022)",
  "The Lion King (2019)"
];

// Enhanced prompt with new WhyWatch structure
const ENHANCED_PROMPT = `You are an expert film analyst providing opinionated recommendations for a movie database. Your analysis will be used by film enthusiasts who want honest, direct opinions.

Here is the film you need to analyze:

<film_title>
{{FILM_TITLE}}
</film_title>

CRITICAL: Your response must contain ONLY the JSON structure specified below. Do not include any explanatory text outside the JSON.

Guidelines for WhyWatch Recommendation:

1. Research and Metadata Compilation:
- Gather all required information (title, year, director, writers, stars, etc.)
- Use "Unknown" for unavailable text fields and 0 for unknown numeric fields
- Ensure accuracy and completeness

2. Why Watch Recommendation:
- Provide an opinionated YES/NO/MAYBE recommendation with specific criteria:
  * YES: Essential viewing - emphasize cultural relevance, film history significance, educational value, great performances, masterful direction, exceptional cinematography, major awards, and critical acclaim
  * MAYBE: Worth considering - emphasize entertainment value, notable cast/performances, or unique novelty
  * NO: Skip this one - be direct and honest about flaws, dated elements, or better alternatives
- Create exactly 3 compelling reasons (5-8 words each, not 6-12)
- Vary vocabulary extensively - avoid overused terms like "masterful," "portrayal," "CGI," "explores," "journey," "stunning," "breathtaking," "compelling," "captivating," "riveting"
- Use fresh, specific adjectives and avoid film critic clichés
- Be opinionated and direct rather than diplomatic

3. Content Sections:
For each content section (introduction, technicalAnalysis, culturalContext, thematicExploration, legacyAndImpact, contemporaryRelevance, conclusion):
- Write 1-2 focused paragraphs per section
- Limit each paragraph to 4 sentences maximum
- Use \\n\\n to separate paragraphs in the JSON output
- Keep total word count across all sections between 600-750 words
- Include specific scene descriptions in technicalAnalysis
- Reference modern films in contemporaryRelevance
- Use **Film Title** (year) format for all film references

4. Featured Movies:
- Select 4 films from different decades that relate to the main film
- Provide brief explanations of how each selected film connects to the main film

5. Explore Topics:
- Create 5 related topics for further exploration with varied difficulty levels
- Include topic category and difficulty level for each

6. Linked References:
- List key movies and people referenced in the analysis
- Use varied relationship types: "influence", "comparison", "stylistic_similarity", "thematic_connection", "same_director", "genre_evolution"
- Ensure at least 6 different relationship types are used

7. More Ideas:
- Generate 20-30 related films with specific connections to the main film
- Categorize each related film appropriately

Your response must contain ONLY the JSON structure below:

{
  "metadata": {
    "title": "",
    "year": 0,
    "analysisType": "comprehensive",
    "wordCount": 0,
    "targetRange": "600-750",
    "confidenceScore": 0
  },
  "keyElements": {
    "director": "",
    "writers": [],
    "stars": [],
    "genre": "",
    "releaseYear": 0,
    "cinematographer": "",
    "composer": "",
    "studio": ""
  },
  "whyWatch": {
    "recommendation": "",
    "reasons": [
      "",
      "",
      ""
    ]
  },
  "content": [
    {
      "type": "introduction",
      "text": ""
    },
    {
      "type": "technicalAnalysis", 
      "text": ""
    },
    {
      "type": "culturalContext",
      "text": ""
    },
    {
      "type": "thematicExploration",
      "text": ""
    },
    {
      "type": "legacyAndImpact",
      "text": ""
    },
    {
      "type": "contemporaryRelevance",
      "text": ""
    },
    {
      "type": "conclusion",
      "text": ""
    }
  ],
  "featuredMovies": [
    {
      "title": "",
      "year": 0,
      "description": ""
    }
  ],
  "exploreTopics": [
    {
      "topic": "",
      "category": "",
      "difficulty": ""
    }
  ],
  "linkedReferences": [
    {
      "type": "",
      "title": "",
      "year": 0,
      "originalText": "",
      "relationship": "",
      "importance": 1
    }
  ],
  "moreIdeas": [
    {
      "title": "",
      "year": 0,
      "connection": ""
    }
  ],
  "generationMetadata": {
    "timestamp": "",
    "processingTime": 0,
    "version": "2.0"
  }
}`;

// Test function for a single film
async function testFilm(filmTitle) {
  try {
    console.log(`\n🎬 Testing: ${filmTitle}`);
    
    const prompt = ENHANCED_PROMPT.replace('{{FILM_TITLE}}', filmTitle);
    
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 6000,
      temperature: 0.7,
      system: prompt,
      messages: [
        {
          role: 'user',
          content: filmTitle,
        },
      ],
    });

    const processingTime = Date.now() - startTime;
    const rawResponse = message.content[0].text;
    
    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error(`❌ JSON Parse Error for ${filmTitle}:`, parseError.message);
      return {
        film: filmTitle,
        error: 'JSON_PARSE_ERROR',
        rawResponse: rawResponse.substring(0, 500)
      };
    }

    // Extract key results
    const recommendation = analysis.whyWatch?.recommendation || 'UNKNOWN';
    const reasons = analysis.whyWatch?.reasons || [];
    const wordCounts = reasons.map(r => r.split(' ').length);
    
    const result = {
      film: filmTitle,
      recommendation: recommendation,
      reasons: reasons,
      wordCounts: wordCounts,
      avgWordCount: wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length,
      processingTime: processingTime,
      tokens: message.usage.input_tokens + message.usage.output_tokens,
      cost: (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000
    };

    // Check vocabulary variation
    const allText = reasons.join(' ').toLowerCase();
    const bannedWords = ['masterful', 'portrayal', 'cgi', 'explores', 'journey', 'stunning', 'breathtaking', 'compelling', 'captivating', 'riveting'];
    const foundBannedWords = bannedWords.filter(word => allText.includes(word));
    
    if (foundBannedWords.length > 0) {
      result.vocabularyIssues = foundBannedWords;
    }

    console.log(`✅ ${recommendation}: ${reasons.join(' | ')}`);
    console.log(`   Word counts: [${wordCounts.join(', ')}] avg: ${result.avgWordCount.toFixed(1)}`);
    
    if (result.vocabularyIssues) {
      console.log(`⚠️  Banned words found: ${result.vocabularyIssues.join(', ')}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error testing ${filmTitle}:`, error.message);
    return {
      film: filmTitle,
      error: error.message
    };
  }
}

// Main test function
async function runTest() {
  console.log('🚀 Testing Enhanced WhyWatch Prompt on 50 Films');
  console.log('================================================\n');
  
  const results = [];
  let totalCost = 0;
  let totalTime = 0;
  
  // Process films in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < TEST_FILMS.length; i += batchSize) {
    const batch = TEST_FILMS.slice(i, i + batchSize);
    
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (${i + 1}-${Math.min(i + batchSize, TEST_FILMS.length)}):`);
    
    const batchPromises = batch.map(film => testFilm(film));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    // Calculate running totals
    batchResults.forEach(result => {
      if (result.cost) totalCost += result.cost;
      if (result.processingTime) totalTime += result.processingTime;
    });
    
    // Brief pause between batches
    if (i + batchSize < TEST_FILMS.length) {
      console.log('⏸️  Pausing 2 seconds between batches...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Analysis
  console.log('\n📊 RESULTS SUMMARY');
  console.log('==================');
  
  const recommendations = results.reduce((acc, r) => {
    if (!r.error && r.recommendation) {
      acc[r.recommendation] = (acc[r.recommendation] || 0) + 1;
    }
    return acc;
  }, {});
  
  console.log('\nRecommendation Distribution:');
  Object.entries(recommendations).forEach(([rec, count]) => {
    console.log(`${rec}: ${count} films (${((count/results.length)*100).toFixed(1)}%)`);
  });
  
  // Word count analysis
  const validResults = results.filter(r => !r.error && r.avgWordCount);
  const avgWordCount = validResults.reduce((sum, r) => sum + r.avgWordCount, 0) / validResults.length;
  
  console.log(`\nAverage Word Count: ${avgWordCount.toFixed(1)} words`);
  console.log(`Target Range: 5-8 words`);
  
  // Vocabulary issues
  const vocabIssues = results.filter(r => r.vocabularyIssues);
  console.log(`\nVocabulary Issues: ${vocabIssues.length} films`);
  if (vocabIssues.length > 0) {
    vocabIssues.forEach(r => {
      console.log(`  ${r.film}: ${r.vocabularyIssues.join(', ')}`);
    });
  }
  
  // Performance
  console.log(`\nPerformance:`);
  console.log(`Total Cost: $${totalCost.toFixed(4)}`);
  console.log(`Total Time: ${(totalTime/1000/60).toFixed(1)} minutes`);
  console.log(`Average Time: ${(totalTime/results.length/1000).toFixed(1)} seconds per film`);
  
  // Errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ${e.film}: ${e.error}`));
  }
  
  // Sample outputs by recommendation type
  console.log('\n🎯 SAMPLE OUTPUTS BY RECOMMENDATION:');
  ['YES', 'MAYBE', 'NO'].forEach(rec => {
    const samples = results.filter(r => r.recommendation === rec).slice(0, 3);
    if (samples.length > 0) {
      console.log(`\n${rec} Examples:`);
      samples.forEach(s => {
        console.log(`  ${s.film}: ${s.reasons.join(' | ')}`);
      });
    }
  });
  
  return results;
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { runTest, testFilm };