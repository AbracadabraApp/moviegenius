const fs = require('fs');
const path = require('path');

// Test all theme pages exist
const themePages = [
  'film-noir',
  'horror-suspense', 
  'comedy-through-time',
  'women-directors',
  'world-cinema',
  'acclaimed-directors',
  'avant-garde-film',
  'magic-of-moviemaking',
  'cinema-through-decades',
  'cinema-cultural-impact'
];

console.log('🔍 Checking theme page files...');
themePages.forEach(theme => {
  const filePath = path.join(__dirname, 'pages', 'themes', `${theme}.js`);
  if (fs.existsSync(filePath)) {
    console.log(`✅ /themes/${theme} → pages/themes/${theme}.js`);
  } else {
    console.log(`❌ /themes/${theme} → pages/themes/${theme}.js (MISSING)`);
  }
});

// Check dynamic episode route
const episodeRoutePath = path.join(__dirname, 'pages', '[theme]', '[episode].js');
if (fs.existsSync(episodeRoutePath)) {
  console.log('✅ Episode dynamic route → pages/[theme]/[episode].js');
} else {
  console.log('❌ Episode dynamic route → pages/[theme]/[episode].js (MISSING)');
}

// Check key component files
const components = [
  'components/NavBar.js',
  'components/ThemeFooter.js',
  'components/EssentialMovies.js',
  'components/GeniusEpisodeTemplate.js'
];

console.log('\n🔍 Checking component files...');
components.forEach(comp => {
  const filePath = path.join(__dirname, comp);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${comp}`);
  } else {
    console.log(`❌ ${comp} (MISSING)`);
  }
});

console.log('\n🔍 Checking for old route patterns...');
const filesToCheck = [
  'pages/index.js',
  'pages/genius.js',
  'components/GeniusEpisodeTemplate.js',
  'components/ThemeFooter.js'
];

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for old route patterns
    const oldRoutes = [
      '/film-noir',
      '/horror-suspense',
      '/comedy-through-time',
      '/women-directors',
      '/world-cinema',
      '/acclaimed-directors',
      '/avant-garde-film',
      '/magic-of-moviemaking',
      '/cinema-through-decades',
      '/cinema-cultural-impact'
    ];
    
    oldRoutes.forEach(route => {
      // Only flag if it's NOT prefixed with /themes/
      const pattern = new RegExp(`['"]${route}['"]`, 'g');
      const themesPattern = new RegExp(`['"]\/themes${route}['"]`, 'g');
      
      if (pattern.test(content) && !themesPattern.test(content)) {
        console.log(`⚠️  ${file} contains old route: ${route}`);
      }
    });
  }
});

console.log('\n✅ Navigation verification complete!');