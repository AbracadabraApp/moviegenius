#!/usr/bin/env node

// Verbose hydration debugging with line-by-line execution tracking
import { launch } from 'puppeteer';

async function debugHydrationVerbose() {
  console.log('=== VERBOSE HYDRATION DEBUG SCRIPT START ===');
  console.log('Line 1: Starting hydration debugging...');
  
  console.log('Line 2: Launching Puppeteer browser...');
  const browser = await launch({ 
    headless: true, // Changed to headless for clean output
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('Line 3: ✅ Browser launched successfully');
  
  try {
    console.log('Line 4: Creating new page...');
    const page = await browser.newPage();
    console.log('Line 5: ✅ Page created');
    
    console.log('Line 6: Initializing log and error arrays...');
    const logs = [];
    const errors = [];
    console.log('Line 7: ✅ Arrays initialized');
    
    console.log('Line 8: Setting up console message capture...');
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      console.log(`[CONSOLE-${msg.type().toUpperCase()}] ${text}`);
    });
    console.log('Line 9: ✅ Console capture enabled');
    
    console.log('Line 10: Setting up page error capture...');
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`[PAGE-ERROR] ${error.message}`);
    });
    console.log('Line 11: ✅ Page error capture enabled');
    
    console.log('Line 12: Setting up general error capture...');
    page.on('error', error => {
      errors.push(error.message);
      console.log(`[ERROR] ${error.message}`);
    });
    console.log('Line 13: ✅ General error capture enabled');
    
    console.log('Line 14: Navigating to http://localhost:3000/movie/11...');
    const navigationStart = Date.now();
    await page.goto('http://localhost:3000/movie/11', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    const navigationTime = Date.now() - navigationStart;
    console.log(`Line 15: ✅ Navigation completed in ${navigationTime}ms`);
    
    console.log('Line 16: Waiting 5 seconds for page to settle...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Line 17: ✅ Wait completed');
    
    console.log('Line 18: Starting page state inspection...');
    
    console.log('Line 19: Evaluating page state in browser context...');
    const pageState = await page.evaluate(() => {
      console.log('Line 19a: Inside browser evaluation context');
      
      console.log('Line 19b: Checking for #__next element...');
      const hasRoot = !!document.querySelector('#__next');
      console.log(`Line 19c: Root element found: ${hasRoot}`);
      
      console.log('Line 19d: Checking for nav element...');
      const hasNav = !!document.querySelector('nav');
      console.log(`Line 19e: Nav element found: ${hasNav}`);
      
      console.log('Line 19f: Counting navigation links...');
      const navLinks = document.querySelectorAll('a[href]');
      console.log(`Line 19g: Found ${navLinks.length} navigation links`);
      
      console.log('Line 19h: Checking for H1 element...');
      const hasH1 = !!document.querySelector('h1');
      console.log(`Line 19i: H1 element found: ${hasH1}`);
      
      console.log('Line 19j: Checking content length...');
      const contentLength = document.body.textContent.length;
      const hasContent = contentLength > 1000;
      console.log(`Line 19k: Content length: ${contentLength}, sufficient content: ${hasContent}`);
      
      console.log('Line 19l: Getting page title...');
      const title = document.title;
      console.log(`Line 19m: Page title: "${title}"`);
      
      console.log('Line 19n: Getting current URL...');
      const url = window.location.href;
      console.log(`Line 19o: Current URL: ${url}`);
      
      console.log('Line 19p: Getting body HTML length...');
      const bodyLength = document.body.innerHTML.length;
      console.log(`Line 19q: Body HTML length: ${bodyLength}`);
      
      console.log('Line 19r: Getting root element preview...');
      const rootElement = hasRoot ? 
        document.querySelector('#__next').innerHTML.substring(0, 200) + '...' : 
        'missing';
      console.log(`Line 19s: Root element preview length: ${rootElement.length}`);
      
      console.log('Line 19t: Returning page state object...');
      return {
        hasRoot,
        hasNav,
        linkCount: navLinks.length,
        hasH1,
        hasContent,
        title,
        url,
        bodyLength,
        rootElement,
        contentLength
      };
    });
    console.log('Line 20: ✅ Page state evaluation completed');
    
    console.log('Line 21: Analyzing page state results...');
    console.log('=== PAGE STATE ANALYSIS ===');
    console.log(`Line 22: Root Element (#__next): ${pageState.hasRoot ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`Line 23: Navigation: ${pageState.hasNav ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`Line 24: Navigation Links: ${pageState.linkCount} found`);
    console.log(`Line 25: H1 Title: ${pageState.hasH1 ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`Line 26: Rich Content: ${pageState.hasContent ? '✅ SUFFICIENT' : '❌ INSUFFICIENT'} (${pageState.contentLength} chars)`);
    console.log(`Line 27: Page Title: "${pageState.title}"`);
    console.log(`Line 28: URL: ${pageState.url}`);
    console.log(`Line 29: Body HTML Length: ${pageState.bodyLength} characters`);
    
    if (pageState.hasRoot) {
      console.log('Line 30: Root element content preview:');
      console.log(`Line 31: ${pageState.rootElement}`);
    } else {
      console.log('Line 30: ❌ No root element to preview');
    }
    
    console.log(`Line 32: Total console logs captured: ${logs.length}`);
    if (logs.length > 0) {
      console.log('Line 33: Recent console logs:');
      logs.slice(-10).forEach((log, i) => {
        console.log(`Line 33.${i + 1}: ${log}`);
      });
    } else {
      console.log('Line 33: No console logs captured');
    }
    
    console.log(`Line 34: Total errors captured: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Line 35: Error details:');
      errors.forEach((error, i) => {
        console.log(`Line 35.${i + 1}: ${error}`);
      });
    } else {
      console.log('Line 35: ✅ No errors captured');
    }
    
    console.log('Line 36: Filtering hydration-related issues...');
    const hydrationIssues = logs.filter(log => 
      log.includes('Error #418') || 
      log.includes('Error #423') || 
      log.includes('hydration') ||
      log.includes('require') ||
      log.includes('ReferenceError')
    );
    console.log(`Line 37: Found ${hydrationIssues.length} hydration-related issues`);
    
    if (hydrationIssues.length > 0) {
      console.log('Line 38: Hydration issue details:');
      hydrationIssues.forEach((issue, i) => {
        console.log(`Line 38.${i + 1}: ${issue}`);
      });
    } else {
      console.log('Line 38: ✅ No hydration issues detected');
    }
    
    console.log('Line 39: Generating colleague-style summary...');
    const summary = {
      requireAvailable: !logs.some(log => log.includes("Can't find variable: require")),
      hydrationErrorCount: hydrationIssues.length,
      clientSideWorking: pageState.hasRoot && pageState.hasNav && pageState.linkCount >= 2,
      bundleErrorCount: errors.filter(e => e.includes('bundle')).length,
      validationPassed: pageState.hasRoot && pageState.hasNav && pageState.hasContent && errors.length === 0
    };
    console.log('Line 40: ✅ Summary generated');
    
    console.log('=== COLLEAGUE-STYLE VALIDATION SUMMARY ===');
    console.log(`Line 41: requireAvailable: ${summary.requireAvailable ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`Line 42: hydrationErrorCount: ${summary.hydrationErrorCount}`);
    console.log(`Line 43: clientSideWorking: ${summary.clientSideWorking ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`Line 44: bundleErrorCount: ${summary.bundleErrorCount}`);
    console.log(`Line 45: validationPassed: ${summary.validationPassed ? '✅ TRUE' : '❌ FALSE'}`);
    
    console.log('Line 46: Closing browser...');
    await browser.close();
    console.log('Line 47: ✅ Browser closed successfully');
    
    console.log('=== FINAL ASSESSMENT ===');
    if (summary.validationPassed) {
      console.log('Line 48: 🎉 OVERALL STATUS: SUCCESS - Movie page is working correctly');
    } else {
      console.log('Line 48: ⚠️ OVERALL STATUS: ISSUES DETECTED - Movie page has problems');
    }
    
    console.log('=== VERBOSE HYDRATION DEBUG SCRIPT COMPLETE ===');
    
  } catch (error) {
    console.log(`Line ERROR: Script failed with error: ${error.message}`);
    console.log('Line ERROR+1: Closing browser due to error...');
    await browser.close();
    console.log('Line ERROR+2: Browser closed');
  }
}

debugHydrationVerbose();