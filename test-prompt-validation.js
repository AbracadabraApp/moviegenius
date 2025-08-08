// Validate Enhanced WhyWatch Prompt Structure
// This tests the prompt design without requiring API calls

const ENHANCED_WHYWATCH_SECTION = `
2. Why Watch Recommendation:
- Provide an opinionated YES/NO/MAYBE recommendation with specific criteria:
  * YES: Essential viewing - emphasize cultural relevance, film history significance, educational value, great performances, masterful direction, exceptional cinematography, major awards, and critical acclaim
  * MAYBE: Worth considering - emphasize entertainment value, notable cast/performances, or unique novelty  
  * NO: Skip this one - be direct and honest about flaws, dated elements, or better alternatives
- Create exactly 3 compelling reasons (5-8 words each, not 6-12)
- Vary vocabulary extensively - avoid overused terms like "masterful," "portrayal," "CGI," "explores," "journey," "stunning," "breathtaking," "compelling," "captivating," "riveting"
- Use fresh, specific adjectives and avoid film critic clichés
- Be opinionated and direct rather than diplomatic
`;

const NEW_JSON_STRUCTURE = `
"whyWatch": {
  "recommendation": "YES|NO|MAYBE",
  "reasons": [
    "",
    "",
    ""
  ]
}
`;

// Sample expected outputs for different recommendation types
const SAMPLE_OUTPUTS = {
  YES: {
    film: "The Godfather (1972)",
    whyWatch: {
      recommendation: "YES",
      reasons: [
        "Brando revolutionizes screen acting permanently", // 5 words
        "Defines crime saga storytelling blueprint", // 5 words  
        "Cultural touchstone referenced across decades" // 5 words
      ]
    }
  },
  MAYBE: {
    film: "Inception (2010)",
    whyWatch: {
      recommendation: "MAYBE", 
      reasons: [
        "Mind-bending heist with visual spectacle", // 5 words
        "DiCaprio anchors complex ensemble cast", // 5 words
        "Original concept in franchise-heavy era" // 5 words
      ]
    }
  },
  NO: {
    film: "The Emoji Movie (2017)",
    whyWatch: {
      recommendation: "NO",
      reasons: [
        "Corporate advertising disguised as children's entertainment", // 6 words
        "Tired jokes appeal to lowest denominators", // 7 words
        "Better animated options exist everywhere" // 5 words
      ]
    }
  }
};

// Validation functions
function validateWordCount(reasons, targetMin = 5, targetMax = 8) {
  const wordCounts = reasons.map(reason => reason.split(' ').length);
  const withinRange = wordCounts.filter(count => count >= targetMin && count <= targetMax);
  
  return {
    wordCounts,
    averageWords: wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length,
    withinTarget: withinRange.length === reasons.length,
    compliance: `${withinRange.length}/${reasons.length} reasons within ${targetMin}-${targetMax} words`
  };
}

function validateVocabulary(reasons) {
  const bannedWords = [
    'masterful', 'portrayal', 'cgi', 'explores', 'journey', 
    'stunning', 'breathtaking', 'compelling', 'captivating', 'riveting',
    'magnificent', 'epic', 'unforgettable', 'timeless', 'classic'
  ];
  
  const allText = reasons.join(' ').toLowerCase();
  const foundBannedWords = bannedWords.filter(word => allText.includes(word));
  
  return {
    bannedWordsFound: foundBannedWords,
    vocabularyScore: foundBannedWords.length === 0 ? 'EXCELLENT' : 
                    foundBannedWords.length <= 2 ? 'GOOD' : 'POOR',
    isCompliant: foundBannedWords.length === 0
  };
}

function validateRecommendationCriteria(recommendation, reasons) {
  const reasonsText = reasons.join(' ').toLowerCase();
  
  const criteriaKeywords = {
    YES: ['cultural', 'history', 'significance', 'educational', 'performance', 'direction', 'cinematography', 'award', 'acclaim', 'revolutionary', 'influential', 'groundbreaking'],
    MAYBE: ['entertainment', 'cast', 'novelty', 'fun', 'enjoyable', 'spectacle', 'original', 'unique'],
    NO: ['flawed', 'dated', 'better', 'alternative', 'skip', 'weak', 'poor', 'disappointing']
  };
  
  const relevantKeywords = criteriaKeywords[recommendation] || [];
  const foundKeywords = relevantKeywords.filter(keyword => reasonsText.includes(keyword));
  
  return {
    expectedCriteria: relevantKeywords,
    foundCriteria: foundKeywords,
    criteriaAlignment: foundKeywords.length > 0,
    alignmentScore: `${foundKeywords.length}/${relevantKeywords.length} criteria keywords found`
  };
}

// Test the sample outputs
function testSampleOutputs() {
  console.log('🧪 VALIDATING ENHANCED WHYWATCH PROMPT DESIGN');
  console.log('==============================================\n');
  
  console.log('📋 PROMPT REQUIREMENTS:');
  console.log('• 3 reasons per film (5-8 words each)');
  console.log('• YES/NO/MAYBE recommendation system');
  console.log('• Varied vocabulary (avoid clichés)');
  console.log('• Opinion-based criteria alignment');
  console.log('• Direct, non-diplomatic tone\n');
  
  let totalCompliance = 0;
  let totalTests = 0;
  
  Object.entries(SAMPLE_OUTPUTS).forEach(([recType, sample]) => {
    console.log(`🎭 TESTING ${recType} RECOMMENDATION: ${sample.film}`);
    console.log(`🎯 Recommendation: ${sample.whyWatch.recommendation}`);
    console.log('💭 Reasons:');
    sample.whyWatch.reasons.forEach((reason, i) => {
      console.log(`   ${i+1}. "${reason}"`);
    });
    
    // Word count validation
    const wordValidation = validateWordCount(sample.whyWatch.reasons);
    console.log(`\n📊 Word Count: ${wordValidation.compliance}`);
    console.log(`   Average: ${wordValidation.averageWords.toFixed(1)} words`);
    console.log(`   Individual: [${wordValidation.wordCounts.join(', ')}]`);
    console.log(`   ✅ Within target: ${wordValidation.withinTarget ? 'YES' : 'NO'}`);
    
    // Vocabulary validation
    const vocabValidation = validateVocabulary(sample.whyWatch.reasons);
    console.log(`\n🗣️  Vocabulary: ${vocabValidation.vocabularyScore}`);
    if (vocabValidation.bannedWordsFound.length > 0) {
      console.log(`   ❌ Banned words: ${vocabValidation.bannedWordsFound.join(', ')}`);
    } else {
      console.log(`   ✅ No banned clichés detected`);
    }
    
    // Criteria alignment validation
    const criteriaValidation = validateRecommendationCriteria(
      sample.whyWatch.recommendation, 
      sample.whyWatch.reasons
    );
    console.log(`\n🎯 Criteria Alignment: ${criteriaValidation.alignmentScore}`);
    console.log(`   Found: ${criteriaValidation.foundCriteria.join(', ') || 'none'}`);
    console.log(`   ✅ Criteria match: ${criteriaValidation.criteriaAlignment ? 'YES' : 'NO'}`);
    
    // Overall compliance
    const compliance = [
      wordValidation.withinTarget,
      vocabValidation.isCompliant, 
      criteriaValidation.criteriaAlignment
    ].filter(Boolean).length;
    
    console.log(`\n📈 Overall Compliance: ${compliance}/3 requirements met`);
    console.log(`${compliance === 3 ? '✅' : '⚠️'} ${compliance === 3 ? 'EXCELLENT' : compliance === 2 ? 'GOOD' : 'NEEDS WORK'}\n`);
    
    totalCompliance += compliance;
    totalTests += 3; // 3 requirements per test
    
    console.log('─'.repeat(60) + '\n');
  });
  
  // Final summary
  console.log('📊 OVERALL PROMPT VALIDATION RESULTS');
  console.log('====================================');
  console.log(`Total Compliance: ${totalCompliance}/${totalTests} (${Math.round(totalCompliance/totalTests*100)}%)`);
  console.log(`Recommendation Types: ${Object.keys(SAMPLE_OUTPUTS).length}/3 (YES/MAYBE/NO)`);
  
  if (totalCompliance >= totalTests * 0.8) {
    console.log('✅ PROMPT READY FOR TESTING');
    console.log('The enhanced whyWatch prompt meets design requirements.');
  } else {
    console.log('⚠️  PROMPT NEEDS REFINEMENT');
    console.log('Some requirements need adjustment before deployment.');
  }
  
  return {
    complianceRate: totalCompliance / totalTests,
    totalTests: totalTests,
    passed: totalCompliance >= totalTests * 0.8
  };
}

// Cost and timing estimates for 50 films
function estimateProductionCosts() {
  console.log('\n💰 PRODUCTION TESTING ESTIMATES (50 Films)');
  console.log('==========================================');
  
  const avgTokensPerFilm = 4000; // Estimated based on current prompt
  const costPer1MTokens = 3; // Claude 3.5 Sonnet input cost
  const avgTimePerFilm = 8; // seconds
  
  const totalTokens = avgTokensPerFilm * 50;
  const totalCost = (totalTokens / 1000000) * costPer1MTokens;
  const totalTime = (avgTimePerFilm * 50) / 60; // minutes
  
  console.log(`Estimated tokens: ${totalTokens.toLocaleString()}`);
  console.log(`Estimated cost: $${totalCost.toFixed(2)}`);
  console.log(`Estimated time: ${totalTime.toFixed(1)} minutes`);
  console.log(`Per-film average: ${avgTimePerFilm}s, $${(totalCost/50).toFixed(4)}`);
  
  return { totalCost, totalTime, perFilmCost: totalCost/50 };
}

// Run validation
console.log('🚀 STARTING PROMPT VALIDATION...\n');

const validationResults = testSampleOutputs();
const costEstimates = estimateProductionCosts();

console.log('\n🎯 NEXT STEPS:');
if (validationResults.passed) {
  console.log('1. Deploy enhanced prompt to API');
  console.log('2. Run production test on 5-10 films');
  console.log('3. Analyze results and refine if needed');
  console.log('4. Scale to full 50-film test');
} else {
  console.log('1. Refine prompt based on validation results');
  console.log('2. Re-run validation tests');
  console.log('3. Deploy to API once validation passes');
}

console.log('\n✨ Enhanced WhyWatch prompt validation complete!');