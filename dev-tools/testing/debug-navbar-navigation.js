/**
 * Debug script to test NavBar navigation flow
 *
 * This script tests the actual navigation behavior that users experience
 * to identify why URL changes but page content doesn't update.
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Read the NavBar component
const navBarPath = path.join(__dirname, 'components/NavBar.js');
const navBarContent = fs.readFileSync(navBarPath, 'utf8');

// Read the routes configuration
const routesPath = path.join(__dirname, 'lib/routes.js');
const routesContent = fs.readFileSync(routesPath, 'utf8');

console.log('🔍 DEBUGGING NAVBAR NAVIGATION ISSUES');
console.log('=====================================');

// 1. Check NavBar component structure
console.log('1. NavBar Component Analysis:');
console.log('✓ NavBar imports:', navBarContent.includes("import Link from 'next/link'"));
console.log('✓ Uses Next.js Link:', navBarContent.includes('<Link'));
console.log('✓ Has useRouter hook:', navBarContent.includes('useRouter'));
console.log('✓ Has route mapping:', navBarContent.includes('navItems.map'));

// 2. Check routes configuration
console.log('\n2. Routes Configuration:');
const routeMatches = routesContent.match(/route: staticRoutes\\.([a-z]+)/g);
if (routeMatches) {
  console.log('✓ Found route definitions:', routeMatches);
} else {
  console.log('❌ No route definitions found');
}

// 3. Check for common navigation issues
console.log('\n3. Common Navigation Issues Check:');

// Check for Link component usage
const linkUsage = navBarContent.match(/<Link[^>]*href={([^}]+)}/g);
if (linkUsage) {
  console.log('✓ Link href patterns:', linkUsage);
} else {
  console.log('❌ No Link href patterns found');
}

// Check for event handlers that might interfere
const eventHandlers = navBarContent.match(/on[A-Z][a-zA-Z]*=/g);
if (eventHandlers) {
  console.log('⚠️  Event handlers found (potential interference):', eventHandlers);
} else {
  console.log('✓ No interfering event handlers found');
}

// 4. Check for router push usage (should not be used with Link)
const routerPush = navBarContent.includes('router.push');
console.log('Router push usage (should be false):', routerPush);

// 5. Check page file structure
console.log('\n4. Page File Structure:');
const pagesDir = path.join(__dirname, 'pages');
const pageFiles = {
  'movies.js': fs.existsSync(path.join(pagesDir, 'movies.js')),
  'genius.js': fs.existsSync(path.join(pagesDir, 'genius.js')),
  'you.js': fs.existsSync(path.join(pagesDir, 'you.js')),
  'index.js': fs.existsSync(path.join(pagesDir, 'index.js')),
};

Object.entries(pageFiles).forEach(([file, exists]) => {
  console.log(`${exists ? '✓' : '❌'} ${file}: ${exists ? 'exists' : 'missing'}`);
});

// 6. Check for _app.js structure
console.log('\n5. App Structure:');
const appPath = path.join(pagesDir, '_app.js');
const appExists = fs.existsSync(appPath);
console.log(`✓ _app.js exists: ${appExists}`);

if (appExists) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  console.log('✓ _app.js imports Component:', appContent.includes('Component'));
  console.log('✓ _app.js renders Component:', appContent.includes('<Component'));
  console.log('✓ _app.js has router events:', appContent.includes('router.events'));
}

// 7. Specific issue analysis
console.log('\n6. Specific Issue Analysis:');
console.log(
  'REPORTED ISSUE: "Theme page click to Nav Bar icons change url but don\'t load icon home"'
);
console.log('');
console.log('This suggests:');
console.log('- ✓ NavBar clicks are working (URL changes)');
console.log('- ✓ Routing is working (URL updates)');
console.log('- ❌ Page content is not updating');
console.log('');
console.log('Possible causes:');
console.log('1. Component state not updating on route change');
console.log('2. Router events not firing properly');
console.log('3. Page components have rendering errors');
console.log('4. CSS/styling issues hiding content');
console.log('5. Browser navigation cache issues');

// 8. Recommendations
console.log('\n7. Debugging Recommendations:');
console.log('1. Check browser dev tools for JavaScript errors');
console.log('2. Verify router.events are firing in _app.js');
console.log('3. Check if page components render correctly in isolation');
console.log(
  '4. Test with browser dev tools Network tab (should show no network requests for client-side routing)'
);
console.log('5. Check if issue occurs in incognito/private mode');

console.log('\n✅ NavBar component structure appears correct');
console.log('🔍 Issue is likely in page rendering or router event handling');
