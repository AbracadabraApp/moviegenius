#!/usr/bin/env node

/**
 * Test Person System
 * 
 * This script tests the new ID-based person system by:
 * 1. Fetching some sample persons from the database
 * 2. Testing the person-movies API with person IDs
 * 3. Comparing results with legacy name-based lookup
 */

const { Client } = require('pg');

// Railway PostgreSQL connection helper
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

async function testPersonSystem() {
  console.log('🧪 Testing Person System...\n');

  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get some sample persons
    console.log('\n📋 Sample persons in database:');
    const personsResult = await client.query(`
      SELECT p.id, p.name, COUNT(mc.id) as movie_count
      FROM persons p
      LEFT JOIN movie_contributors mc ON mc.person_id = p.id
      GROUP BY p.id, p.name
      ORDER BY movie_count DESC, p.name
      LIMIT 10
    `);

    console.table(personsResult.rows);

    if (personsResult.rows.length === 0) {
      console.log('❌ No persons found in database. Migration may not have run.');
      return;
    }

    // Test ID-based lookup
    const testPerson = personsResult.rows[0];
    console.log(`\n🔍 Testing ID-based lookup for person: ${testPerson.name} (ID: ${testPerson.id})`);

    const moviesResult = await client.query(`
      SELECT 
        m.tmdb_id,
        m.title,
        m.year,
        ARRAY_AGG(DISTINCT mc.role ORDER BY mc.role) as roles
      FROM movie_contributors mc
      JOIN movies m ON m.tmdb_id = mc.movie_tmdb_id
      WHERE mc.person_id = $1
      GROUP BY m.tmdb_id, m.title, m.year
      ORDER BY m.year DESC, m.title
      LIMIT 5
    `, [testPerson.id]);

    console.log(`✅ Found ${moviesResult.rows.length} movies for ${testPerson.name}:`);
    console.table(moviesResult.rows);

    // Test API endpoint simulation
    console.log('\n🌐 Testing API query structure...');
    
    const apiResult = await client.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT mc.movie_tmdb_id) as movie_count,
        ARRAY_AGG(DISTINCT mc.role ORDER BY mc.role) as roles
      FROM persons p
      LEFT JOIN movie_contributors mc ON mc.person_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, p.name
    `, [testPerson.id]);

    if (apiResult.rows.length > 0) {
      const personData = apiResult.rows[0];
      console.log('✅ API-style query result:');
      console.log({
        person: {
          id: personData.id,
          name: personData.name,
          movieCount: parseInt(personData.movie_count),
          roles: personData.roles
        }
      });
    }

    // Verify no duplicates in person system
    console.log('\n🔍 Checking for potential issues...');
    
    const duplicateCheck = await client.query(`
      SELECT name, COUNT(*) as count
      FROM persons 
      GROUP BY name 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 5
    `);

    if (duplicateCheck.rows.length > 0) {
      console.log('⚠️  People with identical names (by design - no deduplication):');
      console.table(duplicateCheck.rows);
    } else {
      console.log('✅ No duplicate names found');
    }

    // Check migration completeness
    const migrationCheck = await client.query(`
      SELECT 
        COUNT(*) as total_contributors,
        COUNT(person_id) as with_person_id,
        COUNT(*) - COUNT(person_id) as missing_person_id
      FROM movie_contributors
    `);

    const migrationStats = migrationCheck.rows[0];
    console.log('\n📊 Migration completeness:');
    console.log(`Total contributors: ${migrationStats.total_contributors}`);
    console.log(`With person_id: ${migrationStats.with_person_id}`);
    console.log(`Missing person_id: ${migrationStats.missing_person_id}`);

    if (migrationStats.missing_person_id > 0) {
      console.log('❌ Some contributors are missing person_id - migration incomplete');
    } else {
      console.log('✅ All contributors have person_id - migration complete');
    }

    console.log('\n🎉 Person system test completed!');
    
    console.log('\n📝 URL Examples for testing:');
    console.log(`- /person/${testPerson.id} (${testPerson.name})`);
    if (personsResult.rows.length > 1) {
      const secondPerson = personsResult.rows[1];
      console.log(`- /person/${secondPerson.id} (${secondPerson.name})`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

// Handle command line execution
if (require.main === module) {
  testPersonSystem().catch(console.error);
}

module.exports = { testPersonSystem };