#!/usr/bin/env node

/**
 * Simple interface for managing movie list use/don't use flags
 * Allows for basic deduplication without complex processing
 */

import { getPool } from '../lib/railway-db.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pool = getPool();

async function showListsOverview() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_lists,
      COUNT(*) FILTER (WHERE use_flag = true) as active_lists,
      COUNT(*) FILTER (WHERE use_flag = false) as disabled_lists,
      AVG(movie_count) FILTER (WHERE use_flag = true) as avg_active_size
    FROM movie_lists
  `);
  
  const stats = result.rows[0];
  console.log('\n📊 Lists Overview:');
  console.log(`  Total lists: ${stats.total_lists}`);
  console.log(`  Active (use): ${stats.active_lists}`);
  console.log(`  Disabled (don't use): ${stats.disabled_lists}`);
  console.log(`  Average active list size: ${Math.round(stats.avg_active_size || 0)} movies`);
  console.log('');
}

async function showLargestLists() {
  const result = await pool.query(`
    SELECT id, name, movie_count, use_flag, created_at
    FROM movie_lists 
    ORDER BY movie_count DESC 
    LIMIT 20
  `);
  
  console.log('🎬 Largest Lists (potential duplicates):');
  result.rows.forEach((row, index) => {
    const status = row.use_flag ? '✅' : '❌';
    const date = row.created_at ? row.created_at.toDateString() : 'unknown';
    console.log(`${index + 1}. ${status} "${row.name}" (${row.movie_count} movies) - ID:${row.id} - ${date}`);
  });
  console.log('');
}

async function showSimilarLists(searchTerm) {
  const result = await pool.query(`
    SELECT id, name, movie_count, use_flag
    FROM movie_lists 
    WHERE LOWER(name) LIKE LOWER($1)
    ORDER BY movie_count DESC
  `, [`%${searchTerm}%`]);
  
  if (result.rows.length === 0) {
    console.log(`No lists found matching "${searchTerm}"`);
    return;
  }
  
  console.log(`🔍 Lists matching "${searchTerm}":`);
  result.rows.forEach((row, index) => {
    const status = row.use_flag ? '✅' : '❌';
    console.log(`${index + 1}. ${status} "${row.name}" (${row.movie_count} movies) - ID:${row.id}`);
  });
  console.log('');
}

async function toggleListFlag(listId, newFlag) {
  const result = await pool.query(`
    UPDATE movie_lists 
    SET use_flag = $1 
    WHERE id = $2 
    RETURNING name, movie_count, use_flag
  `, [newFlag, listId]);
  
  if (result.rows.length === 0) {
    console.log(`❌ No list found with ID: ${listId}`);
    return;
  }
  
  const list = result.rows[0];
  const action = newFlag ? 'ENABLED' : 'DISABLED';
  console.log(`✅ ${action}: "${list.name}" (${list.movie_count} movies)`);
}

async function findDuplicatesBySize() {
  const result = await pool.query(`
    SELECT movie_count, COUNT(*) as list_count, 
           string_agg(name, ' | ' ORDER BY name) as list_names
    FROM movie_lists 
    WHERE use_flag = true
    GROUP BY movie_count 
    HAVING COUNT(*) > 1 
    ORDER BY movie_count DESC 
    LIMIT 10
  `);
  
  if (result.rows.length === 0) {
    console.log('🎉 No obvious duplicates found by movie count');
    return;
  }
  
  console.log('🔍 Potential duplicates (same movie count):');
  result.rows.forEach(row => {
    console.log(`${row.movie_count} movies (${row.list_count} lists):`);
    console.log(`  ${row.list_names}`);
    console.log('');
  });
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function interactiveMode() {
  console.log('🎭 Movie Lists Flag Management');
  console.log('Simple deduplication using use/don\'t use flags\n');
  
  await showListsOverview();
  
  while (true) {
    console.log('Commands:');
    console.log('  1. Show largest lists (potential duplicates)');
    console.log('  2. Search lists by name');
    console.log('  3. Enable a list (set use_flag = true)');
    console.log('  4. Disable a list (set use_flag = false)');
    console.log('  5. Find duplicates by movie count');
    console.log('  6. Show overview');
    console.log('  0. Exit');
    console.log('');
    
    const command = await askQuestion('Enter command (0-6): ');
    
    switch (command) {
      case '1':
        await showLargestLists();
        break;
        
      case '2':
        const searchTerm = await askQuestion('Search term: ');
        await showSimilarLists(searchTerm);
        break;
        
      case '3':
        const enableId = await askQuestion('List ID to enable: ');
        await toggleListFlag(parseInt(enableId), true);
        break;
        
      case '4':
        const disableId = await askQuestion('List ID to disable: ');
        await toggleListFlag(parseInt(disableId), false);
        break;
        
      case '5':
        await findDuplicatesBySize();
        break;
        
      case '6':
        await showListsOverview();
        break;
        
      case '0':
        console.log('👋 Goodbye!');
        rl.close();
        await pool.end();
        process.exit(0);
        break;
        
      default:
        console.log('❌ Invalid command');
    }
    
    console.log('');
  }
}

// CLI mode for batch operations
async function batchMode(args) {
  const command = args[0];
  
  switch (command) {
    case 'overview':
      await showListsOverview();
      break;
      
    case 'largest':
      await showLargestLists();
      break;
      
    case 'search':
      if (!args[1]) {
        console.log('❌ Search term required');
        process.exit(1);
      }
      await showSimilarLists(args[1]);
      break;
      
    case 'enable':
      if (!args[1]) {
        console.log('❌ List ID required');
        process.exit(1);
      }
      await toggleListFlag(parseInt(args[1]), true);
      break;
      
    case 'disable':
      if (!args[1]) {
        console.log('❌ List ID required');
        process.exit(1);
      }
      await toggleListFlag(parseInt(args[1]), false);
      break;
      
    case 'duplicates':
      await findDuplicatesBySize();
      break;
      
    default:
      console.log(`
Movie Lists Flag Management

Usage: 
  node manage-list-flags.js                    # Interactive mode
  node manage-list-flags.js <command> [args]   # Batch mode

Commands:
  overview                 Show lists statistics
  largest                  Show 20 largest lists
  search <term>           Search lists by name
  enable <id>             Enable a list (use_flag = true)
  disable <id>            Disable a list (use_flag = false)
  duplicates              Find potential duplicates by movie count

Examples:
  node manage-list-flags.js overview
  node manage-list-flags.js search "comedy"  
  node manage-list-flags.js disable 123
      `);
      process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

try {
  if (args.length === 0) {
    await interactiveMode();
  } else {
    await batchMode(args);
    await pool.end();
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  await pool.end();
  process.exit(1);
}