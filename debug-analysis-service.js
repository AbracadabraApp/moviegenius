// Test if AnalysisService can be imported without crashing
console.log('🔍 Testing AnalysisService import...');

try {
  console.log('📦 Starting import...');
  
  // Test the problematic import
  import('./lib/services/analysis-service.js')
    .then(() => {
      console.log('✅ AnalysisService imported successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ AnalysisService import failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
    
} catch (syncError) {
  console.error('❌ Synchronous error:', syncError.message);
  console.error('Stack:', syncError.stack);
  process.exit(1);
}