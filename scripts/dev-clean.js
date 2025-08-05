#!/usr/bin/env node
// Clean development startup script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Cleaning Next.js build cache...');

// Remove .next directory if it exists
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ Removed .next directory');
}

// Start development server
console.log('🚀 Starting development server...');
execSync('npm run dev', { stdio: 'inherit' });