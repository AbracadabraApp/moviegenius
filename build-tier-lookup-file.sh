#!/bin/bash

cat > /Users/josh.petersen/moviegenius/ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift <<'HEADER'
//
//  TierTmdbLookup.swift
//  moviegenius
//
//  Generated from database query
//  See: generate-all-tier-ids.cjs for regeneration script
//

import Foundation

extension CategoryEssentials {
    // Complete TMDB ID lookup for all genre tier films (1,434 films)
    // Key format: "Category|Subcategory|Title|Year"
HEADER

cat /Users/josh.petersen/moviegenius/tier-tmdb-lookup.swift | sed 's/^static let tmdbIdLookup/    static let tierTmdbData/' >> /Users/josh.petersen/moviegenius/ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift

echo "}" >> /Users/josh.petersen/moviegenius/ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift
