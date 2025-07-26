#!/usr/bin/env node

/**
 * Deploy Nuclear Static Files Script
 * 
 * Copies nuclear static files from the source directory to the public 
 * directory where Next.js can serve them directly at the expected path.
 */

import fs from 'fs/promises';
import path from 'path';

async function deployNuclearStaticFiles() {
  console.log('🚀 Deploying nuclear static files to public directory...');
  
  try {
    const sourceDir = path.join(process.cwd(), 'nuclear-static');
    const targetDir = path.join(process.cwd(), 'public', '_next', 'static', 'chunks', 'nuclear-static');
    
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });
    console.log(`✅ Created target directory: ${targetDir}`);
    
    // Read source directory
    const files = await fs.readdir(sourceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`📁 Found ${jsonFiles.length} nuclear static files to deploy:`);
    
    // Copy each file
    for (const file of jsonFiles) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      await fs.copyFile(sourcePath, targetPath);
      console.log(`   ✅ Deployed: ${file}`);
    }
    
    console.log(`\n🎉 Successfully deployed ${jsonFiles.length} nuclear static files!`);
    console.log(`📍 Files are now accessible at: /_next/static/chunks/nuclear-static/[id].json`);
    
    return {
      success: true,
      filesDeployed: jsonFiles.length,
      targetPath: '/_next/static/chunks/nuclear-static/'
    };
    
  } catch (error) {
    console.error('❌ Error deploying nuclear static files:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployNuclearStaticFiles()
    .then(result => {
      if (result.success) {
        console.log('\n✨ Deployment complete!');
        process.exit(0);
      } else {
        console.log('\n💥 Deployment failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Deployment script failed:', error);
      process.exit(1);
    });
}

export default deployNuclearStaticFiles;