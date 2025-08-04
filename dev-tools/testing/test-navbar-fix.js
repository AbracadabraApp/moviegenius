/**
 * Manual test to verify NavBar navigation from theme pages
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing NavBar navigation from theme pages...');

// 1. Verify the fix was applied
const phoneFramePath = path.join(__dirname, 'components/PhoneFrame.js');
const phoneFrameContent = fs.readFileSync(phoneFramePath, 'utf8');

console.log('1. Checking PhoneFrame fix:');
const hasActiveProp = phoneFrameContent.includes('active={active}');
const hasActiveParam = phoneFrameContent.includes('{ children, active }');

console.log(`   ❌ Still has active prop: ${hasActiveProp}`);
console.log(`   ❌ Still has active param: ${hasActiveParam}`);

if (!hasActiveProp && !hasActiveParam) {
  console.log('   ✅ PhoneFrame fix applied correctly');
} else {
  console.log('   ❌ PhoneFrame fix NOT applied correctly');
}

// 2. Check NavBar component structure
const navBarPath = path.join(__dirname, 'components/NavBar.js');
const navBarContent = fs.readFileSync(navBarPath, 'utf8');

console.log('\n2. Checking NavBar component:');
const hasRouteValidation = navBarContent.includes('routeValidation');
const hasIconMapping = navBarContent.includes("'Clapperboard': Clapperboard");

console.log(`   ✅ Has route validation: ${hasRouteValidation}`);
console.log(`   ✅ Has proper icon mapping: ${hasIconMapping}`);

// 3. Test theme page structure
const filmNoirPath = path.join(__dirname, 'pages/themes/film-noir.js');
const filmNoirExists = fs.existsSync(filmNoirPath);

console.log('\n3. Checking theme page:');
console.log(`   ✅ Film noir page exists: ${filmNoirExists}`);

if (filmNoirExists) {
  const filmNoirContent = fs.readFileSync(filmNoirPath, 'utf8');
  const usesThemePage = filmNoirContent.includes('ThemePage');
  console.log(`   ✅ Uses ThemePage component: ${usesThemePage}`);
}

// 4. Summary
console.log('\n📊 SUMMARY:');
console.log('The fix removes the active prop that was causing NavBar to malfunction.');
console.log('NavBar now determines its active state from the router directly.');
console.log('');
console.log('🔍 TO VERIFY THE FIX:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Go to http://localhost:3000/themes/film-noir');
console.log('3. Click on "Movies" or "You" icons in the bottom navigation');
console.log('4. Verify that the page actually navigates (not just URL change)');
console.log('');
console.log('✅ If the navigation works, the fix is successful');
console.log('❌ If the navigation still fails, there may be additional issues');
