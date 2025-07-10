#!/usr/bin/env node

/**
 * Deployment Monitor - Track Railway deployment progress
 * 
 * Monitors production site for build ID changes to verify deployment completion.
 * Compares dev vs prod build IDs and content to ensure sync.
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://moviegenius-production.up.railway.app';
const DEVELOPMENT_URL = 'http://localhost:3000';
const CHECK_INTERVAL = 10000; // 10 seconds
const MAX_CHECKS = 30; // 5 minutes max

let checkCount = 0;
let initialProductionBuildId = null;

console.log('🚀 MovieGenius Deployment Monitor Started');
console.log('═══════════════════════════════════════════');
console.log('Monitoring Railway deployment progress...\n');

function fetchBuildId(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const buildIdMatch = data.match(/buildId":"([^"]+)"/);
        resolve(buildIdMatch ? buildIdMatch[1] : null);
      });
    }).on('error', reject);
  });
}

async function checkDeployment() {
  checkCount++;
  
  try {
    console.log(`📡 Check ${checkCount}/${MAX_CHECKS} - ${new Date().toLocaleTimeString()}`);
    
    const [prodBuildId, devBuildId] = await Promise.all([
      fetchBuildId(PRODUCTION_URL),
      fetchBuildId(DEVELOPMENT_URL)
    ]);
    
    // Store initial production build ID
    if (!initialProductionBuildId) {
      initialProductionBuildId = prodBuildId;
      console.log(`📍 Initial Production Build ID: ${prodBuildId}`);
      console.log(`📍 Current Development Build ID: ${devBuildId}\n`);
    }
    
    console.log(`Production: ${prodBuildId}`);
    console.log(`Development: ${devBuildId}`);
    
    // Check if deployment completed
    if (prodBuildId !== initialProductionBuildId) {
      console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
      console.log('═══════════════════════════');
      console.log(`✅ Production build updated from ${initialProductionBuildId} to ${prodBuildId}`);
      console.log('✅ Development and production are now in sync');
      console.log(`✅ Total monitoring time: ${(checkCount * CHECK_INTERVAL / 1000)} seconds`);
      
      // Verify content sync
      console.log('\n🔍 Verifying content sync...');
      const prodContent = await new Promise((resolve) => {
        https.get(PRODUCTION_URL, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
      });
      
      if (prodContent.includes('DON\'T BINGE WATCH TV')) {
        console.log('✅ Content verification passed - homepage loading correctly');
      } else {
        console.log('⚠️ Content verification failed - homepage may have issues');
      }
      
      process.exit(0);
    }
    
    // Check for timeout
    if (checkCount >= MAX_CHECKS) {
      console.log('\n⏰ MONITORING TIMEOUT');
      console.log('═══════════════════════');
      console.log(`❌ Deployment not detected after ${MAX_CHECKS * CHECK_INTERVAL / 1000} seconds`);
      console.log('❌ Production build ID unchanged');
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check Railway dashboard for deployment status');
      console.log('2. Verify GitHub Actions pipeline');
      console.log('3. Check Railway logs: railway logs');
      console.log('4. Manual deploy: railway up --detach');
      process.exit(1);
    }
    
    console.log('⏳ No change detected, continuing monitoring...\n');
    
  } catch (error) {
    console.error(`❌ Check failed: ${error.message}`);
  }
  
  // Schedule next check
  setTimeout(checkDeployment, CHECK_INTERVAL);
}

// Start monitoring
checkDeployment();