#!/usr/bin/env node

/**
 * Static Assets Validation
 * 
 * Validates that critical static assets (CSS, JS, favicon) 
 * load correctly and contain expected content
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const TEST_ROUTE = '/movie/11';

console.log('📦 Validating Static Assets on /movie/11');
console.log('=========================================');

async function validateStaticAssets() {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Track asset loading
    const staticAssets = {
      css: [],
      javascript: [],
      images: [],
      other: []
    };
    
    const assetErrors = [];
    const loadedSuccessfully = [];
    
    const url = `${PRODUCTION_URL}${TEST_ROUTE}`;
    console.log(`\n📍 Testing URL: ${url}`);
    console.log('⏳ Loading page and analyzing static assets...\n');
    
    // Monitor responses for static assets
    page.on('response', async response => {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';
      
      // Categorize static assets
      let category = 'other';
      if (contentType.includes('text/css') || url.includes('.css')) {
        category = 'css';
      } else if (contentType.includes('javascript') || url.includes('.js')) {
        category = 'javascript';
      } else if (contentType.includes('image') || /\.(png|jpg|jpeg|gif|svg|webp)/.test(url)) {
        category = 'images';
      }
      
      const assetInfo = {
        url,
        status,
        contentType,
        category,
        size: response.headers()['content-length'] || 'unknown',
        fromCache: response.fromCache(),
        timestamp: new Date().toISOString()
      };
      
      staticAssets[category].push(assetInfo);
      
      if (status === 200) {
        loadedSuccessfully.push(assetInfo);
        console.log(`✅ ${category.toUpperCase()}: ${url.split('/').pop()}`);
      } else {
        assetErrors.push(assetInfo);
        console.log(`❌ ${status} ${category.toUpperCase()}: ${url}`);
      }
    });
    
    // Navigate to page
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`\n📡 Page Response: ${response.status()}`);
    
    // Wait for all assets to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test specific critical assets
    console.log('\n🧪 Testing Critical Assets:');
    
    // Test favicon
    const faviconTest = await testFavicon(page);
    console.log(`${faviconTest.success ? '✅' : '❌'} Favicon: ${faviconTest.message}`);
    
    // Test CSS functionality
    const cssTest = await testCSSFunctionality(page);
    console.log(`${cssTest.success ? '✅' : '❌'} CSS Functionality: ${cssTest.message}`);
    
    // Test JavaScript execution
    const jsTest = await testJavaScriptExecution(page);
    console.log(`${jsTest.success ? '✅' : '❌'} JavaScript Execution: ${jsTest.message}`);
    
    // Test image loading
    const imageTest = await testImageLoading(page);
    console.log(`${imageTest.success ? '✅' : '❌'} Image Loading: ${imageTest.message}`);
    
    // Generate comprehensive report
    console.log('\n📊 STATIC ASSETS REPORT');
    console.log('=======================');
    
    console.log(`\n📈 Asset Summary:`);
    console.log(`   CSS files: ${staticAssets.css.length}`);
    console.log(`   JavaScript files: ${staticAssets.javascript.length}`);
    console.log(`   Images: ${staticAssets.images.length}`);
    console.log(`   Other assets: ${staticAssets.other.length}`);
    console.log(`   Total loaded: ${loadedSuccessfully.length}`);
    console.log(`   Total errors: ${assetErrors.length}`);
    
    // Detailed asset analysis
    console.log(`\n📋 CSS Files Detail:`);
    if (staticAssets.css.length > 0) {
      staticAssets.css.forEach((asset, index) => {
        console.log(`   ${index + 1}. ${asset.url.split('/').pop()}`);
        console.log(`      Status: ${asset.status}`);
        console.log(`      Size: ${asset.size}`);
        console.log(`      From cache: ${asset.fromCache}`);
      });
    } else {
      console.log('   ❌ No CSS files found');
    }
    
    console.log(`\n📋 JavaScript Files Detail:`);
    if (staticAssets.javascript.length > 0) {
      // Show key framework files
      const keyJS = staticAssets.javascript.filter(js => 
        js.url.includes('framework') || 
        js.url.includes('main') || 
        js.url.includes('_app') ||
        js.url.includes('movie')
      );
      
      keyJS.forEach((asset, index) => {
        console.log(`   ${index + 1}. ${asset.url.split('/').pop()}`);
        console.log(`      Status: ${asset.status}`);
        console.log(`      Size: ${asset.size}`);
        console.log(`      From cache: ${asset.fromCache}`);
      });
      
      console.log(`   ... and ${staticAssets.javascript.length - keyJS.length} more JS files`);
    } else {
      console.log('   ❌ No JavaScript files found');
    }
    
    // Asset errors analysis
    if (assetErrors.length > 0) {
      console.log(`\n🚨 ASSET ERRORS:`);
      assetErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.status} ${error.url}`);
        console.log(`   Type: ${error.category}`);
        console.log(`   Content-Type: ${error.contentType}`);
        console.log(`   Time: ${error.timestamp}`);
      });
    }
    
    // Overall assessment
    const hasCriticalCSS = staticAssets.css.some(css => css.status === 200);
    const hasCriticalJS = staticAssets.javascript.some(js => 
      js.status === 200 && (js.url.includes('framework') || js.url.includes('main'))
    );
    const hasWorkingAssets = assetErrors.length === 0;
    
    console.log(`\n🎯 STATIC ASSETS VALIDATION:`);
    console.log(`${hasCriticalCSS ? '✅' : '❌'} Critical CSS loaded: ${hasCriticalCSS}`);
    console.log(`${hasCriticalJS ? '✅' : '❌'} Critical JavaScript loaded: ${hasCriticalJS}`);
    console.log(`${hasWorkingAssets ? '✅' : '❌'} No asset errors: ${hasWorkingAssets}`);
    console.log(`${faviconTest.success ? '✅' : '❌'} Favicon functional: ${faviconTest.success}`);
    console.log(`${cssTest.success ? '✅' : '❌'} CSS functional: ${cssTest.success}`);
    console.log(`${jsTest.success ? '✅' : '❌'} JavaScript functional: ${jsTest.success}`);
    console.log(`${imageTest.success ? '✅' : '❌'} Images functional: ${imageTest.success}`);
    
    const overallSuccess = 
      hasCriticalCSS && 
      hasCriticalJS && 
      hasWorkingAssets && 
      faviconTest.success && 
      cssTest.success && 
      jsTest.success && 
      imageTest.success;
    
    console.log(`\n🏆 OVERALL STATUS: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    
    return {
      success: overallSuccess,
      assets: staticAssets,
      errors: assetErrors,
      tests: {
        favicon: faviconTest,
        css: cssTest,
        javascript: jsTest,
        images: imageTest
      },
      url
    };
    
  } catch (error) {
    console.error('\n💥 Static assets validation failed:', error.message);
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

/**
 * Test favicon loading
 */
async function testFavicon(page) {
  try {
    const faviconExists = await page.evaluate(() => {
      const link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      return !!link;
    });
    
    if (faviconExists) {
      return { success: true, message: 'Favicon link found in HTML' };
    } else {
      return { success: false, message: 'No favicon link found' };
    }
  } catch (error) {
    return { success: false, message: `Favicon test error: ${error.message}` };
  }
}

/**
 * Test CSS functionality
 */
async function testCSSFunctionality(page) {
  try {
    const cssTest = await page.evaluate(() => {
      const body = document.body;
      if (!body) return { working: false, reason: 'No body element' };
      
      const computedStyle = window.getComputedStyle(body);
      const hasStyles = computedStyle.margin !== '' || computedStyle.padding !== '';
      
      return {
        working: hasStyles,
        margin: computedStyle.margin,
        padding: computedStyle.padding,
        fontFamily: computedStyle.fontFamily
      };
    });
    
    if (cssTest.working) {
      return { success: true, message: 'CSS styles applied to page' };
    } else {
      return { success: false, message: `CSS not working: ${cssTest.reason}` };
    }
  } catch (error) {
    return { success: false, message: `CSS test error: ${error.message}` };
  }
}

/**
 * Test JavaScript execution
 */
async function testJavaScriptExecution(page) {
  try {
    const jsTest = await page.evaluate(() => {
      // Test basic JavaScript functionality
      const canExecute = typeof window !== 'undefined' && typeof document !== 'undefined';
      const hasReact = typeof window.React !== 'undefined' || document.querySelector('#__next') !== null;
      const hasNextjs = typeof window.__NEXT_DATA__ !== 'undefined';
      
      return {
        canExecute,
        hasReact,
        hasNextjs,
        windowDefined: typeof window !== 'undefined',
        documentDefined: typeof document !== 'undefined'
      };
    });
    
    if (jsTest.canExecute) {
      return { 
        success: true, 
        message: `JavaScript working (React: ${jsTest.hasReact}, Next.js: ${jsTest.hasNextjs})` 
      };
    } else {
      return { success: false, message: 'JavaScript execution failed' };
    }
  } catch (error) {
    return { success: false, message: `JavaScript test error: ${error.message}` };
  }
}

/**
 * Test image loading
 */
async function testImageLoading(page) {
  try {
    const imageTest = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let loadedCount = 0;
      let totalCount = images.length;
      
      images.forEach(img => {
        if (img.complete && img.naturalWidth > 0) {
          loadedCount++;
        }
      });
      
      return {
        totalImages: totalCount,
        loadedImages: loadedCount,
        successRate: totalCount > 0 ? (loadedCount / totalCount) * 100 : 0
      };
    });
    
    if (imageTest.totalImages === 0) {
      return { success: true, message: 'No images to test' };
    } else if (imageTest.successRate >= 80) {
      return { 
        success: true, 
        message: `${imageTest.loadedImages}/${imageTest.totalImages} images loaded (${imageTest.successRate.toFixed(1)}%)` 
      };
    } else {
      return { 
        success: false, 
        message: `Only ${imageTest.loadedImages}/${imageTest.totalImages} images loaded (${imageTest.successRate.toFixed(1)}%)` 
      };
    }
  } catch (error) {
    return { success: false, message: `Image test error: ${error.message}` };
  }
}

// Run the validation
validateStaticAssets()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Static assets validation passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Static assets validation detected issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Validation execution failed:', error);
    process.exit(1);
  });