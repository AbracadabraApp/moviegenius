#!/usr/bin/env node

/**
 * Navigation Bar Test
 * 
 * Tests if navigation bar renders correctly and contains
 * functional links for user interaction
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const TEST_ROUTE = '/movie/11';

console.log('🧭 Testing Navigation Bar on /movie/11');
console.log('=====================================');

async function testNavigation() {
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
    console.log('⏳ Loading page and analyzing navigation...\n');
    
    // Navigate to page
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`📡 HTTP Status: ${response.status()}`);
    
    if (response.status() !== 200) {
      throw new Error(`Page returned ${response.status()}, expected 200`);
    }
    
    // Comprehensive navigation analysis
    const navigationAnalysis = await page.evaluate(() => {
      // Look for navigation elements with various selectors
      const navSelectors = [
        'nav',
        '[role="navigation"]',
        '.nav',
        '.navbar',
        '.navigation',
        'header nav',
        '[data-testid*="nav"]'
      ];
      
      const foundNavElements = [];
      navSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          foundNavElements.push({
            selector,
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textContent: el.textContent.substring(0, 100),
            childCount: el.children.length,
            hasLinks: el.querySelectorAll('a').length > 0,
            linkCount: el.querySelectorAll('a').length
          });
        });
      });
      
      // Look for any links on the page
      const allLinks = Array.from(document.querySelectorAll('a[href]')).map(link => ({
        href: link.href,
        text: link.textContent.trim(),
        target: link.target,
        className: link.className,
        id: link.id,
        isInternal: link.href.includes(window.location.origin),
        isMovieLink: link.href.includes('/movie/'),
        isHashLink: link.href.includes('#')
      }));
      
      // Check for common navigation patterns
      const navigationPatterns = {
        hasHomeLink: allLinks.some(link => 
          link.text.toLowerCase().includes('home') || 
          link.href.endsWith('/') ||
          link.text.toLowerCase().includes('moviegenius')
        ),
        hasMovieLinks: allLinks.some(link => link.isMovieLink),
        hasSearchLink: allLinks.some(link => 
          link.text.toLowerCase().includes('search') ||
          link.href.includes('search')
        ),
        hasGenreLinks: allLinks.some(link => 
          link.text.toLowerCase().includes('genre') ||
          link.href.includes('genre')
        ),
        hasAboutLink: allLinks.some(link => 
          link.text.toLowerCase().includes('about')
        )
      };
      
      // Check for interactive elements
      const interactiveElements = {
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input').length,
        selects: document.querySelectorAll('select').length,
        clickableElements: document.querySelectorAll('[onclick], [role="button"]').length
      };
      
      return {
        foundNavElements,
        allLinks,
        navigationPatterns,
        interactiveElements,
        totalNavigationElements: foundNavElements.length,
        totalLinks: allLinks.length,
        hasAnyNavigation: foundNavElements.length > 0 || allLinks.length > 0
      };
    });
    
    console.log('📊 Navigation Analysis Results:');
    console.log('===============================');
    
    console.log(`\n🧭 Navigation Elements Found: ${navigationAnalysis.totalNavigationElements}`);
    if (navigationAnalysis.foundNavElements.length > 0) {
      navigationAnalysis.foundNavElements.forEach((nav, index) => {
        console.log(`\n   ${index + 1}. ${nav.selector}`);
        console.log(`      Tag: ${nav.tagName}`);
        console.log(`      Class: ${nav.className || 'none'}`);
        console.log(`      ID: ${nav.id || 'none'}`);
        console.log(`      Children: ${nav.childCount}`);
        console.log(`      Has links: ${nav.hasLinks ? '✅' : '❌'}`);
        console.log(`      Link count: ${nav.linkCount}`);
        console.log(`      Text: ${nav.textContent || 'empty'}`);
      });
    } else {
      console.log('   ❌ No navigation elements found');
    }
    
    console.log(`\n🔗 Total Links Found: ${navigationAnalysis.totalLinks}`);
    if (navigationAnalysis.allLinks.length > 0) {
      console.log('   Sample links:');
      navigationAnalysis.allLinks.slice(0, 5).forEach((link, index) => {
        console.log(`   ${index + 1}. "${link.text}" → ${link.href}`);
        console.log(`      Internal: ${link.isInternal ? '✅' : '❌'}`);
        console.log(`      Movie link: ${link.isMovieLink ? '✅' : '❌'}`);
      });
      
      if (navigationAnalysis.allLinks.length > 5) {
        console.log(`   ... and ${navigationAnalysis.allLinks.length - 5} more links`);
      }
    } else {
      console.log('   ❌ No links found on page');
    }
    
    console.log('\n🎯 Navigation Patterns:');
    Object.entries(navigationAnalysis.navigationPatterns).forEach(([pattern, found]) => {
      const emoji = found ? '✅' : '❌';
      console.log(`   ${emoji} ${pattern}: ${found}`);
    });
    
    console.log('\n🖱️  Interactive Elements:');
    Object.entries(navigationAnalysis.interactiveElements).forEach(([element, count]) => {
      const emoji = count > 0 ? '✅' : '❌';
      console.log(`   ${emoji} ${element}: ${count}`);
    });
    
    // Try to interact with navigation if it exists
    console.log('\n🧪 Testing Navigation Interactions:');
    try {
      if (navigationAnalysis.totalLinks > 0) {
        // Try to hover over first link
        const firstLink = await page.$('a[href]');
        if (firstLink) {
          await firstLink.hover();
          console.log('   ✅ Successfully hovered over first link');
          
          // Check if link has valid href
          const href = await firstLink.evaluate(el => el.href);
          console.log(`   🔗 First link href: ${href}`);
          
          if (href && href !== 'javascript:void(0)' && href !== '#') {
            console.log('   ✅ Link has valid href');
          } else {
            console.log('   ❌ Link has invalid or empty href');
          }
        }
      } else {
        console.log('   ❌ No links available for interaction testing');
      }
    } catch (interactionError) {
      console.log(`   ❌ Interaction test failed: ${interactionError.message}`);
    }
    
    // Evaluation criteria
    const hasWorkingNavigation = 
      navigationAnalysis.totalNavigationElements > 0 &&
      navigationAnalysis.totalLinks > 0;
    
    const hasExpectedPatterns = 
      navigationAnalysis.navigationPatterns.hasHomeLink ||
      navigationAnalysis.navigationPatterns.hasMovieLinks;
    
    const hasInteractivity = 
      navigationAnalysis.totalLinks > 0 ||
      navigationAnalysis.interactiveElements.buttons > 0;
    
    console.log('\n🎯 NAVIGATION VALIDATION:');
    console.log('=========================');
    console.log(`${hasWorkingNavigation ? '✅' : '❌'} Working navigation: ${hasWorkingNavigation}`);
    console.log(`${hasExpectedPatterns ? '✅' : '❌'} Expected patterns: ${hasExpectedPatterns}`);
    console.log(`${hasInteractivity ? '✅' : '❌'} Interactive elements: ${hasInteractivity}`);
    
    const overallSuccess = hasWorkingNavigation && hasExpectedPatterns && hasInteractivity;
    console.log(`\n🏆 OVERALL STATUS: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    
    if (!overallSuccess) {
      console.log('\n🚨 Navigation issues detected:');
      if (!hasWorkingNavigation) {
        console.log('   - No functional navigation elements found');
      }
      if (!hasExpectedPatterns) {
        console.log('   - Missing expected navigation patterns (home, movies)');
      }
      if (!hasInteractivity) {
        console.log('   - No interactive elements for user interaction');
      }
    }
    
    return {
      success: overallSuccess,
      analysis: navigationAnalysis,
      url,
      criteria: {
        hasWorkingNavigation,
        hasExpectedPatterns,
        hasInteractivity
      }
    };
    
  } catch (error) {
    console.error('\n💥 Navigation test failed:', error.message);
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

// Run the test
testNavigation()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Navigation test passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Navigation test detected issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });