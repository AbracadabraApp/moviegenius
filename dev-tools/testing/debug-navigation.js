#!/usr/bin/env node

/**
 * Debug Navigation Issues
 *
 * This script simulates the navigation flow to identify the exact issues
 */

const fs = require('fs');
const path = require('path');

// Simulate router state for /themes/cinema-cultural-impact
const mockRouterState = {
  pathname: '/themes/cinema-cultural-impact',
  asPath: '/themes/cinema-cultural-impact',
  query: {},
};

// Test NavBar active state detection
function testNavBarActiveState() {
  console.log('🔍 Testing NavBar active state detection...');

  const themeKeys = [
    'film-noir',
    'horror-suspense',
    'comedy-through-time',
    'women-directors',
    'world-cinema',
    'acclaimed-directors',
    'avant-garde-film',
    'magic-of-moviemaking',
    'cinema-through-decades',
    'cinema-cultural-impact',
  ];

  // Simulate the NavBar logic
  const router = mockRouterState;
  const pathname = router.pathname.slice(1); // Remove leading slash

  console.log(`Router pathname: ${router.pathname}`);
  console.log(`Cleaned pathname: ${pathname}`);

  // Check if it's a theme page
  if (pathname.startsWith('themes/')) {
    const themePart = pathname.split('/')[1]; // Get theme after "themes/"
    console.log(`Theme part: ${themePart}`);
    console.log(`Theme keys includes: ${themeKeys.includes(themePart)}`);

    if (themeKeys.includes(themePart)) {
      console.log('✅ NavBar should show Genius as active');
      return true;
    }
  }

  console.log('❌ NavBar will NOT show Genius as active');
  return false;
}

// Test theme page file existence
function testThemePageFiles() {
  console.log('\n🔍 Testing theme page files...');

  const themePaths = [
    'pages/themes/cinema-cultural-impact.js',
    'pages/themes/film-noir.js',
    'pages/themes/horror-suspense.js',
    'pages/themes/comedy-through-time.js',
    'pages/themes/women-directors.js',
    'pages/themes/world-cinema.js',
    'pages/themes/acclaimed-directors.js',
    'pages/themes/avant-garde-film.js',
    'pages/themes/magic-of-moviemaking.js',
    'pages/themes/cinema-through-decades.js',
  ];

  themePaths.forEach(themePath => {
    const fullPath = path.join(__dirname, themePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${themePath} exists`);
    } else {
      console.log(`❌ ${themePath} MISSING`);
    }
  });
}

// Test ThemeFooter link structure
function testThemeFooterLinks() {
  console.log('\n🔍 Testing ThemeFooter links...');

  const themeFooterPath = path.join(__dirname, 'components/ThemeFooter.js');
  if (!fs.existsSync(themeFooterPath)) {
    console.log('❌ ThemeFooter.js not found');
    return;
  }

  const content = fs.readFileSync(themeFooterPath, 'utf8');

  // Check for Link imports
  if (content.includes("import Link from 'next/link'")) {
    console.log('✅ ThemeFooter imports Next.js Link');
  } else {
    console.log('❌ ThemeFooter missing Next.js Link import');
  }

  // Check for theme links
  const themeLinks = [
    '/themes/film-noir',
    '/themes/horror-suspense',
    '/themes/comedy-through-time',
    '/themes/women-directors',
    '/themes/world-cinema',
    '/themes/acclaimed-directors',
    '/themes/avant-garde-film',
    '/themes/magic-of-moviemaking',
    '/themes/cinema-through-decades',
    '/themes/cinema-cultural-impact',
  ];

  themeLinks.forEach(link => {
    if (content.includes(link)) {
      console.log(`✅ ThemeFooter contains ${link}`);
    } else {
      console.log(`❌ ThemeFooter missing ${link}`);
    }
  });
}

// Test EssentialMovies episode links
function testEssentialMoviesLinks() {
  console.log('\n🔍 Testing EssentialMovies episode links...');

  const essentialMoviesPath = path.join(__dirname, 'components/EssentialMovies.js');
  if (!fs.existsSync(essentialMoviesPath)) {
    console.log('❌ EssentialMovies.js not found');
    return;
  }

  const content = fs.readFileSync(essentialMoviesPath, 'utf8');

  // Check for episode link pattern
  if (content.includes('href={`/${theme}/${episode.id}`}')) {
    console.log('✅ EssentialMovies has correct episode link pattern');
  } else {
    console.log('❌ EssentialMovies missing correct episode link pattern');
  }

  // Check for dynamic route file
  const dynamicRoutePath = path.join(__dirname, 'pages/[theme]/[episode].js');
  if (fs.existsSync(dynamicRoutePath)) {
    console.log('✅ Dynamic episode route file exists');
  } else {
    console.log('❌ Dynamic episode route file missing');
  }
}

// Test theme data structure
function testThemeDataStructure() {
  console.log('\n🔍 Testing theme data structure...');

  const themeDataPath = path.join(__dirname, 'data/theme-episode-mapping.json');
  if (!fs.existsSync(themeDataPath)) {
    console.log('❌ theme-episode-mapping.json not found');
    return;
  }

  const themeData = JSON.parse(fs.readFileSync(themeDataPath, 'utf8'));

  if (themeData.themes && themeData.themes['cinema-cultural-impact']) {
    console.log('✅ cinema-cultural-impact theme data exists');
    const theme = themeData.themes['cinema-cultural-impact'];
    console.log(`   Title: ${theme.title}`);
    console.log(`   Episodes: ${theme.episodes ? theme.episodes.length : 0}`);
  } else {
    console.log('❌ cinema-cultural-impact theme data missing');
  }
}

// Run all tests
console.log('🚀 Starting Navigation Debug Tests');
console.log('=====================================');

testNavBarActiveState();
testThemePageFiles();
testThemeFooterLinks();
testEssentialMoviesLinks();
testThemeDataStructure();

console.log('\n📊 Debug Complete');
console.log('================');
console.log('If all tests pass but navigation still fails, the issue is likely:');
console.log('1. JavaScript runtime errors preventing clicks');
console.log('2. CSS styling blocking click events');
console.log('3. Event handlers interfering with navigation');
console.log('4. Next.js routing configuration issues');
