#!/usr/bin/env node

/**
 * Verify #__next Root Element Test
 * 
 * Tests if the Next.js root element renders correctly and contains
 * the expected React application structure
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const TEST_ROUTE = '/movie/11';

console.log('🔍 Verifying #__next Root Element on /movie/11');
console.log('==============================================');

async function verifyNextRoot() {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    const url = `${PRODUCTION_URL}${TEST_ROUTE}`;
    console.log(`\n📍 Testing URL: ${url}`);
    console.log('⏳ Loading page and analyzing root element...\n');
    
    // Navigate to page
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`📡 HTTP Status: ${response.status()}`);
    
    if (response.status() !== 200) {
      throw new Error(`Page returned ${response.status()}, expected 200`);
    }
    
    // Comprehensive #__next element analysis
    const nextRootAnalysis = await page.evaluate(() => {
      const nextRoot = document.querySelector('#__next');
      
      if (!nextRoot) {
        return {
          exists: false,
          error: 'Element #__next not found in DOM'
        };
      }
      
      const analysis = {
        exists: true,
        tagName: nextRoot.tagName,
        id: nextRoot.id,
        className: nextRoot.className,
        childCount: nextRoot.children.length,
        hasContent: nextRoot.innerHTML.length > 0,
        textContent: nextRoot.textContent?.substring(0, 200) + '...',
        innerHTML: nextRoot.innerHTML.substring(0, 300) + '...',
        computedStyle: {
          display: window.getComputedStyle(nextRoot).display,
          visibility: window.getComputedStyle(nextRoot).visibility,
          opacity: window.getComputedStyle(nextRoot).opacity
        },
        boundingRect: nextRoot.getBoundingClientRect(),
        attributes: Array.from(nextRoot.attributes).map(attr => ({
          name: attr.name,
          value: attr.value
        }))
      };
      
      // Check for React-specific indicators
      analysis.reactIndicators = {
        hasDataReactRoot: !!nextRoot.querySelector('[data-reactroot]'),
        hasReactFiber: !!nextRoot._reactInternalFiber || !!nextRoot._reactInternalInstance,
        hasReactChildren: nextRoot.children.length > 0
      };
      
      // Check for specific Next.js app structure
      analysis.nextjsStructure = {
        hasAppContainer: !!nextRoot.querySelector('[id*="app"], [class*="app"]'),
        hasPageContent: !!nextRoot.querySelector('main, [role="main"], .page'),
        hasNavigation: !!nextRoot.querySelector('nav, [role="navigation"]'),
        hasHeader: !!nextRoot.querySelector('header, [role="banner"]'),
        hasFooter: !!nextRoot.querySelector('footer, [role="contentinfo"]')
      };
      
      // Check for movie-specific content
      analysis.movieContent = {
        hasTitle: !!nextRoot.querySelector('h1, h2, [data-testid*="title"]'),
        hasPoster: !!nextRoot.querySelector('img[alt*="poster"], img[src*="image.tmdb"]'),
        hasDescription: !!nextRoot.querySelector('p, [data-testid*="description"]'),
        hasMovieData: nextRoot.textContent.toLowerCase().includes('star wars')
      };
      
      return analysis;
    });
    
    console.log('📊 #__next Root Element Analysis:');
    console.log('=================================');
    
    if (!nextRootAnalysis.exists) {
      console.log('❌ CRITICAL: #__next element not found');
      console.log(`   Error: ${nextRootAnalysis.error}`);
      return { success: false, analysis: nextRootAnalysis };
    }
    
    console.log(`✅ Element exists: ${nextRootAnalysis.exists}`);
    console.log(`📝 Tag: ${nextRootAnalysis.tagName}`);
    console.log(`🆔 ID: ${nextRootAnalysis.id}`);
    console.log(`📚 Class: ${nextRootAnalysis.className || 'none'}`);
    console.log(`👶 Children: ${nextRootAnalysis.childCount}`);
    console.log(`📄 Has content: ${nextRootAnalysis.hasContent}`);
    
    console.log('\n🎨 Visual Properties:');
    console.log(`   Display: ${nextRootAnalysis.computedStyle.display}`);
    console.log(`   Visibility: ${nextRootAnalysis.computedStyle.visibility}`);
    console.log(`   Opacity: ${nextRootAnalysis.computedStyle.opacity}`);
    console.log(`   Width: ${nextRootAnalysis.boundingRect.width}px`);
    console.log(`   Height: ${nextRootAnalysis.boundingRect.height}px`);
    
    console.log('\n⚛️  React Indicators:');
    Object.entries(nextRootAnalysis.reactIndicators).forEach(([key, value]) => {
      const emoji = value ? '✅' : '❌';
      console.log(`   ${emoji} ${key}: ${value}`);
    });
    
    console.log('\n🏗️  Next.js Structure:');
    Object.entries(nextRootAnalysis.nextjsStructure).forEach(([key, value]) => {
      const emoji = value ? '✅' : '❌';
      console.log(`   ${emoji} ${key}: ${value}`);
    });
    
    console.log('\n🎬 Movie Content:');
    Object.entries(nextRootAnalysis.movieContent).forEach(([key, value]) => {
      const emoji = value ? '✅' : '❌';
      console.log(`   ${emoji} ${key}: ${value}`);
    });
    
    if (nextRootAnalysis.attributes.length > 0) {
      console.log('\n🏷️  Attributes:');
      nextRootAnalysis.attributes.forEach(attr => {
        console.log(`   ${attr.name}: ${attr.value}`);
      });
    }
    
    console.log('\n📝 Content Preview:');
    console.log(`   Text: ${nextRootAnalysis.textContent}`);
    console.log(`   HTML: ${nextRootAnalysis.innerHTML}`);
    
    // Evaluation criteria
    const isProperlyRendered = 
      nextRootAnalysis.exists &&
      nextRootAnalysis.hasContent &&
      nextRootAnalysis.childCount > 0 &&
      nextRootAnalysis.computedStyle.display !== 'none' &&
      nextRootAnalysis.computedStyle.visibility !== 'hidden' &&
      nextRootAnalysis.boundingRect.width > 0 &&
      nextRootAnalysis.boundingRect.height > 0;
    
    const hasReactStructure = 
      nextRootAnalysis.reactIndicators.hasReactChildren ||
      nextRootAnalysis.nextjsStructure.hasPageContent;
    
    const hasExpectedContent = 
      nextRootAnalysis.movieContent.hasMovieData;
    
    console.log('\n🎯 ROOT ELEMENT VALIDATION:');
    console.log('===========================');
    console.log(`${isProperlyRendered ? '✅' : '❌'} Properly rendered: ${isProperlyRendered}`);
    console.log(`${hasReactStructure ? '✅' : '❌'} React structure: ${hasReactStructure}`);
    console.log(`${hasExpectedContent ? '✅' : '❌'} Expected content: ${hasExpectedContent}`);
    
    const overallSuccess = isProperlyRendered && hasReactStructure && hasExpectedContent;
    console.log(`\n🏆 OVERALL STATUS: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    
    if (!overallSuccess) {
      console.log('\n🚨 Issues detected:');
      if (!isProperlyRendered) {
        console.log('   - #__next element not properly rendered or visible');
      }
      if (!hasReactStructure) {
        console.log('   - Missing React/Next.js application structure');
      }
      if (!hasExpectedContent) {
        console.log('   - Missing expected movie content');
      }
    }
    
    return {
      success: overallSuccess,
      analysis: nextRootAnalysis,
      url,
      criteria: {
        isProperlyRendered,
        hasReactStructure,
        hasExpectedContent
      }
    };
    
  } catch (error) {
    console.error('\n💥 Root element verification failed:', error.message);
    return {
      success: false,
      error: error.message,
      url: `${PRODUCTION_URL}${TEST_ROUTE}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the verification
verifyNextRoot()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 #__next root element verification passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  #__next root element has issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Verification execution failed:', error);
    process.exit(1);
  });