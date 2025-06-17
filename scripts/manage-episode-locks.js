#!/usr/bin/env node

/**
 * Episode Lock Management Utility
 * 
 * Usage:
 *   node scripts/manage-episode-locks.js lock 1-1-1,1-1-2,1-1-3
 *   node scripts/manage-episode-locks.js unlock 1-1-3
 *   node scripts/manage-episode-locks.js lock-series 1-1
 *   node scripts/manage-episode-locks.js unlock-series 1-1
 *   node scripts/manage-episode-locks.js status 1-1-1
 *   node scripts/manage-episode-locks.js list-locked
 */

const fs = require('fs');
const path = require('path');

const EPISODES_DIR = path.join(process.cwd(), 'data', 'episodes');

function getEpisodePath(episodeId) {
  return path.join(EPISODES_DIR, `genius-${episodeId}.json`);
}

function lockEpisode(episodeId, lockedBy = 'script') {
  const episodePath = getEpisodePath(episodeId);
  
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ Episode ${episodeId} not found at ${episodePath}`);
    return false;
  }
  
  try {
    const episodeData = JSON.parse(fs.readFileSync(episodePath, 'utf8'));
    
    if (episodeData.locked) {
      console.log(`⚠️  Episode ${episodeId} is already locked (locked at: ${episodeData.lockedAt})`);
      return true;
    }
    
    episodeData.locked = true;
    episodeData.lockedAt = new Date().toISOString();
    episodeData.lockedBy = lockedBy;
    
    fs.writeFileSync(episodePath, JSON.stringify(episodeData, null, 2));
    console.log(`🔒 Locked episode ${episodeId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error locking episode ${episodeId}:`, error.message);
    return false;
  }
}

function unlockEpisode(episodeId) {
  const episodePath = getEpisodePath(episodeId);
  
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ Episode ${episodeId} not found at ${episodePath}`);
    return false;
  }
  
  try {
    const episodeData = JSON.parse(fs.readFileSync(episodePath, 'utf8'));
    
    if (!episodeData.locked) {
      console.log(`⚠️  Episode ${episodeId} is not locked`);
      return true;
    }
    
    delete episodeData.locked;
    delete episodeData.lockedAt;
    delete episodeData.lockedBy;
    
    fs.writeFileSync(episodePath, JSON.stringify(episodeData, null, 2));
    console.log(`🔓 Unlocked episode ${episodeId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error unlocking episode ${episodeId}:`, error.message);
    return false;
  }
}

function getEpisodeStatus(episodeId) {
  const episodePath = getEpisodePath(episodeId);
  
  if (!fs.existsSync(episodePath)) {
    return { exists: false };
  }
  
  try {
    const episodeData = JSON.parse(fs.readFileSync(episodePath, 'utf8'));
    return {
      exists: true,
      locked: episodeData.locked || false,
      lockedAt: episodeData.lockedAt,
      lockedBy: episodeData.lockedBy,
      title: episodeData.episode?.title,
      subtitle: episodeData.episode?.subtitle
    };
  } catch (error) {
    return { exists: true, error: error.message };
  }
}

function listAllLocked() {
  const files = fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith('genius-') && f.endsWith('.json'));
  const locked = [];
  
  files.forEach(file => {
    const episodeId = file.replace('genius-', '').replace('.json', '');
    const status = getEpisodeStatus(episodeId);
    
    if (status.locked) {
      locked.push({
        episodeId,
        title: status.title,
        subtitle: status.subtitle,
        lockedAt: status.lockedAt,
        lockedBy: status.lockedBy
      });
    }
  });
  
  return locked;
}

function lockSeries(seriesPattern) {
  const files = fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith(`genius-${seriesPattern}`) && f.endsWith('.json'));
  let success = 0;
  let total = 0;
  
  files.forEach(file => {
    const episodeId = file.replace('genius-', '').replace('.json', '');
    total++;
    if (lockEpisode(episodeId, 'series-script')) {
      success++;
    }
  });
  
  console.log(`🔒 Locked ${success}/${total} episodes in series ${seriesPattern}`);
}

function unlockSeries(seriesPattern) {
  const files = fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith(`genius-${seriesPattern}`) && f.endsWith('.json'));
  let success = 0;
  let total = 0;
  
  files.forEach(file => {
    const episodeId = file.replace('genius-', '').replace('.json', '');
    total++;
    if (unlockEpisode(episodeId)) {
      success++;
    }
  });
  
  console.log(`🔓 Unlocked ${success}/${total} episodes in series ${seriesPattern}`);
}

// Main script logic
const [,, command, target] = process.argv;

if (!command) {
  console.log(`
Episode Lock Management Utility

Usage:
  node scripts/manage-episode-locks.js <command> [target]

Commands:
  lock <episodes>       Lock specific episodes (comma-separated: 1-1-1,1-1-2)
  unlock <episodes>     Unlock specific episodes
  lock-series <series>  Lock all episodes in series (e.g., 1-1)
  unlock-series <series> Unlock all episodes in series
  status <episode>      Show lock status for episode
  list-locked          List all locked episodes

Examples:
  node scripts/manage-episode-locks.js lock 1-1-1,1-1-2,1-1-3
  node scripts/manage-episode-locks.js unlock 1-1-3
  node scripts/manage-episode-locks.js lock-series 1-1
  node scripts/manage-episode-locks.js status 1-1-1
  `);
  process.exit(1);
}

switch (command) {
  case 'lock':
    if (!target) {
      console.error('❌ Please specify episodes to lock (e.g., 1-1-1,1-1-2)');
      process.exit(1);
    }
    target.split(',').forEach(episodeId => lockEpisode(episodeId.trim(), 'user'));
    break;
    
  case 'unlock':
    if (!target) {
      console.error('❌ Please specify episodes to unlock (e.g., 1-1-1,1-1-2)');
      process.exit(1);
    }
    target.split(',').forEach(episodeId => unlockEpisode(episodeId.trim()));
    break;
    
  case 'lock-series':
    if (!target) {
      console.error('❌ Please specify series to lock (e.g., 1-1)');
      process.exit(1);
    }
    lockSeries(target);
    break;
    
  case 'unlock-series':
    if (!target) {
      console.error('❌ Please specify series to unlock (e.g., 1-1)');
      process.exit(1);
    }
    unlockSeries(target);
    break;
    
  case 'status':
    if (!target) {
      console.error('❌ Please specify episode to check (e.g., 1-1-1)');
      process.exit(1);
    }
    const status = getEpisodeStatus(target);
    if (!status.exists) {
      console.log(`❌ Episode ${target} not found`);
    } else if (status.error) {
      console.log(`❌ Error reading episode ${target}: ${status.error}`);
    } else {
      console.log(`
📊 Episode ${target} Status:
   Title: ${status.title}
   Subtitle: ${status.subtitle}
   Locked: ${status.locked ? '🔒 YES' : '🔓 NO'}
   ${status.locked ? `Locked At: ${status.lockedAt}` : ''}
   ${status.locked ? `Locked By: ${status.lockedBy}` : ''}
      `);
    }
    break;
    
  case 'list-locked':
    const lockedEpisodes = listAllLocked();
    if (lockedEpisodes.length === 0) {
      console.log('🔓 No episodes are currently locked');
    } else {
      console.log(`🔒 ${lockedEpisodes.length} locked episodes:\n`);
      lockedEpisodes.forEach(ep => {
        console.log(`   ${ep.episodeId}: "${ep.title}" (locked by ${ep.lockedBy} at ${ep.lockedAt})`);
      });
    }
    break;
    
  default:
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
}