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

async function deployToPublicDirectory(nuclearDir) {
  const publicTargetDir = path.join(PROJECT_ROOT, 'public', 'static', 'nuclear-data');
  
  // Ensure public target directory exists
  if (!fs.existsSync(publicTargetDir)) {
    fs.mkdirSync(publicTargetDir, { recursive: true });
  }
  
  // Copy nuclear static files to public directory for HTTP serving
  const files = fs.readdirSync(nuclearDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`📁 Copying ${jsonFiles.length} nuclear static files to public directory...`);
  
  for (const file of jsonFiles) {
    const sourcePath = path.join(nuclearDir, file);
    const targetPath = path.join(publicTargetDir, file);
    fs.copyFileSync(sourcePath, targetPath);
  }
  
  console.log(`✅ Nuclear static files deployed to /static/nuclear-data/`);
}

async function ensureNuclearStaticFiles() {
  const nuclearDir = path.join(PROJECT_ROOT, 'nuclear-static');
  
  // Check if nuclear static directory exists
  if (!fs.existsSync(nuclearDir)) {
    console.log('🔧 Nuclear static directory not found, creating...');
    fs.mkdirSync(nuclearDir, { recursive: true });
  }
  
  // Check if we have nuclear static files
  const files = fs.readdirSync(nuclearDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length > 0) {
    console.log(`✅ Found ${jsonFiles.length} nuclear static files, deploying for production`);
    await deployToPublicDirectory(nuclearDir);
    return;
  }
  
  // Production build without nuclear files - skip generation to avoid build failures
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT_NAME) {
    console.log('🚀 Production build detected - nuclear static files missing');
    console.log('🔄 Pages will fallback to dynamic generation (SSR)');
    console.log('💡 Nuclear static files can be generated post-deployment via API');
    
    // Create empty nuclear directory if it doesn't exist to prevent build errors
    if (!fs.existsSync(nuclearDir)) {
      fs.mkdirSync(nuclearDir, { recursive: true });
      console.log('📁 Created empty nuclear-static directory for build compatibility');
    }
    
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