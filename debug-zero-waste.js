// Test zero-waste protection import
console.log('🔍 Testing zero-waste protection import...');

try {
  import('./lib/zero-waste-protection.js')
    .then((module) => {
      console.log('✅ Zero-waste protection imported successfully');
      console.log('Exported functions:', Object.keys(module));
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Zero-waste protection import failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
} catch (syncError) {
  console.error('❌ Synchronous error:', syncError.message);
  process.exit(1);
}