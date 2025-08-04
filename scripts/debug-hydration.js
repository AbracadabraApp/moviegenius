#!/usr/bin/env node

// Direct hydration debugging to understand what your colleague found
import { launch } from 'puppeteer';

async function debugHydration() {
  console.log('🔍 Debugging hydration issues...');
  
  const browser = await launch({ 
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    const logs = [];
    const errors = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      console.log(`[${msg.type()}]`, text);
    });
    
    // Capture all errors
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log('❌ PAGE ERROR:', error.message);
    });
    
    page.on('error', error => {
      errors.push(error.message);
      console.log('❌ ERROR:', error.message);
    });
    
    console.log('📍 Navigating to /movie/11...');
    await page.goto('http://localhost:3000/movie/11', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Wait for page to settle
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔍 Inspecting page state...');
    
    const pageState = await page.evaluate(() => {
      const hasRoot = !!document.querySelector('#__next');
      const hasNav = !!document.querySelector('nav');
      const navLinks = document.querySelectorAll('a[href]');
      const hasH1 = !!document.querySelector('h1');
      const hasContent = document.body.textContent.length > 1000;
      
      return {
        hasRoot,
        hasNav,
        linkCount: navLinks.length,
        hasH1,
        hasContent,
        title: document.title,
        url: window.location.href,
        bodyLength: document.body.innerHTML.length,
        rootElement: hasRoot ? document.querySelector('#__next').innerHTML.substring(0, 200) + '...' : 'missing'
      };
    });
    
    console.log('\n📊 Page State Analysis:');
    console.log('=======================');
    console.log(`Root Element (#__next): ${pageState.hasRoot ? '✅' : '❌'}`);
    console.log(`Navigation: ${pageState.hasNav ? '✅' : '❌'}`);
    console.log(`Navigation Links: ${pageState.linkCount}`);
    console.log(`H1 Title: ${pageState.hasH1 ? '✅' : '❌'}`);
    console.log(`Rich Content: ${pageState.hasContent ? '✅' : '❌'} (${pageState.bodyLength} chars)`);
    console.log(`Page Title: "${pageState.title}"`);
    console.log(`URL: ${pageState.url}`);
    
    if (pageState.hasRoot) {
      console.log(`\n📝 Root Element Content Preview:`);
      console.log(pageState.rootElement);
    }
    
    console.log(`\n📋 Console Logs (${logs.length} total):`);
    logs.slice(-10).forEach((log, i) => {
      console.log(`  ${i + 1}. ${log}`);
    });
    
    console.log(`\n🚨 Errors (${errors.length} total):`);
    errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    
    // Check for specific hydration issues your colleague found
    const hydrationIssues = logs.filter(log => 
      log.includes('Error #418') || 
      log.includes('Error #423') || 
      log.includes('hydration') ||
      log.includes('require') ||
      log.includes('ReferenceError')
    );
    
    console.log(`\n🔬 Hydration-Related Issues (${hydrationIssues.length}):`);
    hydrationIssues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    
    // Generate summary like your colleague's findings
    const summary = {
      requireAvailable: !logs.some(log => log.includes("Can't find variable: require")),
      hydrationErrorCount: hydrationIssues.length,
      clientSideWorking: pageState.hasRoot && pageState.hasNav && pageState.linkCount >= 2,
      bundleErrorCount: errors.filter(e => e.includes('bundle')).length,
      validationPassed: pageState.hasRoot && pageState.hasNav && pageState.hasContent && errors.length === 0
    };
    
    console.log('\n🎯 COLLEAGUE-STYLE SUMMARY:');
    console.log('============================');
    console.log(`requireAvailable: ${summary.requireAvailable ? '✅' : '❌'}`);
    console.log(`hydrationErrorCount: ${summary.hydrationErrorCount}`);
    console.log(`clientSideWorking: ${summary.clientSideWorking ? '✅' : '❌'}`);
    console.log(`bundleErrorCount: ${summary.bundleErrorCount}`);
    console.log(`validationPassed: ${summary.validationPassed ? '✅' : '❌'}`);
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser kept open for manual inspection. Press Ctrl+C to close.');
    await new Promise(() => {}); // Keep alive
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    await browser.close();
  }
}

debugHydration();