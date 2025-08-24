// Quick debug script to check component data flow
console.log(`
🔍 DEBUGGING COMPONENT DATA FLOW
===============================

Open browser console on http://localhost:3001/movie/153 and look for:

1. "✅ Detected JSON format analysis" - Shows raw content parsing worked
2. "🔗 Parsed processed content after unescape" - Shows processed content parsing worked  
3. "✅ Processed JSON data available for HTML link rendering" - Shows renderJsonAnalysis received processedJsonData
4. "🔗 Using processed HTML content for section X" - Shows individual sections using HTML

If you see steps 1-3 but NOT step 4, the issue is that processedJsonData.content doesn't match textSections structure.

If you don't see step 3, the processed content isn't being passed to renderJsonAnalysis function.

Check browser console now and report back what steps you see.
`);