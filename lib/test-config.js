/**
 * Test Configuration - Diverse Movie IDs for Testing
 * 
 * Instead of hardcoding specific TMDB IDs like Oliver Twist (257),
 * use this diverse set for reliable testing across different scenarios.
 */

// Nuclear test movie IDs - diverse set covering different genres, years, and popularity levels
export const DIVERSE_TEST_IDS = [
  901,    // The Matrix Reloaded
  770,    // Space Jam  
  72976,  // Logan
  11314,  // The Dark Knight Rises
  44865,  // Mad Max: Fury Road
  44012,  // The Hobbit: An Unexpected Journey
  631,    // Life Is Beautiful
  897661, // Dune (2021)
  389,    // 12 Monkeys
  76203   // 12 Years a Slave
];

// Get a random test ID for dynamic testing
export function getRandomTestId() {
  return DIVERSE_TEST_IDS[Math.floor(Math.random() * DIVERSE_TEST_IDS.length)];
}

// Get the first test ID for consistent debugging
export function getConsistentTestId() {
  return DIVERSE_TEST_IDS[0]; // The Matrix Reloaded
}

// Popular movies that are likely to exist in most databases
export const POPULAR_TEST_IDS = [901, 11314, 44865, 897661];

// Classic films for legacy testing
export const CLASSIC_TEST_IDS = [631, 389];

// Recent films for modern feature testing  
export const RECENT_TEST_IDS = [72976, 897661, 76203];