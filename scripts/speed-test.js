#!/usr/bin/env node

/**
 * Ask System Speed Test
 * 
 * Tests response times for different types of questions to measure
 * the effectiveness of speed optimizations.
 */

const TEST_QUESTIONS = [
  // Should hit predictive cache (instant)
  "What are the best sci-fi movies?",
  "Recommend some thriller films",
  
  // Follow-up questions (ultra-fast model)
  "What about horror?",
  "More about Hitchcock",
  
  // New questions (fast model)
  "Movies about time travel",
  "Best films from the 1990s",
  
  // Complex questions (balanced model)
  "Analyze the cinematography techniques in Citizen Kane and how they influenced modern filmmaking"
];

async function testQuestion(question) {
  const startTime = Date.now();
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/ask-claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question })
    });

    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        question,
        responseTime,
        success: true,
        sections: data.data?.sections?.length || 0,
        followUps: data.data?.followUpQuestions?.length || 0
      };
    } else {
      return {
        question,
        responseTime,
        success: false,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    return {
      question,
      responseTime: Date.now() - startTime,
      success: false,
      error: error.message
    };
  }
}

async function runSpeedTest() {
  console.log('🚀 Starting Ask System Speed Test...');
  console.log('Testing various question types to measure optimization effectiveness.\n');

  const results = [];

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const question = TEST_QUESTIONS[i];
    console.log(`📝 Testing (${i + 1}/${TEST_QUESTIONS.length}): "${question.substring(0, 50)}..."`);
    
    const result = await testQuestion(question);
    results.push(result);
    
    if (result.success) {
      const speed = result.responseTime < 1000 ? '🚀 ULTRA-FAST' :
                   result.responseTime < 2000 ? '⚡ FAST' :
                   result.responseTime < 4000 ? '🟡 MEDIUM' : '🔴 SLOW';
      
      console.log(`   ${speed} ${result.responseTime}ms (${result.sections} sections, ${result.followUps} follow-ups)`);
    } else {
      console.log(`   ❌ FAILED: ${result.error}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n📊 SPEED TEST SUMMARY');
  console.log('====================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    const times = successful.map(r => r.responseTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`⚡ Average: ${avg.toFixed(0)}ms`);
    console.log(`🚀 Fastest: ${min}ms`);
    console.log(`🐌 Slowest: ${max}ms`);
    
    // Speed categories
    const ultraFast = times.filter(t => t < 1000).length;
    const fast = times.filter(t => t >= 1000 && t < 2000).length;
    const medium = times.filter(t => t >= 2000 && t < 4000).length;
    const slow = times.filter(t => t >= 4000).length;
    
    console.log(`\n🚀 Ultra-fast (<1s): ${ultraFast}`);
    console.log(`⚡ Fast (1-2s): ${fast}`);
    console.log(`🟡 Medium (2-4s): ${medium}`);
    console.log(`🔴 Slow (>4s): ${slow}`);
    
    // Performance rating
    const score = (ultraFast * 4 + fast * 3 + medium * 2 + slow * 1) / successful.length;
    const grade = score >= 3.5 ? 'A' : score >= 3 ? 'B' : score >= 2.5 ? 'C' : 'D';
    
    console.log(`\n🏆 Performance Grade: ${grade} (${score.toFixed(1)}/4.0)`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Tests: ${failed.length}`);
    failed.forEach(result => {
      console.log(`   "${result.question.substring(0, 40)}..." - ${result.error}`);
    });
  }
  
  console.log('\n💡 Speed Optimization Tips:');
  console.log('- Predictive cache: Instant responses for common questions');
  console.log('- Claude 3 Haiku: 5x faster for conversational responses');  
  console.log('- Follow-up detection: Ultra-fast for short questions');
  console.log('- Request deduplication: Prevents redundant API calls');
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSpeedTest().catch(console.error);
}