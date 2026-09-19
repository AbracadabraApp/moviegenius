#!/usr/bin/env python3
"""
Generate complete iOS persons JSON using existing TMDB IDs.

This uses the persons-list-with-ids.json file that already has all TMDB IDs,
fetches filmographies from TMDB API, and generates the iOS-compatible JSON.
"""

import json
import os
import time
import requests
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
if not TMDB_API_KEY:
    print("ERROR: Set TMDB_API_KEY environment variable")
    print("Run: export TMDB_API_KEY='your_api_key_here'")
    exit(1)

OUTPUT_DIR = Path("ios/moviegenius/moviegenius/Resources")
DATA_DIR = Path("data")

def load_persons_with_ids() -> Dict:
    """Load the persons list with TMDB IDs."""
    with open("persons-list-with-ids.json", 'r') as f:
        return json.load(f)

def get_person_credits(person_id: int, person_type: str) -> List[Dict]:
    """Get movie credits for a person from TMDB."""
    url = f"https://api.themoviedb.org/3/person/{person_id}/movie_credits"
    params = {'api_key': TMDB_API_KEY}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        # Get cast or crew credits based on person type
        if person_type == 'directors':
            # For directors, get their directing credits
            credits = []
            for film in data.get('crew', []):
                if film.get('job') == 'Director':
                    credits.append({
                        'tmdb_id': film.get('id'),
                        'title': film.get('title'),
                        'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                        'vote_average': film.get('vote_average', 0),
                        'vote_count': film.get('vote_count', 0),
                        'popularity': film.get('popularity', 0),
                        'poster_path': film.get('poster_path')
                    })
        else:
            # For actors/actresses, get their cast credits
            credits = []
            for film in data.get('cast', []):
                credits.append({
                    'tmdb_id': film.get('id'),
                    'title': film.get('title'),
                    'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                    'vote_average': film.get('vote_average', 0),
                    'vote_count': film.get('vote_count', 0),
                    'popularity': film.get('popularity', 0),
                    'poster_path': film.get('poster_path'),
                    'character': film.get('character')
                })

        return credits
    except Exception as e:
        print(f"    Error getting credits for person {person_id}: {e}")
        return []

def create_person_tier(person: Dict, person_type: str, filmography: List[Dict], order: int) -> Dict:
    """Create a tier entry for a person with their top films."""

    # Filter out films with no year or very low ratings/vote counts
    valid_films = [
        f for f in filmography
        if f.get('year') and f.get('vote_average', 0) >= 5.0 and f.get('vote_count', 0) >= 50
    ]

    # If we don't have enough good films, be less strict
    if len(valid_films) < 10:
        valid_films = [
            f for f in filmography
            if f.get('year') and f.get('vote_average', 0) > 0
        ]

    # Sort by combination of rating and popularity
    sorted_films = sorted(
        valid_films,
        key=lambda x: (
            x.get('vote_average', 0) * 0.8 +
            min(x.get('popularity', 0)/100, 10) * 0.2
        ),
        reverse=True
    )

    # Take top films, then sort by year for display
    top_films = sorted_films[:15]
    top_films.sort(key=lambda x: x.get('year', 0), reverse=True)

    # Create film entries (limit to 10)
    films = []
    for film in top_films[:10]:
        films.append({
            "title": film.get('title', ''),
            "year": film.get('year'),
            "tmdbId": film.get('tmdb_id')
        })

    subtitle = {
        'actors': "Essential performances",
        'actresses': "Essential performances",
        'directors': "Essential films"
    }.get(person_type, "Key works")

    return {
        "name": person['name'],
        "subtitle": subtitle,
        "personTmdbId": person['tmdbId'],
        "films": films,
        "order": order
    }

def main():
    """Main function to generate iOS persons JSON."""

    print("=" * 60)
    print("GENERATING iOS PERSONS JSON")
    print("=" * 60)

    # Load persons with IDs
    persons_data = load_persons_with_ids()

    result = {
        "schemaVersion": 1,
        "categories": []
    }

    # Statistics
    stats = defaultdict(int)

    # Process each category
    for person_type in ['actors', 'actresses', 'directors']:
        print(f"\n📁 Processing {person_type.upper()}...")
        print("-" * 40)

        tiers = []
        persons = persons_data[person_type]

        for i, person in enumerate(persons):
            name = person['name']
            tmdb_id = person['tmdbId']

            print(f"\n[{i+1}/{len(persons)}] {name} (ID: {tmdb_id})")

            # Get filmography
            filmography = get_person_credits(tmdb_id, person_type)

            if not filmography:
                print(f"  ⚠️  No filmography found")
                stats['no_films'] += 1
                continue

            print(f"  ✓ Found {len(filmography)} total films")

            # Create tier
            tier = create_person_tier(person, person_type, filmography, len(tiers))

            if not tier['films']:
                print(f"  ⚠️  No quality films found")
                stats['no_quality'] += 1
                continue

            tiers.append(tier)
            stats[person_type] += 1

            # Show sample films
            print(f"  ✓ Selected {len(tier['films'])} top films:")
            for film in tier['films'][:3]:
                print(f"    • {film['title']} ({film['year']})")

            # Rate limiting
            time.sleep(0.3)  # Be nice to TMDB API

        # Add category if we have data
        if tiers:
            category_name = {
                'actors': "Great Actors",
                'actresses': "Great Actresses",
                'directors': "Master Directors"
            }[person_type]

            result['categories'].append({
                "category": category_name,
                "tiers": tiers
            })

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Actors processed: {stats['actors']}/30")
    print(f"✅ Actresses processed: {stats['actresses']}/30")
    print(f"✅ Directors processed: {stats['directors']}/31")
    print(f"⚠️  No films found: {stats['no_films']}")
    print(f"⚠️  No quality films: {stats['no_quality']}")

    total_persons = sum(len(c['tiers']) for c in result['categories'])
    total_films = sum(len(t['films']) for c in result['categories'] for t in c['tiers'])
    print(f"\n📊 Total persons in output: {total_persons}/91")
    print(f"📊 Total films selected: {total_films}")

    # Save the result
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "genius_persons.json"

    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    file_size = output_file.stat().st_size / 1024
    print(f"\n✅ Saved to: {output_file}")
    print(f"📦 File size: {file_size:.1f} KB")

    # Also save a backup
    backup_file = DATA_DIR / "genius_persons_complete.json"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(backup_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"📋 Backup saved to: {backup_file}")

    # Show sample of final output
    if result['categories']:
        print(f"\n=== SAMPLE OUTPUT ===")
        first_cat = result['categories'][0]
        print(f"Category: {first_cat['category']}")
        if first_cat['tiers']:
            first_person = first_cat['tiers'][0]
            print(f"First person: {first_person['name']}")
            print(f"Films: {len(first_person['films'])}")
            for film in first_person['films'][:3]:
                print(f"  • {film['title']} ({film['year']}) - ID: {film['tmdbId']}")

if __name__ == "__main__":
    main()