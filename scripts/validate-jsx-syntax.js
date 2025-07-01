#!/usr/bin/env node
/**
 * JSX Syntax Validation Script - Focused on critical JSX errors
 * 
 * This script validates JSX files to catch the specific type of error
 * that broke the build: orphaned JSX closing tags, unmatched brackets, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Only validate JSX/React files
const INCLUDE_PATTERNS = ['.js', '.jsx', '.ts', '.tsx'];
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
  'public',
  'data/episodes/backups'
];

/**
 * Get JSX/React files to validate
 */
function getJSXFiles() {
  const files = [];
  
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(PROJECT_ROOT, fullPath);
      
      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => relativePath.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (INCLUDE_PATTERNS.includes(ext)) {
          // Only include files that likely contain JSX
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('React') || content.includes('jsx') || 
              content.includes('<') || entry.name.endsWith('.jsx') || 
              entry.name.endsWith('.tsx')) {
            files.push(fullPath);
          }
        }
      }
    }
  }
  
  walkDir(PROJECT_ROOT);
  return files;
}

/**
 * Check for critical JSX syntax issues
 */
function validateJSXSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const errors = [];
  const warnings = [];
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check for orphaned closing JSX fragments
    if (trimmed === '</>') {
      const lineNumber = i + 1;
      
      // Look back to see if there's a matching opening tag
      let hasMatchingOpen = false;
      let openCount = 0;
      let closeCount = 0;
      
      // Count JSX fragments from start of function/return block to current line
      let startIdx = Math.max(0, i - 50); // Look back further but with limit
      for (let j = startIdx; j <= i; j++) {
        const checkLine = lines[j];
        openCount += (checkLine.match(/<>/g) || []).length;
        if (j < i) { // Don't count the current line's closing tag
          closeCount += (checkLine.match(/<\/>/g) || []).length;
        }
      }
      
      // If we have more opens than closes, this closing tag is likely valid
      if (openCount <= closeCount) {
        errors.push({
          type: 'orphaned_jsx_closing',
          line: lineNumber,
          message: 'Orphaned JSX closing tag </> - this will cause build errors',
          content: trimmed
        });
      }
    }
    
    // Check for unmatched JSX elements in return statements
    if (trimmed.includes('return (') || trimmed.includes('return(')) {
      let openCount = 0;
      let closeCount = 0;
      let currentLine = i;
      
      // Count JSX fragments until we find the closing parenthesis
      while (currentLine < lines.length) {
        const checkLine = lines[currentLine];
        
        // Count JSX fragments
        openCount += (checkLine.match(/<>/g) || []).length;
        closeCount += (checkLine.match(/<\/>/g) || []).length;
        
        // Stop at closing parenthesis of return statement
        if (checkLine.includes(');') && currentLine > i) {
          break;
        }
        
        currentLine++;
        if (currentLine - i > 50) break; // Safety limit
      }
      
      if (openCount !== closeCount && openCount > 0) {
        warnings.push({
          type: 'unmatched_jsx_fragments',
          line: i + 1,
          message: `Unmatched JSX fragments in return statement (${openCount} open, ${closeCount} close)`,
          content: trimmed
        });
      }
    }
    
    // Check for common JSX syntax errors (but skip code comments and string literals)
    if (trimmed.includes('</>') && !trimmed.includes('<>') && 
        !trimmed.includes('//') && !trimmed.includes('*') && 
        !trimmed.startsWith('message:') && !trimmed.includes("'</>'")) {
      // Check if this closing tag has content after it on the same line
      const afterClosing = trimmed.split('</>')[1];
      if (afterClosing && afterClosing.trim() && !afterClosing.trim().startsWith(')')) {
        errors.push({
          type: 'invalid_jsx_structure',
          line: i + 1,
          message: 'Invalid JSX structure: content after closing tag',
          content: trimmed
        });
      }
    }
  }
  
  return { relativePath, errors, warnings };
}

/**
 * Main validation function
 */
async function validateJSX() {
  console.log('🔍 Validating JSX syntax for critical build errors...\n');
  
  const files = getJSXFiles();
  const allErrors = [];
  const allWarnings = [];
  let validFiles = 0;
  
  console.log(`📁 Found ${files.length} JSX/React files to validate\n`);
  
  for (const filePath of files) {
    const result = validateJSXSyntax(filePath);
    
    if (result.errors.length === 0) {
      validFiles++;
    } else {
      allErrors.push(result);
    }
    
    if (result.warnings.length > 0) {
      allWarnings.push(result);
    }
  }
  
  // Report results
  console.log('📊 JSX Validation Results:');
  console.log(`✅ Files without critical errors: ${validFiles}`);
  console.log(`❌ Files with critical errors: ${allErrors.length}`);
  console.log(`⚠️  Files with warnings: ${allWarnings.length}\n`);
  
  // Show critical errors
  if (allErrors.length > 0) {
    console.log('❌ CRITICAL JSX ERRORS (will break build):');
    for (const fileResult of allErrors) {
      console.log(`\n📄 ${fileResult.relativePath}`);
      for (const error of fileResult.errors) {
        console.log(`   Line ${error.line}: ${error.message}`);
        console.log(`   Code: ${error.content}`);
      }
    }
    console.log('');
  }
  
  // Show warnings (only if verbose)
  if (process.argv.includes('--verbose') && allWarnings.length > 0) {
    console.log('⚠️  POTENTIAL ISSUES:');
    for (const fileResult of allWarnings) {
      console.log(`\n📄 ${fileResult.relativePath}`);
      for (const warning of fileResult.warnings) {
        console.log(`   Line ${warning.line}: ${warning.message}`);
      }
    }
    console.log('');
  }
  
  // Summary
  if (allErrors.length === 0) {
    console.log('🎉 No critical JSX syntax errors found!');
    if (allWarnings.length > 0 && !process.argv.includes('--verbose')) {
      console.log(`ℹ️  ${allWarnings.length} warnings found. Use --verbose to see details.`);
    }
    process.exit(0);
  } else {
    console.log('💥 Critical JSX syntax errors found! These will break the build.');
    console.log('🔧 Fix these errors before committing or building.');
    process.exit(1);
  }
}

// Run validation
validateJSX().catch(error => {
  console.error('💥 JSX validation script failed:', error);
  process.exit(1);
});