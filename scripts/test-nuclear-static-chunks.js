#!/usr/bin/env node

/**
 * Nuclear Static Files Test at /_next/static/chunks/nuclear-static/
 * 
 * Tests if nuclear static files are accessible at the expected
 * Next.js static chunks path and contain valid JSON data
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const NUCLEAR_STATIC_PATH = '/_next/static/chunks/nuclear-static/';

console.log('⚛️  Testing Nuclear Static Files at /_next/static/chunks/nuclear-static/');
console.log('================================================================');

async function testNuclearStaticChunks() {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Array to store found nuclear static files
    const nuclearFiles = [];
    const accessibleFiles = [];
    const failedFiles = [];
    
    console.log(`\n📍 Testing Base URL: ${PRODUCTION_URL}`);
    console.log(`🎯 Nuclear Static Path: ${NUCLEAR_STATIC_PATH}`);
    console.log('⏳ Scanning for nuclear static files...\n');
    
    // First, try to access the nuclear static directory directly
    const nuclearDirUrl = `${PRODUCTION_URL}${NUCLEAR_STATIC_PATH}`;
    console.log(`📂 Testing directory: ${nuclearDirUrl}`);
    
    try {
      const dirResponse = await page.goto(nuclearDirUrl, { 
        waitUntil: 'networkidle0',
        timeout: 15000 
      });
      
      console.log(`📡 Directory Response: ${dirResponse.status()}`);
      
      if (dirResponse.status() === 200) {
        // Check if it's a directory listing or redirect
        const content = await page.content();
        console.log('✅ Directory accessible');
        console.log(`📄 Content preview: ${content.substring(0, 200)}...`);
      }
    } catch (dirError) {
      console.log(`❌ Directory not accessible: ${dirError.message}`);
    }
    
    // Test specific nuclear static file patterns
    const testFiles = [
      'movie-11.json',
      'movie-550.json', 
      'index.json',
      'props-movie-11.json',
      'props-movie-550.json',
      'static-movie-11.json',
      'static-movie-550.json'
    ];
    
    console.log('\n🧪 Testing specific nuclear static files:');
    
    for (const filename of testFiles) {
      const fileUrl = `${PRODUCTION_URL}${NUCLEAR_STATIC_PATH}${filename}`;
      console.log(`\n📄 Testing: ${filename}`);
      console.log(`   URL: ${fileUrl}`);
      
      try {
        const fileResponse = await page.goto(fileUrl, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        const status = fileResponse.status();
        console.log(`   Status: ${status}`);
        
        if (status === 200) {
          // Try to read and validate JSON content
          try {
            const content = await page.content();
            
            // Extract JSON from HTML if needed
            let jsonContent = content;
            if (content.includes('<pre>')) {
              const preMatch = content.match(/<pre[^>]*>(.*?)<\/pre>/s);
              if (preMatch) {
                jsonContent = preMatch[1];
              }
            }
            
            // Validate JSON
            const parsedJson = JSON.parse(jsonContent);
            
            accessibleFiles.push({
              filename,
              url: fileUrl,
              status,
              size: content.length,
              hasValidJson: true,
              dataPreview: JSON.stringify(parsedJson).substring(0, 100) + '...'
            });
            
            console.log(`   ✅ Valid JSON (${content.length} bytes)`);
            console.log(`   📝 Preview: ${JSON.stringify(parsedJson).substring(0, 100)}...`);
            
          } catch (jsonError) {
            // Still accessible but invalid JSON
            accessibleFiles.push({
              filename,
              url: fileUrl,
              status,
              size: await page.content().then(c => c.length),
              hasValidJson: false,
              error: jsonError.message
            });
            
            console.log(`   ⚠️  File accessible but invalid JSON: ${jsonError.message}`);
          }
          
        } else {
          failedFiles.push({
            filename,
            url: fileUrl,
            status,
            error: fileResponse.statusText()
          });
          
          console.log(`   ❌ ${status} ${fileResponse.statusText()}`);
        }
        
      } catch (fileError) {
        failedFiles.push({
          filename,
          url: fileUrl,
          status: 'ERROR',
          error: fileError.message
        });
        
        console.log(`   💥 Request failed: ${fileError.message}`);
      }
    }
    
    // Also check if nuclear static files are referenced in the main movie page
    console.log('\n🔍 Checking if nuclear static files are referenced in /movie/11:');
    
    try {
      const moviePageUrl = `${PRODUCTION_URL}/movie/11`;
      const movieResponse = await page.goto(moviePageUrl, {
        waitUntil: 'networkidle0',
        timeout: 15000
      });
      
      console.log(`📡 Movie page status: ${movieResponse.status()}`);
      
      if (movieResponse.status() === 200) {
        const pageContent = await page.content();
        
        // Look for nuclear static references
        const nuclearRefs = {
          hasNuclearStaticPath: pageContent.includes('nuclear-static'),
          hasNextStaticChunks: pageContent.includes('/_next/static/chunks/'),
          hasMovieJsonRef: pageContent.includes('movie-11.json'),
          hasPropsJsonRef: pageContent.includes('props-movie-11.json')
        };
        
        console.log('   Nuclear static references:');
        Object.entries(nuclearRefs).forEach(([key, found]) => {
          const emoji = found ? '✅' : '❌';
          console.log(`   ${emoji} ${key}: ${found}`);
        });
        
        // Look for Next.js chunk loading patterns
        const nextDataMatch = pageContent.match(/__NEXT_DATA__\s*=\s*(\{.*?\})/);
        if (nextDataMatch) {
          console.log('   ✅ Found __NEXT_DATA__ in page');
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            console.log(`   📊 Next.js data keys: ${Object.keys(nextData)}`);
          } catch (e) {
            console.log('   ⚠️  Could not parse __NEXT_DATA__');
          }
        } else {
          console.log('   ❌ No __NEXT_DATA__ found in page');
        }
      }
      
    } catch (moviePageError) {
      console.log(`   💥 Could not check movie page: ${moviePageError.message}`);
    }
    
    // Generate comprehensive report
    console.log('\n📊 NUCLEAR STATIC CHUNKS REPORT');
    console.log('===============================');
    
    console.log(`\n📈 File Access Summary:`);
    console.log(`   Total files tested: ${testFiles.length}`);
    console.log(`   Accessible files: ${accessibleFiles.length}`);
    console.log(`   Failed files: ${failedFiles.length}`);
    console.log(`   Valid JSON files: ${accessibleFiles.filter(f => f.hasValidJson).length}`);
    
    if (accessibleFiles.length > 0) {
      console.log(`\n✅ ACCESSIBLE FILES:`);
      accessibleFiles.forEach((file, index) => {
        console.log(`\n${index + 1}. ${file.filename}`);
        console.log(`   Status: ${file.status}`);
        console.log(`   Size: ${file.size} bytes`);
        console.log(`   Valid JSON: ${file.hasValidJson ? '✅' : '❌'}`);
        if (file.hasValidJson) {
          console.log(`   Data: ${file.dataPreview}`);
        } else if (file.error) {
          console.log(`   Error: ${file.error}`);
        }
      });
    }
    
    if (failedFiles.length > 0) {
      console.log(`\n❌ FAILED FILES:`);
      failedFiles.forEach((file, index) => {
        console.log(`\n${index + 1}. ${file.filename}`);
        console.log(`   Status: ${file.status}`);
        console.log(`   Error: ${file.error}`);
        console.log(`   URL: ${file.url}`);
      });
    }
    
    // Evaluation criteria
    const hasAccessibleFiles = accessibleFiles.length > 0;
    const hasValidJsonFiles = accessibleFiles.some(f => f.hasValidJson);
    const hasMovieSpecificFiles = accessibleFiles.some(f => 
      f.filename.includes('movie-11') || f.filename.includes('movie-550')
    );
    const hasReasonableFileCount = accessibleFiles.length >= 2;
    
    console.log(`\n🎯 NUCLEAR STATIC VALIDATION:`);
    console.log(`${hasAccessibleFiles ? '✅' : '❌'} Has accessible files: ${hasAccessibleFiles}`);
    console.log(`${hasValidJsonFiles ? '✅' : '❌'} Has valid JSON files: ${hasValidJsonFiles}`);
    console.log(`${hasMovieSpecificFiles ? '✅' : '❌'} Has movie-specific files: ${hasMovieSpecificFiles}`);
    console.log(`${hasReasonableFileCount ? '✅' : '❌'} Reasonable file count: ${hasReasonableFileCount}`);
    
    const overallSuccess = hasAccessibleFiles && hasValidJsonFiles && hasMovieSpecificFiles;
    console.log(`\n🏆 OVERALL STATUS: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    
    if (!overallSuccess) {
      console.log('\n🚨 Issues detected:');
      if (!hasAccessibleFiles) {
        console.log('   - No nuclear static files accessible at expected path');
      }
      if (!hasValidJsonFiles) {
        console.log('   - No valid JSON files found in nuclear static directory');
      }
      if (!hasMovieSpecificFiles) {
        console.log('   - Missing movie-specific nuclear static files');
      }
    }
    
    return {
      success: overallSuccess,
      summary: {
        totalTested: testFiles.length,
        accessible: accessibleFiles.length,
        failed: failedFiles.length,
        validJson: accessibleFiles.filter(f => f.hasValidJson).length
      },
      details: {
        accessibleFiles,
        failedFiles
      },
      criteria: {
        hasAccessibleFiles,
        hasValidJsonFiles,
        hasMovieSpecificFiles,
        hasReasonableFileCount
      }
    };
    
  } catch (error) {
    console.error('\n💥 Nuclear static chunks test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testNuclearStaticChunks()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Nuclear static chunks test passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Nuclear static chunks test detected issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });