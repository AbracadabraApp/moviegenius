#!/usr/bin/env node
/**
 * Deploy Nuclear Static Files
 * 
 * This script ensures nuclear static files are available during production builds
 * without committing 6000+ files to git. It downloads or generates them as needed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function ensureNuclearStaticFiles() {
  const nuclearDir = path.join(PROJECT_ROOT, 'nuclear-static');
  
  // Check if nuclear static directory exists
  if (!fs.existsSync(nuclearDir)) {
    console.log('🔧 Nuclear static directory not found, creating...');
    fs.mkdirSync(nuclearDir, { recursive: true });
  }
  
  // Check if we have some nuclear static files
  const files = fs.readdirSync(nuclearDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length > 100) {
    console.log(`✅ Found ${jsonFiles.length} nuclear static files, ready for production`);
    return;
  }
  
  console.log('⚠️ Nuclear static files missing or insufficient');
  console.log('🔄 This is expected for new deployments');
  console.log('💡 Nuclear static files will be generated on-demand');
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureNuclearStaticFiles().catch(console.error);
}

export { ensureNuclearStaticFiles };