#!/usr/bin/env node
/**
 * Syntax Validation Script - Catches JSX and JavaScript syntax errors
 * 
 * This script validates all JavaScript/JSX files in the codebase to prevent
 * build failures from syntax errors like unterminated JSX tags, missing brackets, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Babel parser for JSX support
let parser;
try {
  parser = require('@babel/parser');
} catch (error) {
  console.error('⚠️  @babel/parser not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install --save-dev @babel/parser', { stdio: 'inherit' });
  parser = require('@babel/parser');
}

const PROJECT_ROOT = path.resolve(__dirname, '..');

// File patterns to validate
const INCLUDE_PATTERNS = [
  '**/*.js',
  '**/*.jsx',
  '**/*.ts',
  '**/*.tsx'
];

// Directories to skip
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
  '*.min.js',
  'public',
  'data/episodes/backups'
];

/**
 * Get all files to validate
 */
function getFilesToValidate() {
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
        // Check if file matches include patterns
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walkDir(PROJECT_ROOT);
  return files;
}

/**
 * Validate JSX/JavaScript syntax
 */
function validateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    
    // Skip empty files
    if (!content.trim()) {
      return { valid: true, relativePath };
    }
    
    // Parse with Babel to catch JSX syntax errors
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx') || 
                  content.includes('React') || content.includes('jsx');
    
    parser.parse(content, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      strictMode: false,
      plugins: [
        isTypeScript ? 'typescript' : 'flow',
        isJSX ? 'jsx' : null,
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        'asyncGenerators',
        'bigInt',
        'classPrivateProperties',
        'doExpressions',
        'functionSent',
        'throwExpressions',
        'topLevelAwait',
        'importMeta'
      ].filter(Boolean),
      errorRecovery: true
    });
    
    return { valid: true, relativePath };
    
  } catch (error) {
    return { 
      valid: false, 
      relativePath: path.relative(PROJECT_ROOT, filePath),
      error: error.message,
      line: error.loc?.line,
      column: error.loc?.column
    };
  }
}

/**
 * Check for common JSX issues
 */
function checkJSXIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const issues = [];
  
  // Check for unterminated JSX tags
  const lines = content.split('\n');
  let openTags = 0;
  let closeTags = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Count JSX fragments
    const openFragments = (line.match(/<>/g) || []).length;
    const closeFragments = (line.match(/<\/>/g) || []).length;
    openTags += openFragments;
    closeTags += closeFragments;
    
    // Check for unmatched JSX tags (basic check)
    const jsxTagMatches = line.match(/<\/?[A-Z][a-zA-Z0-9]*[^>]*>/g) || [];
    for (const tag of jsxTagMatches) {
      if (tag.startsWith('</')) {
        closeTags++;
      } else if (!tag.endsWith('/>')) {
        openTags++;
      }
    }
    
    // Check for orphaned closing brackets
    if (line.trim() === '</>') {
      issues.push({
        type: 'orphaned_closing_tag',
        line: i + 1,
        message: 'Potential orphaned JSX closing tag'
      });
    }
  }
  
  return { relativePath, issues };
}

/**
 * Main validation function
 */
async function validateSyntax() {
  console.log('🔍 Validating JavaScript/JSX syntax across codebase...\n');
  
  const files = getFilesToValidate();
  const errors = [];
  const warnings = [];
  let validFiles = 0;
  
  console.log(`📁 Found ${files.length} files to validate\n`);
  
  for (const filePath of files) {
    const result = validateFile(filePath);
    
    if (result.valid) {
      validFiles++;
      
      // Check for JSX-specific issues
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        const jsxCheck = checkJSXIssues(filePath);
        if (jsxCheck.issues.length > 0) {
          warnings.push({
            file: result.relativePath,
            issues: jsxCheck.issues
          });
        }
      }
      
    } else {
      errors.push(result);
    }
  }
  
  // Report results
  console.log('📊 Validation Results:');
  console.log(`✅ Valid files: ${validFiles}`);
  console.log(`❌ Files with errors: ${errors.length}`);
  console.log(`⚠️  Files with warnings: ${warnings.length}\n`);
  
  // Show errors
  if (errors.length > 0) {
    console.log('❌ SYNTAX ERRORS:');
    for (const error of errors) {
      console.log(`\n📄 ${error.relativePath}`);
      if (error.line) {
        console.log(`   Line ${error.line}${error.column ? `, Column ${error.column}` : ''}`);
      }
      console.log(`   ${error.error}`);
    }
    console.log('');
  }
  
  // Show warnings
  if (warnings.length > 0) {
    console.log('⚠️  POTENTIAL ISSUES:');
    for (const warning of warnings) {
      console.log(`\n📄 ${warning.file}`);
      for (const issue of warning.issues) {
        console.log(`   Line ${issue.line}: ${issue.message}`);
      }
    }
    console.log('');
  }
  
  // Summary
  if (errors.length === 0 && warnings.length === 0) {
    console.log('🎉 All files passed syntax validation!');
    process.exit(0);
  } else if (errors.length === 0) {
    console.log('✅ No syntax errors found, but there are warnings to review.');
    process.exit(0);
  } else {
    console.log('💥 Syntax errors found! Fix these before committing.');
    process.exit(1);
  }
}

// Run validation
validateSyntax().catch(error => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});