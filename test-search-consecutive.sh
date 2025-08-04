#!/bin/bash

# test-search-consecutive.sh - Test consecutive search functionality

API_BASE="http://localhost:3000"

echo "🧪 Testing Consecutive Multi-Search Requests"
echo "============================================="

# Test 1: First search
echo ""
echo "--- Test 1: First search (matrix) ---"
curl -s -X POST "$API_BASE/api/multi-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "matrix"}' | \
  jq -r '"Movies: " + (.movies | length | tostring) + ", Query: " + .query + ", Has results: " + (.hasResults | tostring)'

sleep 1

# Test 2: Second search immediately 
echo ""
echo "--- Test 2: Second search (inception) ---"
curl -s -X POST "$API_BASE/api/multi-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "inception"}' | \
  jq -r '"Movies: " + (.movies | length | tostring) + ", Query: " + .query + ", Has results: " + (.hasResults | tostring)'

sleep 1

# Test 3: Third search (zero results)
echo ""
echo "--- Test 3: Third search (zero results) ---"
curl -s -X POST "$API_BASE/api/multi-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "zxcvbnmasdfgh"}' | \
  jq -r '"Movies: " + (.movies | length | tostring) + ", Query: " + .query + ", Fallback: " + (.fallback.message // "none")'

sleep 1

# Test 4: Fourth search (baby)
echo ""
echo "--- Test 4: Fourth search (baby) ---"
curl -s -X POST "$API_BASE/api/multi-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "baby"}' | \
  jq -r '"Movies: " + (.movies | length | tostring) + ", Query: " + .query + ", Has results: " + (.hasResults | tostring)'

sleep 1

# Test 5: Rapid consecutive searches
echo ""
echo "--- Test 5: Rapid consecutive searches ---"
echo "Firing 3 searches rapidly..."

curl -s -X POST "$API_BASE/api/multi-search" -H "Content-Type: application/json" -d '{"query": "avengers"}' &
curl -s -X POST "$API_BASE/api/multi-search" -H "Content-Type: application/json" -d '{"query": "batman"}' &
curl -s -X POST "$API_BASE/api/multi-search" -H "Content-Type: application/json" -d '{"query": "superman"}' &

wait

echo ""
echo "🏁 Tests completed"