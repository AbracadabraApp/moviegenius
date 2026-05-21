#!/usr/bin/env python3
"""
Generate complete iOS persons JSON with CORRECT film selections.
Excludes documentaries, compilations, and TV specials.
"""

import json
import os
import time
import requests
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '82e53d2dd47988e591a149b9820a0d9c')

OUTPUT_DIR = Path("ios/moviegenius/moviegenius/Resources")
DATA_DIR = Path("data")

# Documentary and compilation keywords to exclude
EXCLUDE_KEYWORDS = [
    'documentary', 'making of', 'behind the scenes', 'confidential',
    'in conversation', 'celebration', 'anniversary', 'tribute',
    'final cut', 'special edition', 'compilation', 'that\'s entertainment',
    'in her own words', 'in his own words', 'journey', 'story of',
    'portrait', 'remembering', 'legacy', 'retrospective', 'biography',
    'la classe', 'one night only', 'best of', 'greatest', 'collection',
    'the filth and the fury', 'listen to me', 'tab hunter', 'spielberg',
    'electric boogaloo', 'waking sleeping beauty', 'chasing trane',
    'the sparks brothers', 'thriller 40', 'woody allen: a', 'super/man'
]

def load_persons_with_ids() -> Dict:
    """Load the persons list with TMDB IDs."""
    with open("persons-list-with-ids.json", 'r') as f:
        return json.load(f)

def is_documentary_or_compilation(title: str) -> bool:
    """Check if a film title suggests it's a documentary or compilation."""
    title_lower = title.lower()
    return any(keyword in title_lower for keyword in EXCLUDE_KEYWORDS)

def get_person_credits(person_id: int, person_type: str) -> List[Dict]:
    """Get movie credits for a person from TMDB, excluding documentaries."""
    url = f"https://api.themoviedb.org/3/person/{person_id}/movie_credits"
    params = {'api_key': TMDB_API_KEY}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        credits = []

        if person_type == 'directors':
            # For directors, get their directing credits
            for film in data.get('crew', []):
                if film.get('job') == 'Director':
                    # Skip documentaries and compilations
                    if is_documentary_or_compilation(film.get('title', '')):
                        continue

                    credits.append({
                        'tmdb_id': film.get('id'),
                        'title': film.get('title'),
                        'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                        'vote_average': film.get('vote_average', 0),
                        'vote_count': film.get('vote_count', 0),
                        'popularity': film.get('popularity', 0)
                    })
        else:
            # For actors/actresses, get their cast credits
            for film in data.get('cast', []):
                # Skip documentaries and compilations
                if is_documentary_or_compilation(film.get('title', '')):
                    continue

                # Skip if they're playing themselves or it's an archive footage credit
                character = (film.get('character', '') or '').lower()
                if 'himself' in character or 'herself' in character or 'archive' in character or 'self' in character:
                    continue

                credits.append({
                    'tmdb_id': film.get('id'),
                    'title': film.get('title'),
                    'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                    'vote_average': film.get('vote_average', 0),
                    'vote_count': film.get('vote_count', 0),
                    'popularity': film.get('popularity', 0),
                    'character': film.get('character'),
                    'order': film.get('order', 999)
                })

        return credits
    except Exception as e:
        print(f"    Error getting credits for person {person_id}: {e}")
        return []

def create_person_tier(person: Dict, person_type: str, filmography: List[Dict], order: int) -> Dict:
    """Create a tier entry for a person with their top NARRATIVE films."""

    # Filter for quality narrative films
    valid_films = [
        f for f in filmography
        if (f.get('year') and
            f.get('year') <= 2024 and  # No future films
            f.get('vote_average', 0) >= 6.0 and  # Higher quality threshold
            f.get('vote_count', 0) >= 100)  # More votes required
    ]

    # If we don't have enough good films, be slightly less strict
    if len(valid_films) < 5:
        valid_films = [
            f for f in filmography
            if (f.get('year') and
                f.get('year') <= 2024 and
                f.get('vote_average', 0) >= 5.5 and
                f.get('vote_count', 0) >= 50)
        ]

    # For actors/actresses, prioritize leading roles (lower order number)
    if person_type in ['actors', 'actresses']:
        # Sort by combination of billing order, rating, and popularity
        sorted_films = sorted(
            valid_films,
            key=lambda x: (
                -x.get('vote_average', 0),  # Higher rating first
                -x.get('vote_count', 0) / 1000,  # More votes
                x.get('order', 999),  # Better billing
                -x.get('popularity', 0) / 100  # Popularity as tiebreaker
            )
        )
    else:
        # For directors, sort by rating and popularity
        sorted_films = sorted(
            valid_films,
            key=lambda x: (
                x.get('vote_average', 0) * 0.7 +
                min(x.get('vote_count', 0) / 10000, 10) * 0.3
            ),
            reverse=True
        )

    # Take top films
    top_films = sorted_films[:12]

    # Sort chronologically for display (newest first for modern relevance)
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
    """Main function to generate iOS persons JSON with correct films."""

    print("=" * 60)
    print("GENERATING iOS PERSONS JSON (CORRECTED)")
    print("=" * 60)
    print("Excluding documentaries, compilations, and TV specials")
    print()

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

            # Filter out documentaries
            narrative_films = [f for f in filmography if not is_documentary_or_compilation(f.get('title', ''))]

            print(f"  ✓ Found {len(filmography)} total films, {len(narrative_films)} narrative films")

            # Create tier
            tier = create_person_tier(person, person_type, narrative_films, len(tiers))

            if not tier['films']:
                print(f"  ⚠️  No quality narrative films found")
                stats['no_quality'] += 1
                continue

            tiers.append(tier)
            stats[person_type] += 1

            # Show sample films (should be real movies now)
            print(f"  ✓ Selected {len(tier['films'])} top narrative films:")
            for film in tier['films'][:3]:
                print(f"    • {film['title']} ({film['year']})")

            # Rate limiting
            time.sleep(0.3)

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
    print(f"⚠️  No quality narrative films: {stats['no_quality']}")

    total_persons = sum(len(c['tiers']) for c in result['categories'])
    total_films = sum(len(t['films']) for c in result['categories'] for t in c['tiers'])
    print(f"\n📊 Total persons in output: {total_persons}/91")
    print(f"📊 Total narrative films selected: {total_films}")

    # Save the result
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "genius_persons.json"

    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    file_size = output_file.stat().st_size / 1024
    print(f"\n✅ Saved to: {output_file}")
    print(f"📦 File size: {file_size:.1f} KB")

    # Also save a backup
    backup_file = DATA_DIR / "genius_persons_corrected.json"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(backup_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"📋 Backup saved to: {backup_file}")

    # Show sample of final output (should show real movies)
    if result['categories']:
        print(f"\n=== SAMPLE OUTPUT ===")
        first_cat = result['categories'][0]
        print(f"Category: {first_cat['category']}")
        if first_cat['tiers']:
            first_person = first_cat['tiers'][0]
            print(f"First person: {first_person['name']}")
            print(f"Films: {len(first_person['films'])}")
            print("These should be REAL narrative films:")
            for film in first_person['films']:
                print(f"  • {film['title']} ({film['year']}) - ID: {film['tmdbId']}")

if __name__ == "__main__":
    main()