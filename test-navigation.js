#!/usr/bin/env node

/**
 * Comprehensive Navigation Testing Suite
 * 
 * This script systematically tests ALL navigation links across the application
 * to ensure no 404 errors or broken routing exists.
 */

const fs = require('fs');
const path = require('path');
const themeMapping = require('./data/theme-episode-mapping.json');

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test Results
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function addError(test, expected, actual, file = '') {
  testResults.failed++;
  testResults.errors.push({
    test,
    expected,
    actual,
    file
  });
  logError(`${test}: Expected "${expected}", got "${actual}"${file ? ` in ${file}` : ''}`);
}

function addSuccess(test) {
  testResults.passed++;
  logSuccess(test);
}

// Helper function to check if a page file exists
function pageExists(route) {
  // Remove leading slash and check various possible locations
  const cleanRoute = route.replace(/^\//, '');
  
  // Check /pages/themes/ directory
  if (cleanRoute.startsWith('themes/')) {
    const themeName = cleanRoute.replace('themes/', '');
    const themePagePath = path.join(__dirname, 'pages', 'themes', `${themeName}.js`);
    return fs.existsSync(themePagePath);
  }
  
  // Check dynamic routes
  if (cleanRoute.includes('/') && !cleanRoute.startsWith('themes/')) {
    const parts = cleanRoute.split('/');
    if (parts.length === 2) {
      // Check if it's a [theme]/[episode] route
      const dynamicRoutePath = path.join(__dirname, 'pages', '[theme]', '[episode].js');
      return fs.existsSync(dynamicRoutePath);
    }
  }
  
  // Check direct page files
  const directPagePath = path.join(__dirname, 'pages', `${cleanRoute}.js`);
  return fs.existsSync(directPagePath);
}

// Helper function to read and parse a React component file
function readComponentFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    logError(`Failed to read ${filePath}: ${error.message}`);
    return '';
  }
}

// Extract route mappings from component files
function extractRouteMapping(content, variableName) {
  const regex = new RegExp(`const\\s+${variableName}\\s*=\\s*{([^}]+)}`, 's');
  const match = content.match(regex);
  
  if (!match) return {};
  
  const routes = {};
  const routeLines = match[1].split('\n');
  
  routeLines.forEach(line => {
    const routeMatch = line.match(/'([^']+)':\s*'([^']+)'/);
    if (routeMatch) {
      routes[routeMatch[1]] = routeMatch[2];
    }
  });
  
  return routes;
}

// Test 1: Homepage theme navigation
function testHomepageThemeNavigation() {
  logInfo('Testing homepage theme navigation...');
  
  const homepageContent = readComponentFile(path.join(__dirname, 'pages', 'index.js'));
  const themeRoutes = extractRouteMapping(homepageContent, 'themeRoutes');
  
  const expectedThemes = [
    'Film Noir',
    'Horror & Suspense',
    'Comedy',
    'Women Directors',
    'International Masters',
    'Acclaimed Directors',
    'Movements in Film',
    'The Magic of Moviemaking',
    'Cinema Through the Decades',
    'Hollywood Transformed'
  ];
  
  expectedThemes.forEach(theme => {
    if (!themeRoutes[theme]) {
      addError(`Homepage theme "${theme}" missing route mapping`, 'route exists', 'route missing', 'pages/index.js');
      return;
    }
    
    const route = themeRoutes[theme];
    if (!route.startsWith('/themes/')) {
      addError(`Homepage theme "${theme}" route`, 'starts with /themes/', route, 'pages/index.js');
      return;
    }
    
    if (!pageExists(route)) {
      addError(`Homepage theme "${theme}" page file`, 'page exists', 'page missing', route);
      return;
    }
    
    addSuccess(`Homepage theme "${theme}" → ${route}`);
  });
}

// Test 2: Theme page episode navigation
function testThemePageEpisodeNavigation() {
  logInfo('Testing theme page episode navigation...');
  
  const essentialMoviesContent = readComponentFile(path.join(__dirname, 'components', 'EssentialMovies.js'));
  
  // Check episode link pattern in EssentialMovies.js
  const episodeLinkPattern = /href={\`\/\$\{theme\}\/\$\{episode\.id\}\`\}/;
  if (!episodeLinkPattern.test(essentialMoviesContent)) {
    addError('EssentialMovies episode link pattern', 'href={`/${theme}/${episode.id}`}', 'pattern not found', 'components/EssentialMovies.js');
  } else {
    addSuccess('EssentialMovies episode link pattern correct');
  }
  
  // Test actual episode routes for each theme
  Object.keys(themeMapping.themes).forEach(themeId => {
    const theme = themeMapping.themes[themeId];
    
    theme.episodes.forEach(episode => {
      const episodeRoute = `/${themeId}/${episode.id}`;
      
      // Check if dynamic route handler exists
      const dynamicRoutePath = path.join(__dirname, 'pages', '[theme]', '[episode].js');
      if (!fs.existsSync(dynamicRoutePath)) {
        addError(`Episode route handler`, 'pages/[theme]/[episode].js exists', 'file missing');
        return;
      }
      
      addSuccess(`Episode route: ${episodeRoute}`);
    });
  });
}

// Test 3: Episode page theme navigation
function testEpisodePageThemeNavigation() {
  logInfo('Testing episode page theme navigation...');
  
  const episodeTemplateContent = readComponentFile(path.join(__dirname, 'components', 'GeniusEpisodeTemplate.js'));
  const themeRoutes = extractRouteMapping(episodeTemplateContent, 'themeRoutes');
  
  const expectedThemes = [
    'Film Noir',
    'Horror & Suspense',
    'Comedy',
    'Women Directors',
    'International Masters',
    'Acclaimed Directors',
    'Movements in Film',
    'The Magic of Moviemaking',
    'Cinema Through the Decades',
    'Hollywood Transformed'
  ];
  
  expectedThemes.forEach(theme => {
    if (!themeRoutes[theme]) {
      addError(`Episode page theme "${theme}" missing route mapping`, 'route exists', 'route missing', 'components/GeniusEpisodeTemplate.js');
      return;
    }
    
    const route = themeRoutes[theme];
    if (!route.startsWith('/themes/')) {
      addError(`Episode page theme "${theme}" route`, 'starts with /themes/', route, 'components/GeniusEpisodeTemplate.js');
      return;
    }
    
    if (!pageExists(route)) {
      addError(`Episode page theme "${theme}" page file`, 'page exists', 'page missing', route);
      return;
    }
    
    addSuccess(`Episode page theme "${theme}" → ${route}`);
  });
}

// Test 4: Theme footer navigation
function testThemeFooterNavigation() {
  logInfo('Testing theme footer navigation...');
  
  const themeFooterContent = readComponentFile(path.join(__dirname, 'components', 'ThemeFooter.js'));
  
  // Extract Link hrefs from ThemeFooter
  const linkRegex = /href="([^"]+)"/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(themeFooterContent)) !== null) {
    if (match[1].startsWith('/themes/')) {
      links.push(match[1]);
    }
  }
  
  if (links.length === 0) {
    addError('ThemeFooter links', 'found theme links', 'no theme links found', 'components/ThemeFooter.js');
    return;
  }
  
  links.forEach(link => {
    if (!pageExists(link)) {
      addError(`ThemeFooter link "${link}"`, 'page exists', 'page missing', 'components/ThemeFooter.js');
      return;
    }
    
    addSuccess(`ThemeFooter link: ${link}`);
  });
}

// Test 5: NavBar active state detection
function testNavBarActiveState() {
  logInfo('Testing NavBar active state detection...');
  
  const navBarContent = readComponentFile(path.join(__dirname, 'components', 'NavBar.js'));
  
  // Check for themes/ route detection
  const themesDetectionPattern = /pathname\.startsWith\('themes\/'\)/;
  if (!themesDetectionPattern.test(navBarContent)) {
    addError('NavBar themes detection', 'pathname.startsWith(\'themes/\')', 'pattern not found', 'components/NavBar.js');
  } else {
    addSuccess('NavBar themes route detection pattern correct');
  }
  
  // Check for theme extraction logic
  const themeExtractionPattern = /pathname\.split\('\/'\)\[1\]/;
  if (!themeExtractionPattern.test(navBarContent)) {
    addError('NavBar theme extraction', 'pathname.split(\'/\')[1]', 'pattern not found', 'components/NavBar.js');
  } else {
    addSuccess('NavBar theme extraction pattern correct');
  }
}

// Test 6: Verify all theme pages exist
function testThemePageExistence() {
  logInfo('Testing theme page file existence...');
  
  Object.keys(themeMapping.themes).forEach(themeId => {
    const themePagePath = path.join(__dirname, 'pages', 'themes', `${themeId}.js`);
    
    if (!fs.existsSync(themePagePath)) {
      addError(`Theme page file "${themeId}"`, 'file exists', 'file missing', `pages/themes/${themeId}.js`);
      return;
    }
    
    addSuccess(`Theme page file: pages/themes/${themeId}.js`);
  });
}

// Test 7: Verify genius.js theme navigation
function testGeniusPageThemeNavigation() {
  logInfo('Testing genius.js theme navigation...');
  
  const geniusContent = readComponentFile(path.join(__dirname, 'pages', 'genius.js'));
  const themeRoutes = extractRouteMapping(geniusContent, 'themeRoutes');
  
  Object.keys(themeRoutes).forEach(theme => {
    const route = themeRoutes[theme];
    
    if (!route.startsWith('/themes/')) {
      addError(`Genius page theme "${theme}" route`, 'starts with /themes/', route, 'pages/genius.js');
      return;
    }
    
    if (!pageExists(route)) {
      addError(`Genius page theme "${theme}" page file`, 'page exists', 'page missing', route);
      return;
    }
    
    addSuccess(`Genius page theme "${theme}" → ${route}`);
  });
}

// Run all tests
function runAllTests() {
  log('🚀 Starting Comprehensive Navigation Testing Suite', 'bold');
  log('================================================', 'blue');
  
  testHomepageThemeNavigation();
  testThemePageEpisodeNavigation();
  testEpisodePageThemeNavigation();
  testThemeFooterNavigation();
  testNavBarActiveState();
  testThemePageExistence();
  testGeniusPageThemeNavigation();
  
  // Print summary
  log('\n📊 Test Results Summary', 'bold');
  log('======================', 'blue');
  logSuccess(`Passed: ${testResults.passed}`);
  logError(`Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    log('\n🔍 Detailed Error Report', 'bold');
    log('========================', 'red');
    
    testResults.errors.forEach((error, index) => {
      log(`\n${index + 1}. ${error.test}`, 'red');
      log(`   Expected: ${error.expected}`, 'yellow');
      log(`   Actual: ${error.actual}`, 'yellow');
      if (error.file) {
        log(`   File: ${error.file}`, 'blue');
      }
    });
    
    log('\n💡 Recommendations:', 'bold');
    log('=================', 'yellow');
    log('1. Fix all route mappings to use /themes/ prefix');
    log('2. Ensure all theme page files exist in pages/themes/');
    log('3. Verify episode navigation uses correct dynamic routing');
    log('4. Test navigation manually after fixes');
    
    process.exit(1);
  } else {
    log('\n🎉 All navigation tests passed!', 'green');
    log('Navigation should be working correctly across the application.', 'green');
    process.exit(0);
  }
}

// Run the tests
runAllTests();